param([string]$PipeName)

$script:ErrorActionPreference = 'Stop'
[Console]::InputEncoding  = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding            = New-Object System.Text.UTF8Encoding($false)

# ------------------------------------------------------------------
# Загрузка C# из отдельного файла native/OmniWin32.cs
# ------------------------------------------------------------------

$nativeSourcePath = Join-Path $PSScriptRoot 'native\OmniWin32.cs'
if (-not (Test-Path -LiteralPath $nativeSourcePath)) {
    throw "OmniWin32.cs not found at $nativeSourcePath"
}
$nativeSource = [System.IO.File]::ReadAllText($nativeSourcePath)
[void](Add-Type -TypeDefinition $nativeSource -Language CSharp)
[OmniWin32]::EnablePerMonitorDpiAwareness()

# ------------------------------------------------------------------
# Pipe / stdin-stdout канал
# ------------------------------------------------------------------

if ($PipeName) {
    $pipe = New-Object System.IO.Pipes.NamedPipeClientStream(
        '.', $PipeName, [System.IO.Pipes.PipeDirection]::InOut
    )
    $pipe.Connect(30000)
    $reader = New-Object System.IO.StreamReader($pipe)
    $writer = New-Object System.IO.StreamWriter($pipe)
    $writer.AutoFlush = $true
} else {
    $reader = [Console]::In
    $writer = [Console]::Out
}

# ------------------------------------------------------------------
# Shell Launcher (WESL) helpers
# ------------------------------------------------------------------

function Get-ShellLauncherStatus {
    $os = Get-CimInstance -ClassName Win32_OperatingSystem
    $editionId = (Get-ItemProperty `
        -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' `
        -Name EditionID -ErrorAction Stop).EditionID
    $supported = $editionId -match '^(Enterprise|Education|IoTEnterprise)'
    $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    if (-not $supported) {
        return @{
            supported = $false
            edition = $os.Caption
            editionId = $editionId
            available = $false
            enabled = $false
            sid = $sid
        }
    }

    try {
        Get-CimClass -Namespace 'root\standardcimv2\embedded' `
            -ClassName 'WESL_UserSetting' -ErrorAction Stop | Out-Null
        $class = [wmiclass]'\\.\root\standardcimv2\embedded:WESL_UserSetting'
        $enabledResult = $class.IsEnabled()
        $enabled = [bool]$enabledResult.Enabled
        $custom = $class.GetCustomShell($sid)
        $hasCustom = ($custom.ReturnValue -eq 0)
        $default = $class.GetDefaultShell()
        return @{
            supported = $supported
            edition = $os.Caption
            editionId = $editionId
            available = $true
            enabled = $enabled
            sid = $sid
            hasCustomShell = $hasCustom
            shell = if ($hasCustom) { $custom.Shell } else { $null }
            defaultAction = if ($hasCustom) { $custom.DefaultAction } else { $null }
            customReturnCodes = if ($hasCustom) { @($custom.CustomReturnCodes) } else { @() }
            customReturnCodesAction = if ($hasCustom) { @($custom.CustomReturnCodesAction) } else { @() }
            defaultShell = $default.Shell
        }
    } catch {
        $detail = $_.Exception.Message
        $errorCode = 'shell_launcher_status_failed'
        if ($detail -match '(?i)not found|invalid class|class .* not registered|0x80041010' `
            -or $_.FullyQualifiedErrorId -match '0x80041002|0x80041010') {
            $errorCode = 'shell_launcher_feature_disabled'
            $detail = 'WESL_UserSetting is not available in root\standardcimv2\embedded.'
        }
        return @{
            supported = $supported
            edition = $os.Caption
            editionId = $editionId
            available = $false
            enabled = $false
            sid = $sid
            error = $errorCode
            detail = $detail
        }
    }
}

function Invoke-ShellLauncherAction($request) {
    if (-not [System.Security.Principal.WindowsPrincipal]::new(
        [System.Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'administrator_required'
    }
    $status = Get-ShellLauncherStatus
    if (-not $status.supported) { throw 'shell_launcher_unsupported_edition' }
    if (-not $status.available) { throw 'shell_launcher_feature_disabled' }
    $class = [wmiclass]'\\.\root\standardcimv2\embedded:WESL_UserSetting'
    if ($request.action -eq 'set-shell') {
        if (-not $status.enabled) {
            $enableResult = $class.SetEnabled($true)
            if ($enableResult.ReturnValue -ne 0) {
                throw "Shell Launcher enable returned error $($enableResult.ReturnValue)"
            }
            $status = Get-ShellLauncherStatus
            if (-not $status.enabled) { throw 'shell_launcher_enable_failed' }
        }
        $result = $class.SetCustomShell([string]$status.sid, [string]$request.shell, $null, $null, 0)
    } elseif ($request.action -eq 'restore-shell') {
        $backup = $request.backup
        if ($backup.hasCustomShell) {
            $codes   = if ($backup.customReturnCodes.Count) { [int[]]$backup.customReturnCodes } else { $null }
            $actions = if ($backup.customReturnCodesAction.Count) { [int[]]$backup.customReturnCodesAction } else { $null }
            $result = $class.SetCustomShell(
                [string]$backup.sid, [string]$backup.shell, $codes, $actions, [int]$backup.defaultAction)
        } else {
            $result = $class.RemoveCustomShell([string]$status.sid)
        }
    } elseif ($request.action -eq 'remove-shell') {
        $result = $class.RemoveCustomShell([string]$status.sid)
    } else {
        throw "Unsupported Shell Launcher action: $($request.action)"
    }
    if ($result.ReturnValue -ne 0) {
        throw "Shell Launcher returned error $($result.ReturnValue)"
    }
    if ($request.action -eq 'restore-shell' -and $request.backup.enabled -eq $false) {
        $disableResult = $class.SetEnabled($false)
        if ($disableResult.ReturnValue -ne 0) {
            throw "Shell Launcher restore returned error $($disableResult.ReturnValue)"
        }
    }
    return Get-ShellLauncherStatus
}

# ------------------------------------------------------------------
# Registry snapshot helpers
# ------------------------------------------------------------------

function Get-UserRegistrySnapshot($hive, $keyPath, $name) {
    $key = $hive.OpenSubKey($keyPath, $false)
    if ($null -eq $key) {
        return @{ exists = $false; value = $null; kind = $null }
    }
    try {
        if ($key.GetValueNames() -notcontains $name) {
            return @{ exists = $false; value = $null; kind = $null }
        }
        $kind = $key.GetValueKind($name)
        if ($kind -notin @(
            [Microsoft.Win32.RegistryValueKind]::String,
            [Microsoft.Win32.RegistryValueKind]::ExpandString
        )) {
            throw "Unsupported registry value kind for $name`: $kind"
        }
        return @{
            exists = $true
            value = [string]$key.GetValue($name, $null,
                [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
            kind = $kind.ToString()
        }
    } finally { $key.Dispose() }
}

function Test-UserRegistrySnapshot($actual, $expected) {
    if ([bool]$actual.exists -ne [bool]$expected.exists) { return $false }
    if (-not $actual.exists) { return $true }
    return ([string]$actual.value -ceq [string]$expected.value) `
        -and ([string]$actual.kind -ceq [string]$expected.kind)
}

function Set-UserRegistrySnapshot($hive, $keyPath, $name, $snapshot) {
    $key = $hive.OpenSubKey($keyPath, $true)
    if (-not $snapshot.exists) {
        if ($null -eq $key) { return }
        try {
            if ($key.GetValueNames() -contains $name) { $key.DeleteValue($name, $false) }
        } finally { $key.Dispose() }
        return
    }
    if ($null -eq $key) { $key = $hive.CreateSubKey($keyPath) }
    if ($null -eq $key) { throw "Could not open registry key $keyPath for writing" }
    try {
        $kind = switch ([string]$snapshot.kind) {
            'String'       { [Microsoft.Win32.RegistryValueKind]::String }
            'ExpandString' { [Microsoft.Win32.RegistryValueKind]::ExpandString }
            default        { throw "Unsupported registry value kind for $name`: $($snapshot.kind)" }
        }
        $key.SetValue($name, [string]$snapshot.value, $kind)
    } finally { $key.Dispose() }
}

# ------------------------------------------------------------------
# Machine shell policy (legacy schemaVersion=3)
# ------------------------------------------------------------------

function Invoke-MachineShellPolicyAction($request) {
    if (-not $PipeName) { throw 'Machine shell policy changes require the elevated helper' }
    $principal = [Security.Principal.WindowsPrincipal]::new(
        [Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Administrator approval is required to change the machine shell policy'
    }

    $machinePolicyPath = 'Software\Microsoft\Windows\CurrentVersion\Policies\System'
    $machineHive = [Microsoft.Win32.Registry]::LocalMachine
    $machineBefore = Get-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell'
    $backupPath = [System.IO.Path]::GetFullPath([string]$request.backupPath)
    $expectedBackupPath = [System.IO.Path]::GetFullPath(
        (Join-Path (Join-Path $env:ProgramData 'The_Omniscience') 'windows-shell-backup.json'))
    if (-not [string]::Equals($backupPath, $expectedBackupPath,
        [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'Invalid shared shell backup path'
    }

    $backupDirectory = [System.IO.Path]::GetDirectoryName($backupPath)
    $previousBackupBytes = $null
    $backupExisted = [System.IO.File]::Exists($backupPath)
    if ($backupExisted) { $previousBackupBytes = [System.IO.File]::ReadAllBytes($backupPath) }
    $backupWritten = $false
    try {
        if ($request.action -eq 'machine-shell-apply') {
            if (-not (Test-UserRegistrySnapshot $machineBefore $request.expectedMachinePolicyShell)) {
                throw 'Machine shell policy changed during approval; no changes were made'
            }
            if ($machineBefore.exists -and $machineBefore.value -cne [string]$request.command) {
                throw 'A different machine shell policy is already configured'
            }
            $backupIsValid = ($request.backup.schemaVersion -eq 3) -and
                ($request.backup.scope -eq 'machine') -and
                ($request.backup.command -ceq [string]$request.command) -and
                (Test-UserRegistrySnapshot $machineBefore $request.backup.machinePolicyShell)
            if (-not $backupIsValid) { throw 'Invalid machine shell backup data' }

            [System.IO.Directory]::CreateDirectory($backupDirectory) | Out-Null
            $backupTemporaryPath = "$backupPath.$PID.tmp"
            $backupJson = ConvertTo-Json -InputObject $request.backup -Compress -Depth 10
            [System.IO.File]::WriteAllText($backupTemporaryPath, $backupJson, [System.Text.UTF8Encoding]::new($false))
            Move-Item -LiteralPath $backupTemporaryPath -Destination $backupPath -Force
            $backupWritten = $true

            $machineKey = $machineHive.CreateSubKey($machinePolicyPath)
            if ($null -eq $machineKey) { throw 'Could not open machine shell policy registry key' }
            try {
                $machineKey.SetValue('Shell', [string]$request.command,
                    [Microsoft.Win32.RegistryValueKind]::String)
            } finally { $machineKey.Dispose() }

            $machineAfter = Get-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell'
            if ($machineAfter.value -cne [string]$request.command) {
                throw 'Machine shell policy update did not verify'
            }
        } elseif ($request.action -eq 'machine-shell-restore') {
            if (-not $machineBefore.exists -or $machineBefore.value -cne [string]$request.expectedCommand) {
                throw 'The machine-wide shell policy changed; refusing to restore over another shell'
            }
            if (-not $backupExisted) { throw 'The shared machine shell backup is missing' }
            $savedBackup = [System.Text.Encoding]::UTF8.GetString($previousBackupBytes) | ConvertFrom-Json
            $backupIsValid = ($savedBackup.schemaVersion -eq 3) -and
                ($savedBackup.scope -eq 'machine') -and
                ($savedBackup.command -ceq [string]$request.expectedCommand) -and
                (Test-UserRegistrySnapshot $savedBackup.machinePolicyShell $request.machinePolicyShell)
            if (-not $backupIsValid) {
                throw 'The shared machine shell backup does not match the requested restore'
            }
            Set-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell' $request.machinePolicyShell
            $restoreVerified = Test-UserRegistrySnapshot `
                (Get-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell') `
                $request.machinePolicyShell
            if (-not $restoreVerified) { throw 'Machine shell policy restoration did not verify' }
        } elseif ($request.action -eq 'machine-shell-update') {
            if (-not $machineBefore.exists -or $machineBefore.value -cne [string]$request.expectedCommand) {
                throw 'The machine shell policy changed; refusing to update another shell'
            }
            if (-not $backupExisted) { throw 'The shared machine shell backup is missing' }
            $savedBackup = [System.Text.Encoding]::UTF8.GetString($previousBackupBytes) | ConvertFrom-Json
            $backupIsValid = ($savedBackup.schemaVersion -eq 3) -and
                ($savedBackup.scope -eq 'machine') -and
                ($savedBackup.command -ceq [string]$request.expectedCommand) -and
                ($savedBackup.machinePolicyShell -ne $null) -and
                (-not [string]::IsNullOrWhiteSpace([string]$request.command))
            if (-not $backupIsValid) {
                throw 'The shared machine shell backup does not match the current shell'
            }
            $savedBackup.command = [string]$request.command
            $backupJson = ConvertTo-Json -InputObject $savedBackup -Compress -Depth 10
            $backupTemporaryPath = "$backupPath.$PID.tmp"
            [System.IO.File]::WriteAllText($backupTemporaryPath, $backupJson, [System.Text.UTF8Encoding]::new($false))
            Move-Item -LiteralPath $backupTemporaryPath -Destination $backupPath -Force
            $backupWritten = $true

            $machineKey = $machineHive.CreateSubKey($machinePolicyPath)
            if ($null -eq $machineKey) { throw 'Could not open machine shell policy registry key' }
            try {
                $machineKey.SetValue('Shell', [string]$request.command,
                    [Microsoft.Win32.RegistryValueKind]::String)
            } finally { $machineKey.Dispose() }
            if ((Get-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell').value -cne [string]$request.command) {
                throw 'Native shell host update did not verify'
            }
        } else {
            throw "Unsupported machine shell policy action: $($request.action)"
        }
        return $true
    } catch {
        $failure = $_
        try {
            Set-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell' $machineBefore
        } catch {
            throw "Shell update failed and machine registry rollback was incomplete: $($failure.Exception.Message); $($_.Exception.Message)"
        }
        if ($backupWritten) {
            try {
                if ($backupExisted) {
                    [System.IO.File]::WriteAllBytes($backupPath, $previousBackupBytes)
                } else {
                    [System.IO.File]::Delete($backupPath)
                }
            } catch {
                throw "Shell update failed and backup rollback was incomplete: $($failure.Exception.Message); $($_.Exception.Message)"
            }
        }
        throw $failure
    }
}

# ------------------------------------------------------------------
# Machine Winlogon shell (schemaVersion=4)
# ------------------------------------------------------------------

function Invoke-MachineWinlogonShellAction($request) {
    if (-not $PipeName) { throw 'Machine Winlogon shell changes require the elevated helper' }
    $principal = [Security.Principal.WindowsPrincipal]::new(
        [Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Administrator approval is required to change the machine Winlogon shell'
    }

    $machinePolicyPath   = 'Software\Microsoft\Windows\CurrentVersion\Policies\System'
    $machineWinlogonPath = 'Software\Microsoft\Windows NT\CurrentVersion\Winlogon'
    $machineHive         = [Microsoft.Win32.Registry]::LocalMachine
    $policyBefore   = Get-UserRegistrySnapshot $machineHive $machinePolicyPath   'Shell'
    $winlogonBefore = Get-UserRegistrySnapshot $machineHive $machineWinlogonPath 'Shell'
    $backupPath = [System.IO.Path]::GetFullPath([string]$request.backupPath)
    $expectedBackupPath = [System.IO.Path]::GetFullPath(
        (Join-Path (Join-Path $env:ProgramData 'The_Omniscience') 'windows-shell-backup.json'))
    if (-not [string]::Equals($backupPath, $expectedBackupPath,
        [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'Invalid shared shell backup path'
    }

    $backupExisted = [System.IO.File]::Exists($backupPath)
    $previousBackupBytes = $null
    if ($backupExisted) { $previousBackupBytes = [System.IO.File]::ReadAllBytes($backupPath) }
    $backupWritten = $false
    try {
        if ($request.action -eq 'machine-winlogon-apply') {
            $expectedStateMatches = (Test-UserRegistrySnapshot $policyBefore $request.expectedMachinePolicyShell) -and
                (Test-UserRegistrySnapshot $winlogonBefore $request.expectedMachineWinlogonShell)
            if (-not $expectedStateMatches) {
                throw 'Machine shell values changed before approval; no changes were made'
            }
            $backupIsValid = ($request.backup.schemaVersion -eq 4) -and
                ($request.backup.scope -eq 'machine') -and
                ($request.backup.command -ceq [string]$request.command) -and
                ($request.backup.machinePolicyShell -ne $null)
            if (-not $backupIsValid) { throw 'Invalid Winlogon shell backup data' }

            if ($null -eq $request.expectedPreviousBackup) {
                if ($backupExisted) { throw 'An unexpected machine shell backup already exists' }
                if (-not (Test-UserRegistrySnapshot $policyBefore $request.backup.machinePolicyShell)) {
                    throw 'Original machine policy snapshot does not match the current registry'
                }
            } else {
                if (-not $backupExisted) { throw 'The expected previous machine shell backup is missing' }
                $savedBackup = [System.Text.Encoding]::UTF8.GetString($previousBackupBytes) | ConvertFrom-Json
                if ($savedBackup.schemaVersion -eq 3) {
                    $legacyBackupMatches = ($savedBackup.scope -eq 'machine') -and
                        ($savedBackup.command -ceq [string]$policyBefore.value) -and
                        ($request.expectedPreviousBackup.command -ceq [string]$savedBackup.command) -and
                        (Test-UserRegistrySnapshot $savedBackup.machinePolicyShell $request.backup.machinePolicyShell) -and
                        (Test-UserRegistrySnapshot $winlogonBefore $request.backup.machineWinlogonShell)
                    if (-not $legacyBackupMatches) {
                        throw 'The existing legacy machine shell backup does not match current registry values'
                    }
                } elseif ($savedBackup.schemaVersion -eq 4) {
                    $winlogonMatchesPrevious = ($winlogonBefore.value -ceq [string]$savedBackup.command) -or
                        (Test-UserRegistrySnapshot $winlogonBefore $savedBackup.machineWinlogonShell)
                    $managedBackupMatches = ($savedBackup.scope -eq 'machine') -and
                        ($request.expectedPreviousBackup.command -ceq [string]$savedBackup.command) -and
                        (Test-UserRegistrySnapshot $policyBefore $savedBackup.machinePolicyShell) -and
                        (Test-UserRegistrySnapshot $request.backup.machinePolicyShell   $savedBackup.machinePolicyShell) -and
                        (Test-UserRegistrySnapshot $request.backup.machineWinlogonShell $savedBackup.machineWinlogonShell) -and
                        $winlogonMatchesPrevious
                    if (-not $managedBackupMatches) {
                        throw 'The existing Winlogon backup does not match current registry values'
                    }
                } else {
                    throw 'The existing machine shell backup has an unsupported format'
                }
            }

            [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($backupPath)) | Out-Null
            $backupTemporaryPath = "$backupPath.$PID.tmp"
            $backupJson = ConvertTo-Json -InputObject $request.backup -Compress -Depth 10
            [System.IO.File]::WriteAllText($backupTemporaryPath, $backupJson, [System.Text.UTF8Encoding]::new($false))
            Move-Item -LiteralPath $backupTemporaryPath -Destination $backupPath -Force
            $backupWritten = $true

            Set-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell' $request.backup.machinePolicyShell
            Set-UserRegistrySnapshot $machineHive $machineWinlogonPath 'Shell' @{
                exists = $true; value = [string]$request.command; kind = 'String'
            }
            $applyVerified = (Test-UserRegistrySnapshot `
                (Get-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell') `
                $request.backup.machinePolicyShell) -and
                ((Get-UserRegistrySnapshot $machineHive $machineWinlogonPath 'Shell').value -ceq [string]$request.command)
            if (-not $applyVerified) { throw 'Machine Winlogon shell update did not verify' }
        } elseif ($request.action -eq 'machine-winlogon-restore') {
            $backup = $request.backup
            $restoreStateMatches = ($backup.schemaVersion -eq 4) -and
                ($backup.scope -eq 'machine') -and
                ($winlogonBefore.value -ceq [string]$backup.command) -and
                (Test-UserRegistrySnapshot $policyBefore $backup.machinePolicyShell)
            if (-not $restoreStateMatches) {
                throw 'Machine shell values changed; refusing to restore over another shell'
            }
            if (-not $backupExisted) { throw 'The shared machine shell backup is missing' }
            $savedBackup = [System.Text.Encoding]::UTF8.GetString($previousBackupBytes) | ConvertFrom-Json
            $backupMatches = ($savedBackup.schemaVersion -eq 4) -and
                ($savedBackup.scope -eq 'machine') -and
                ($savedBackup.command -ceq [string]$backup.command) -and
                (Test-UserRegistrySnapshot $savedBackup.machinePolicyShell   $backup.machinePolicyShell) -and
                (Test-UserRegistrySnapshot $savedBackup.machineWinlogonShell $backup.machineWinlogonShell)
            if (-not $backupMatches) {
                throw 'The shared Winlogon shell backup does not match the requested restore'
            }
            Set-UserRegistrySnapshot $machineHive $machineWinlogonPath 'Shell' $backup.machineWinlogonShell
            Set-UserRegistrySnapshot $machineHive $machinePolicyPath   'Shell' $backup.machinePolicyShell
            $restoreVerified = (Test-UserRegistrySnapshot `
                (Get-UserRegistrySnapshot $machineHive $machineWinlogonPath 'Shell') `
                $backup.machineWinlogonShell) -and
                (Test-UserRegistrySnapshot `
                    (Get-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell') `
                    $backup.machinePolicyShell)
            if (-not $restoreVerified) { throw 'Machine Winlogon shell restoration did not verify' }
        } else {
            throw "Unsupported machine Winlogon shell action: $($request.action)"
        }
        return $true
    } catch {
        $failure = $_
        try {
            Set-UserRegistrySnapshot $machineHive $machinePolicyPath   'Shell' $policyBefore
            Set-UserRegistrySnapshot $machineHive $machineWinlogonPath 'Shell' $winlogonBefore
        } catch {
            throw "Winlogon shell operation failed and registry rollback was incomplete: $($failure.Exception.Message); $($_.Exception.Message)"
        }
        if ($backupWritten) {
            try {
                if ($backupExisted) {
                    [System.IO.File]::WriteAllBytes($backupPath, $previousBackupBytes)
                } else {
                    [System.IO.File]::Delete($backupPath)
                }
            } catch {
                throw "Winlogon shell operation failed and backup rollback was incomplete: $($failure.Exception.Message); $($_.Exception.Message)"
            }
        }
        throw $failure
    }
}

# ------------------------------------------------------------------
# Основной цикл обработки запросов
# ------------------------------------------------------------------

while ($null -ne ($line = $reader.ReadLine())) {
    try {
        $request = ConvertFrom-Json -InputObject $line
        $result = switch ($request.action) {
            'list' { @([OmniWin32]::ListWindows([int]$request.ownPid)) }
            'active'{ [OmniWin32]::GetActiveWindow() }
            'bounds'{
                [OmniWin32]::SetBounds(
                    [long]$request.hwnd, [int]$request.x, [int]$request.y,
                    [int]$request.width, [int]$request.height)
            }
            'prepare-drag' {
                [OmniWin32]::PrepareDrag(
                    [long]$request.hwnd, [string]$request.mode, [string]$request.direction)
            }
            'desktop' {
                [OmniWin32]::SetDesktop(
                    [long]$request.hwnd, [int]$request.x, [int]$request.y,
                    [int]$request.width, [int]$request.height)
            }
            'dock' {
                [OmniWin32]::SetDock(
                    [long]$request.hwnd, [int]$request.x, [int]$request.y,
                    [int]$request.width, [int]$request.height)
            }
            'dock-reset'  { [OmniWin32]::ResetDock([long]$request.hwnd) }
            'dock-remove' { [OmniWin32]::RemoveDock([long]$request.hwnd) }
            'cursor' { [OmniWin32]::SetCursor([int]$request.x, [int]$request.y) }
            'focus'  { [OmniWin32]::Focus([long]$request.hwnd) }
            'minimize' { [OmniWin32]::Minimize([long]$request.hwnd) }
            'maximize' { [OmniWin32]::Maximize([long]$request.hwnd, [bool]$request.maximize) }
            'toggle-maximize' { [OmniWin32]::ToggleMaximize([long]$request.hwnd) }
            'close'  { [OmniWin32]::Close([long]$request.hwnd) }
            'elevate' {
                if ($PipeName) { throw 'elevation_not_available_from_helper' }
                [OmniWin32]::LaunchElevated(
                    [string]$request.executable, [string]$request.arguments, [string]$request.directory)
            }
            'machine-shell-restore'    { Invoke-MachineShellPolicyAction $request }
            'machine-winlogon-restore' { Invoke-MachineWinlogonShellAction $request }
            'explorer-shell-status'    { [OmniWin32]::GetExplorerShellStatus() }
            'explorer-shell-start'     { [OmniWin32]::StartExplorerShellVisible() }
            'taskbar-hide'             { [OmniWin32]::HideExplorerTaskbar() }
            'taskbar-restore'          { [OmniWin32]::RestoreExplorerTaskbar() }
            'desktop-icons-hide'       { [OmniWin32]::HideExplorerDesktopIcons() }
            'desktop-icons-restore'    { [OmniWin32]::RestoreExplorerDesktopIcons() }
            'desktop-wallpaper-hide'   { [OmniWin32]::HideExplorerWallpaper() }
            'desktop-wallpaper-restore'{ [OmniWin32]::RestoreExplorerWallpaper() }
            default { throw "Unsupported native action: $($request.action)" }
        }
        $response = @{ requestId = $request.requestId; success = $true; result = $result }
    } catch {
        $response = @{ requestId = $request.requestId; success = $false; error = $_.Exception.Message }
    }
    $writer.WriteLine((ConvertTo-Json -InputObject $response -Compress -Depth 8))
}

if ($PipeName) {
    $writer.Dispose()
    $reader.Dispose()
    $pipe.Dispose()
}

[OmniWin32]::ResetAllDockReservations() | Out-Null
[OmniWin32]::RestoreExplorerTaskbar() | Out-Null
[OmniWin32]::RestoreExplorerDesktopIcons() | Out-Null
[OmniWin32]::RestoreExplorerWallpaper() | Out-Null
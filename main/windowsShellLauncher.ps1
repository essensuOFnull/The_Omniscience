param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [string]$AppPath
)

$ErrorActionPreference = 'Stop'
$process = $null

try {
    $arguments = @()
    if ($AppPath) {
        $arguments += '"' + $AppPath + '"'
    }

    $process = Start-Process -FilePath $Executable -ArgumentList $arguments -PassThru
    if ($null -ne $process) {
        $process.WaitForExit()
    }
} catch {
    try {
        $logPath = Join-Path $env:LOCALAPPDATA 'The_Omniscience\shell-launcher.log'
        $logDirectory = Split-Path -Parent $logPath
        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
        Add-Content -LiteralPath $logPath -Value "$(Get-Date -Format o) $($_.Exception.Message)"
    } catch {}
} finally {
    try {
        Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class OmniShellState {
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern IntPtr FindWindow(string className, string windowName);
}
'@ -ErrorAction SilentlyContinue

        $taskbar = [OmniShellState]::FindWindow('Shell_TrayWnd', $null)
        if ($taskbar -eq [IntPtr]::Zero) {
            Start-Process -FilePath (Join-Path $env:WINDIR 'explorer.exe')
        }
    } catch {
        try {
            Start-Process -FilePath (Join-Path $env:WINDIR 'explorer.exe')
        } catch {}
    }
}

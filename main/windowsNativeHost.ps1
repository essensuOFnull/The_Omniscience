param([string]$PipeName)
$script:ErrorActionPreference = 'Stop'

$nativeSource = @'
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;

public sealed class OmniWindowInfo
{
    public string id { get; set; }
    public string title { get; set; }
    public int pid { get; set; }
    public string imagePath { get; set; }
    public int x { get; set; }
    public int y { get; set; }
    public int width { get; set; }
    public int height { get; set; }
    public bool minimized { get; set; }
    public bool maximized { get; set; }
    public bool focused { get; set; }
}

public static class OmniWin32
{
    private delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int maxCount);
    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")]
    private static extern bool IsIconic(IntPtr hwnd);
    [DllImport("user32.dll")]
    private static extern bool IsWindow(IntPtr hwnd);
    [DllImport("user32.dll")]
    private static extern bool IsZoomed(IntPtr hwnd);
    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
    [DllImport("user32.dll")]
    private static extern IntPtr GetWindow(IntPtr hwnd, uint command);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")]
    private static extern IntPtr GetWindowLongPtr64(IntPtr hwnd, int index);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongW")]
    private static extern int GetWindowLong32(IntPtr hwnd, int index);
    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SetWindowPos(IntPtr hwnd, IntPtr insertAfter, int x, int y, int width, int height, uint flags);
    [DllImport("user32.dll")]
    private static extern bool ShowWindowAsync(IntPtr hwnd, int command);
    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hwnd);
    [DllImport("user32.dll")]
    private static extern bool PostMessage(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SetCursorPos(int x, int y);
    [DllImport("shell32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "ShellExecuteW")]
    private static extern IntPtr ShellExecute(IntPtr hwnd, string operation, string file, string parameters, string directory, int showCommand);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(uint access, bool inheritHandle, uint processId);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool QueryFullProcessImageName(IntPtr process, uint flags, StringBuilder imageName, ref int size);
    [DllImport("kernel32.dll")]
    private static extern bool CloseHandle(IntPtr handle);

    private static IntPtr GetWindowLongPtr(IntPtr hwnd, int index)
    {
        return IntPtr.Size == 8
            ? GetWindowLongPtr64(hwnd, index)
            : new IntPtr(GetWindowLong32(hwnd, index));
    }

    private static string GetImagePath(uint pid)
    {
        IntPtr process = OpenProcess(0x1000, false, pid);
        if (process == IntPtr.Zero) return null;
        try
        {
            var path = new StringBuilder(32768);
            int size = path.Capacity;
            return QueryFullProcessImageName(process, 0, path, ref size) ? path.ToString() : null;
        }
        finally { CloseHandle(process); }
    }

    public static object[] ListWindows(int ownPid)
    {
        var result = new List<OmniWindowInfo>();
        IntPtr foreground = GetForegroundWindow();
        EnumWindows((hwnd, _) =>
        {
            if (!IsWindowVisible(hwnd)) return true;
            uint pid;
            GetWindowThreadProcessId(hwnd, out pid);
            if (pid == ownPid) return true;
            if ((((long)GetWindowLongPtr(hwnd, -20)) & 0x80L) != 0) return true;

            var title = new StringBuilder(2048);
            if (GetWindowText(hwnd, title, title.Capacity) <= 0) return true;
            RECT rect;
            if (!GetWindowRect(hwnd, out rect)) return true;
            int width = rect.Right - rect.Left;
            int height = rect.Bottom - rect.Top;
            if (width <= 0 || height <= 0) return true;

            result.Add(new OmniWindowInfo {
                id = hwnd.ToInt64().ToString(CultureInfo.InvariantCulture),
                title = title.ToString(),
                pid = (int)pid,
                imagePath = GetImagePath(pid),
                x = rect.Left,
                y = rect.Top,
                width = width,
                height = height,
                minimized = IsIconic(hwnd),
                maximized = IsZoomed(hwnd),
                focused = hwnd == foreground
            });
            return true;
        }, IntPtr.Zero);
        return result.ToArray();
    }

    public static object GetActiveWindow()
    {
        IntPtr hwnd = GetForegroundWindow();
        return hwnd == IntPtr.Zero ? null : hwnd.ToInt64().ToString(CultureInfo.InvariantCulture);
    }

    public static bool SetBounds(long hwnd, int x, int y, int width, int height)
    {
        bool updated = SetWindowPos(
            new IntPtr(hwnd), IntPtr.Zero, x, y,
            Math.Max(1, width), Math.Max(1, height), 0x0014
        );
        if (!updated && Marshal.GetLastWin32Error() == 5)
        {
            throw new UnauthorizedAccessException("access_denied");
        }
        return updated;
    }

    public static bool SetCursor(int x, int y) { return SetCursorPos(x, y); }

    public static bool Focus(long hwnd)
    {
        IntPtr window = new IntPtr(hwnd);
        ShowWindowAsync(window, 9);
        return SetForegroundWindow(window);
    }

    public static bool Minimize(long hwnd)
    {
        IntPtr window = new IntPtr(hwnd);
        if (!IsWindow(window)) return false;
        ShowWindowAsync(window, 6);
        return true;
    }
    public static bool Maximize(long hwnd, bool maximize)
    {
        IntPtr window = new IntPtr(hwnd);
        if (!IsWindow(window)) return false;
        ShowWindowAsync(window, maximize ? 3 : 9);
        return true;
    }
    public static bool Close(long hwnd) { return PostMessage(new IntPtr(hwnd), 0x0010, IntPtr.Zero, IntPtr.Zero); }
    public static bool LaunchElevated(string executable, string parameters, string directory)
    {
        return ShellExecute(IntPtr.Zero, "runas", executable, parameters, directory, 1).ToInt64() > 32;
    }
}
'@

[void](Add-Type -TypeDefinition $nativeSource -Language CSharp)

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

function Get-ShellLauncherStatus {
    $os = Get-CimInstance -ClassName Win32_OperatingSystem
    $supported = $os.Caption -match 'Enterprise|Education|IoT Enterprise'
    $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    try {
        $class = [wmiclass]'\\.\root\standardcimv2\embedded:WESL_UserSetting'
        $enabledResult = $class.IsEnabled()
        $enabled = [bool]$enabledResult.Enabled
        $custom = $class.GetCustomShell($sid)
        $hasCustom = ($custom.ReturnValue -eq 0)
        $default = $class.GetDefaultShell()
        return @{
            supported = $supported
            edition = $os.Caption
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
        return @{
            supported = $supported
            edition = $os.Caption
            available = $false
            enabled = $false
            sid = $sid
            error = $_.Exception.Message
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
        $result = $class.SetCustomShell(
            [string]$status.sid, [string]$request.shell,
            $null, $null, 0
        )
    } elseif ($request.action -eq 'restore-shell') {
        $backup = $request.backup
        if ($backup.hasCustomShell) {
            $codes = if ($backup.customReturnCodes.Count) { [int[]]$backup.customReturnCodes } else { $null }
            $actions = if ($backup.customReturnCodesAction.Count) { [int[]]$backup.customReturnCodesAction } else { $null }
            $result = $class.SetCustomShell(
                [string]$backup.sid, [string]$backup.shell,
                $codes, $actions, [int]$backup.defaultAction
            )
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

while ($null -ne ($line = $reader.ReadLine())) {
    try {
        $request = ConvertFrom-Json -InputObject $line
        $result = switch ($request.action) {
            'list' { [OmniWin32]::ListWindows([int]$request.ownPid) }
            'active' { [OmniWin32]::GetActiveWindow() }
            'bounds' {
                [OmniWin32]::SetBounds(
                    [long]$request.hwnd, [int]$request.x, [int]$request.y,
                    [int]$request.width, [int]$request.height
                )
            }
            'cursor' { [OmniWin32]::SetCursor([int]$request.x, [int]$request.y) }
            'focus' { [OmniWin32]::Focus([long]$request.hwnd) }
            'minimize' { [OmniWin32]::Minimize([long]$request.hwnd) }
            'maximize' { [OmniWin32]::Maximize([long]$request.hwnd, [bool]$request.maximize) }
            'close' { [OmniWin32]::Close([long]$request.hwnd) }
            'elevate' {
                if ($PipeName) { throw 'elevation_not_available_from_helper' }
                [OmniWin32]::LaunchElevated(
                    [string]$request.executable, [string]$request.arguments, [string]$request.directory
                )
            }
            'shell-status' { Get-ShellLauncherStatus }
            { $_ -in 'set-shell', 'restore-shell', 'remove-shell' } { Invoke-ShellLauncherAction $request }
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

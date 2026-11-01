param([string]$PipeName)
$script:ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = New-Object System.Text.UTF8Encoding($false)

$nativeSource = @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

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
    private const int GWL_STYLE = -16;
    private const int WS_CHILD = 0x40000000;
    private const int WS_POPUP = unchecked((int)0x80000000);
    private const uint ABM_NEW = 0x00000000;
    private const uint ABM_REMOVE = 0x00000001;
    private const uint ABM_QUERYPOS = 0x00000002;
    private const uint ABM_SETPOS = 0x00000003;
    private const uint ABE_TOP = 1;
    private const uint SWP_NOACTIVATE = 0x0010;
    private const int WM_APP = 0x8000;
    private static readonly HashSet<IntPtr> AppBars = new HashSet<IntPtr>();
    private static readonly EnumWindowsProc WindowEnumerator = EnumerateWindow;
    private static readonly Dictionary<IntPtr, Thread> ActiveDrags = new Dictionary<IntPtr, Thread>();

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT
    {
        public int X;
        public int Y;
    }

    private sealed class ShellWindowState
    {
        public readonly HashSet<int> ProcessIds = new HashSet<int>();
        public bool HasTaskbar;
        public bool HasDesktop;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct APPBARDATA
    {
        public int cbSize;
        public IntPtr hWnd;
        public uint uCallbackMessage;
        public uint uEdge;
        public RECT rc;
        public IntPtr lParam;
    }

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int maxCount);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetClassName(IntPtr hwnd, StringBuilder className, int maxCount);
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
    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW", SetLastError = true)]
    private static extern IntPtr SetWindowLongPtr64(IntPtr hwnd, int index, IntPtr value);
    [DllImport("user32.dll", EntryPoint = "SetWindowLongW", SetLastError = true)]
    private static extern int SetWindowLong32(IntPtr hwnd, int index, int value);
    [DllImport("user32.dll")]
    private static extern IntPtr FindWindow(string className, string windowName);
    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetParent(IntPtr child, IntPtr parent);
    [DllImport("user32.dll")]
    private static extern IntPtr GetParent(IntPtr child);
    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    private static extern IntPtr GetAncestor(IntPtr hwnd, uint flags);
    [DllImport("user32.dll")]
    private static extern bool AttachThreadInput(uint attach, uint attachTo, bool attachFlag);
    [DllImport("user32.dll")]
    private static extern bool BringWindowToTop(IntPtr hwnd);
    [DllImport("user32.dll")]
    private static extern IntPtr SetFocus(IntPtr hwnd);
    [DllImport("user32.dll", EntryPoint = "SetThreadDpiAwarenessContext", SetLastError = true)]
    private static extern IntPtr SetThreadDpiAwarenessContext(IntPtr dpiContext);
    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SetWindowPos(IntPtr hwnd, IntPtr insertAfter, int x, int y, int width, int height, uint flags);
    [DllImport("user32.dll")]
    private static extern bool ShowWindowAsync(IntPtr hwnd, int command);
    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hwnd, int command);
    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hwnd);
    [DllImport("user32.dll")]
    private static extern bool PostMessage(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool GetCursorPos(out POINT point);
    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int virtualKey);
    [DllImport("user32.dll")]
    private static extern uint GetDpiForWindow(IntPtr hwnd);
    [DllImport("shell32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "ShellExecuteW")]
    private static extern IntPtr ShellExecute(IntPtr hwnd, string operation, string file, string parameters, string directory, int showCommand);
    [DllImport("shell32.dll")]
    private static extern UIntPtr SHAppBarMessage(uint message, ref APPBARDATA data);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(uint access, bool inheritHandle, uint processId);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool QueryFullProcessImageName(IntPtr process, uint flags, StringBuilder imageName, ref int size);
    [DllImport("kernel32.dll")]
    private static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll")]
    private static extern uint GetCurrentThreadId();

    private static OmniWindowInfo ReadWindow(IntPtr hwnd, IntPtr foreground, int ownPid)
    {
        if (!IsWindowVisible(hwnd)) return null;
        uint pid;
        GetWindowThreadProcessId(hwnd, out pid);
        if (pid == ownPid) return null;
        if ((((long)GetWindowLongPtr(hwnd, -20)) & 0x80L) != 0) return null;

        var title = new StringBuilder(2048);
        if (GetWindowText(hwnd, title, title.Capacity) <= 0) return null;
        RECT rect;
        if (!GetWindowRect(hwnd, out rect)) return null;
        int width = rect.Right - rect.Left;
        int height = rect.Bottom - rect.Top;
        if (width <= 0 || height <= 0) return null;

        return new OmniWindowInfo {
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
        };
    }

    private static bool EnumerateWindow(IntPtr hwnd, IntPtr lParam)
    {
        var state = (EnumerationState)GCHandle.FromIntPtr(lParam).Target;
        OmniWindowInfo window = ReadWindow(hwnd, state.Foreground, state.OwnPid);
        if (window != null) state.Windows.Add(window);
        return true;
    }

    private static bool EnumerateShellWindow(IntPtr hwnd, IntPtr lParam)
    {
        var state = (ShellWindowState)GCHandle.FromIntPtr(lParam).Target;
        var className = new StringBuilder(128);
        if (GetClassName(hwnd, className, className.Capacity) <= 0) return true;
        string name = className.ToString();
        bool isTaskbar = name == "Shell_TrayWnd" || name == "Shell_SecondaryTrayWnd";
        bool isDesktop = name == "Progman" || name == "WorkerW";
        if (!isTaskbar && !isDesktop) return true;

        uint pid;
        GetWindowThreadProcessId(hwnd, out pid);
        try
        {
            using (Process process = Process.GetProcessById((int)pid))
            {
                if (!string.Equals(process.ProcessName, "explorer", StringComparison.OrdinalIgnoreCase))
                    return true;
            }
        }
        catch (ArgumentException) { return true; }
        catch (InvalidOperationException) { return true; }

        state.ProcessIds.Add((int)pid);
        state.HasTaskbar |= isTaskbar;
        state.HasDesktop |= isDesktop;
        return true;
    }

    private static ShellWindowState GetExplorerShellState()
    {
        var state = new ShellWindowState();
        GCHandle handle = GCHandle.Alloc(state);
        try { EnumWindows(EnumerateShellWindow, GCHandle.ToIntPtr(handle)); }
        finally { handle.Free(); }
        return state;
    }

    private sealed class EnumerationState
    {
        public readonly List<OmniWindowInfo> Windows = new List<OmniWindowInfo>();
        public IntPtr Foreground;
        public int OwnPid;
    }

    private static IntPtr GetWindowLongPtr(IntPtr hwnd, int index)
    {
        return IntPtr.Size == 8
            ? GetWindowLongPtr64(hwnd, index)
            : new IntPtr(GetWindowLong32(hwnd, index));
    }

    private static IntPtr SetWindowLongPtr(IntPtr hwnd, int index, IntPtr value)
    {
        if (IntPtr.Size == 8) return SetWindowLongPtr64(hwnd, index, value);
        return new IntPtr(SetWindowLong32(hwnd, index, value.ToInt32()));
    }

    private static APPBARDATA NewAppBarData(IntPtr hwnd, RECT rect)
    {
        return new APPBARDATA {
            cbSize = Marshal.SizeOf(typeof(APPBARDATA)),
            hWnd = hwnd,
            uCallbackMessage = (uint)(WM_APP + 57),
            uEdge = ABE_TOP,
            rc = rect,
            lParam = IntPtr.Zero
        };
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
        var state = new EnumerationState {
            Foreground = GetAncestor(GetForegroundWindow(), 2),
            OwnPid = ownPid,
        };
        if (state.Foreground == IntPtr.Zero) state.Foreground = GetForegroundWindow();
        GCHandle handle = GCHandle.Alloc(state);
        try { EnumWindows(WindowEnumerator, GCHandle.ToIntPtr(handle)); }
        finally { handle.Free(); }
        return state.Windows.ToArray();
    }

    public static void EnablePerMonitorDpiAwareness()
    {
        if (SetThreadDpiAwarenessContext(new IntPtr(-3)) == IntPtr.Zero)
        {
            throw new InvalidOperationException(
                "SetThreadDpiAwarenessContext failed: " +
                Marshal.GetLastWin32Error().ToString(CultureInfo.InvariantCulture)
            );
        }
    }

    public static object GetActiveWindow()
    {
        IntPtr hwnd = GetForegroundWindow();
        hwnd = GetAncestor(hwnd, 2);
        return hwnd == IntPtr.Zero ? null : hwnd.ToInt64().ToString(CultureInfo.InvariantCulture);
    }

    public static object GetExplorerShellStatus()
    {
        ShellWindowState state = GetExplorerShellState();
        return new {
            running = state.ProcessIds.Count > 0,
            taskbar = state.HasTaskbar,
            desktop = state.HasDesktop,
            processIds = new List<int>(state.ProcessIds).ToArray()
        };
    }

    public static bool StopExplorerShell()
    {
        for (int attempt = 0; attempt < 5; attempt++)
        {
            ShellWindowState state = GetExplorerShellState();
            if (state.ProcessIds.Count == 0) return true;
            foreach (int pid in state.ProcessIds)
            {
                try
                {
                    using (Process process = Process.GetProcessById(pid))
                    {
                        if (!string.Equals(process.ProcessName, "explorer", StringComparison.OrdinalIgnoreCase))
                            continue;
                        process.Kill();
                        process.WaitForExit(5000);
                    }
                }
                catch (ArgumentException) { }
                catch (InvalidOperationException) { }
            }
            Thread.Sleep(300);
        }

        return GetExplorerShellState().ProcessIds.Count == 0;
    }

    public static bool StartExplorerShell()
    {
        ShellWindowState state = GetExplorerShellState();
        if (state.HasTaskbar && state.HasDesktop) return true;

        string explorerPath = System.IO.Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.Windows), "explorer.exe"
        );
        Process.Start(new ProcessStartInfo {
            FileName = explorerPath,
            UseShellExecute = true
        });

        DateTime deadline = DateTime.UtcNow.AddSeconds(15);
        while (DateTime.UtcNow < deadline)
        {
            Thread.Sleep(250);
            state = GetExplorerShellState();
            if (state.HasTaskbar && state.HasDesktop) return true;
        }
        return false;
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

    public static bool SetDesktop(long hwnd, int x, int y, int width, int height)
    {
        IntPtr window = new IntPtr(hwnd);
        IntPtr desktop = FindWindow("Progman", null);
        if (desktop == IntPtr.Zero) return false;
        int style = GetWindowLongPtr(window, GWL_STYLE).ToInt32();
        SetWindowLongPtr(window, GWL_STYLE, new IntPtr((style | WS_CHILD) & ~WS_POPUP));
        IntPtr previousParent = SetParent(window, desktop);
        if (GetParent(window) != desktop)
        {
            SetWindowLongPtr(window, GWL_STYLE, new IntPtr(style));
            return false;
        }
        bool positioned = SetWindowPos(
            window, new IntPtr(1), x, y, Math.Max(1, width), Math.Max(1, height),
            SWP_NOACTIVATE | 0x0020
        );
        if (positioned) return true;
        SetParent(window, previousParent);
        SetWindowLongPtr(window, GWL_STYLE, new IntPtr(style));
        return false;
    }

    public static bool SetDock(long hwnd, int x, int y, int width, int height)
    {
        IntPtr window = new IntPtr(hwnd);
        RECT requested = new RECT {
            Left = x, Top = y, Right = x + Math.Max(1, width), Bottom = y + Math.Max(1, height)
        };
        APPBARDATA data = NewAppBarData(window, requested);
        if (!AppBars.Contains(window))
        {
            if (SHAppBarMessage(ABM_NEW, ref data) == UIntPtr.Zero) return false;
            AppBars.Add(window);
        }

        data = NewAppBarData(window, requested);
        SHAppBarMessage(ABM_QUERYPOS, ref data);
        data.rc = requested;
        SHAppBarMessage(ABM_SETPOS, ref data);
        return SetWindowPos(
            window, new IntPtr(-1), x, y,
            Math.Max(1, width), Math.Max(1, height),
            SWP_NOACTIVATE
        );
    }

    public static bool ResetDock(long hwnd)
    {
        IntPtr window = new IntPtr(hwnd);
        if (!IsWindow(window)) return false;
        bool wasRegistered = AppBars.Contains(window);
        APPBARDATA data = NewAppBarData(window, new RECT());
        UIntPtr removed = SHAppBarMessage(ABM_REMOVE, ref data);
        AppBars.Remove(window);
        return !wasRegistered || removed != UIntPtr.Zero;
    }

    public static bool RemoveDock(long hwnd)
    {
        IntPtr window = new IntPtr(hwnd);
        if (!AppBars.Remove(window)) return true;
        APPBARDATA data = NewAppBarData(window, new RECT());
        return SHAppBarMessage(ABM_REMOVE, ref data) != UIntPtr.Zero;
    }

    public static bool SetCursor(int x, int y) { return SetCursorPos(x, y); }

    public static bool Focus(long hwnd)
    {
        IntPtr window = new IntPtr(hwnd);
        if (!IsWindow(window)) return false;
        IntPtr foreground = GetForegroundWindow();
        if (foreground == window) return true;
        uint currentThread = GetCurrentThreadId();
        uint ignoredPid;
        uint foregroundThread = foreground == IntPtr.Zero
            ? 0
            : GetWindowThreadProcessId(foreground, out ignoredPid);
        uint targetThread = GetWindowThreadProcessId(window, out ignoredPid);
        ShowWindow(window, 9);
        bool attachedForeground = false;
        bool attachedTarget = false;
        try
        {
            if (foregroundThread != 0 && currentThread != foregroundThread)
                attachedForeground = AttachThreadInput(currentThread, foregroundThread, true);
            if (targetThread != 0 && currentThread != targetThread)
                attachedTarget = AttachThreadInput(currentThread, targetThread, true);
            SetForegroundWindow(window);
            BringWindowToTop(window);
            SetFocus(window);
            IntPtr active = GetForegroundWindow();
            IntPtr activeRoot = GetAncestor(active, 2);
            IntPtr targetRoot = GetAncestor(window, 2);
            return active == window || activeRoot == targetRoot;
        }
        finally
        {
            if (attachedTarget) AttachThreadInput(currentThread, targetThread, false);
            if (attachedForeground) AttachThreadInput(currentThread, foregroundThread, false);
        }
    }

    public static object PrepareDrag(long hwnd, string mode, string direction)
    {
        IntPtr window = new IntPtr(hwnd);
        if (!IsWindow(window)) return null;
        lock (ActiveDrags)
        {
            if (ActiveDrags.ContainsKey(window)) return null;
        }
        Focus(hwnd);
        RECT rect;
        if (!GetWindowRect(window, out rect)) return null;
        int width = rect.Right - rect.Left;
        int height = rect.Bottom - rect.Top;
        if (width <= 0 || height <= 0) return null;
        int x = rect.Left + width / 2;
        int y = rect.Top + Math.Min(20, Math.Max(1, height / 3));
        if (mode == "resize")
        {
            switch (direction)
            {
                case "nw": x = rect.Left; y = rect.Top; break;
                case "n": y = rect.Top; break;
                case "ne": x = rect.Right - 1; y = rect.Top; break;
                case "e": x = rect.Right - 1; y = rect.Top + height / 2; break;
                case "se": x = rect.Right - 1; y = rect.Bottom - 1; break;
                case "s": y = rect.Bottom - 1; break;
                case "sw": x = rect.Left; y = rect.Bottom - 1; break;
                case "w": x = rect.Left; y = rect.Top + height / 2; break;
            }
        }
        if (!SetCursorPos(x, y)) return null;

        POINT cursor;
        if (!GetCursorPos(out cursor)) return null;
        uint dpi = GetDpiForWindow(window);
        if (dpi == 0) dpi = 96;
        int minWidth = Math.Max(1, (int)Math.Round(120.0 * dpi / 96.0));
        int minHeight = Math.Max(1, (int)Math.Round(80.0 * dpi / 96.0));
        int initialX = rect.Left;
        int initialY = rect.Top;
        int initialWidth = width;
        int initialHeight = height;
        int lastX = initialX;
        int lastY = initialY;
        int lastWidth = initialWidth;
        int lastHeight = initialHeight;
        int startX = cursor.X;
        int startY = cursor.Y;
        string dragMode = mode;
        string resizeDirection = direction;
        Thread dragThread = null;
        dragThread = new Thread(() =>
        {
            try
            {
                while ((GetAsyncKeyState(0x01) & 0x8000) != 0 && IsWindow(window))
                {
                    POINT current;
                    if (GetCursorPos(out current))
                    {
                        int dx = current.X - startX;
                        int dy = current.Y - startY;
                        int nextX = initialX;
                        int nextY = initialY;
                        int nextWidth = initialWidth;
                        int nextHeight = initialHeight;

                        if (dragMode == "move")
                        {
                            nextX += dx;
                            nextY += dy;
                        }
                        else if (dragMode == "resize")
                        {
                            if (resizeDirection.IndexOf('n') >= 0)
                            {
                                nextHeight = Math.Max(minHeight, initialHeight - dy);
                                nextY = initialY + initialHeight - nextHeight;
                            }
                            if (resizeDirection.IndexOf('s') >= 0)
                                nextHeight = Math.Max(minHeight, initialHeight + dy);
                            if (resizeDirection.IndexOf('w') >= 0)
                            {
                                nextWidth = Math.Max(minWidth, initialWidth - dx);
                                nextX = initialX + initialWidth - nextWidth;
                            }
                            if (resizeDirection.IndexOf('e') >= 0)
                                nextWidth = Math.Max(minWidth, initialWidth + dx);
                        }

                        if (nextX != lastX || nextY != lastY ||
                            nextWidth != lastWidth || nextHeight != lastHeight)
                        {
                            if (SetWindowPos(
                                window, IntPtr.Zero, nextX, nextY, nextWidth, nextHeight,
                                0x0014))
                            {
                                lastX = nextX;
                                lastY = nextY;
                                lastWidth = nextWidth;
                                lastHeight = nextHeight;
                            }
                        }
                    }
                    Thread.Sleep(10);
                }
            }
            finally
            {
                lock (ActiveDrags) ActiveDrags.Remove(window);
            }
        });
        dragThread.IsBackground = true;
        lock (ActiveDrags)
        {
            if (ActiveDrags.ContainsKey(window)) return null;
            ActiveDrags[window] = dragThread;
        }
        dragThread.Start();
        return new {
            x = rect.Left, y = rect.Top, width, height,
            cursorX = cursor.X, cursorY = cursor.Y, nativeDrag = true
        };
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
[OmniWin32]::EnablePerMonitorDpiAwareness()

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
            'prepare-drag' {
                [OmniWin32]::PrepareDrag(
                    [long]$request.hwnd, [string]$request.mode, [string]$request.direction
                )
            }
            'desktop' {
                [OmniWin32]::SetDesktop(
                    [long]$request.hwnd, [int]$request.x, [int]$request.y,
                    [int]$request.width, [int]$request.height
                )
            }
            'dock' {
                [OmniWin32]::SetDock(
                    [long]$request.hwnd, [int]$request.x, [int]$request.y,
                    [int]$request.width, [int]$request.height
                )
            }
            'dock-reset' { [OmniWin32]::ResetDock([long]$request.hwnd) }
            'dock-remove' { [OmniWin32]::RemoveDock([long]$request.hwnd) }
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
            'explorer-shell-status' { [OmniWin32]::GetExplorerShellStatus() }
            'explorer-shell-stop' { [OmniWin32]::StopExplorerShell() }
            'explorer-shell-start' { [OmniWin32]::StartExplorerShell() }
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

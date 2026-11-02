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
using Microsoft.Win32;

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
    private const int GWL_HWNDPARENT = -8;
    private const int WS_CHILD = 0x40000000;
    private const int WS_CAPTION = 0x00C00000;
    private const int WS_THICKFRAME = 0x00040000;
    private const int WS_SYSMENU = 0x00080000;
    private const int WS_MINIMIZEBOX = 0x00020000;
    private const int WS_MAXIMIZEBOX = 0x00010000;
    private const int WS_POPUP = unchecked((int)0x80000000);
    private const int GWL_EXSTYLE = -20;
    private const int WS_EX_TOPMOST = 0x00000008;
    private const uint GW_OWNER = 4;
    private const uint MONITOR_DEFAULTTONEAREST = 2;
    private const int SW_HIDE = 0;
    private const int SW_SHOWNOACTIVATE = 4;
    private const uint ABM_NEW = 0x00000000;
    private const uint ABM_REMOVE = 0x00000001;
    private const uint ABM_QUERYPOS = 0x00000002;
    private const uint ABM_SETPOS = 0x00000003;
    private const uint ABM_GETSTATE = 0x00000004;
    private const uint ABM_SETSTATE = 0x0000000A;
    private const uint ABE_TOP = 1;
    private const uint ABS_AUTOHIDE = 0x00000001;
    private const uint SPI_SETWORKAREA = 0x002F;
    private const uint SPI_GETWORKAREA = 0x0030;
    private const uint SPI_SETDESKWALLPAPER = 0x0014;
    private const uint SPI_GETDESKWALLPAPER = 0x0073;
    private const uint SPIF_UPDATEINIFILE = 0x0001;
    private const uint SPIF_SENDCHANGE = 0x0002;
    private const uint SWP_NOACTIVATE = 0x0010;
    private const int WM_APP = 0x8000;
    private static readonly HashSet<IntPtr> AppBars = new HashSet<IntPtr>();
    private static readonly EnumWindowsProc WindowEnumerator = EnumerateWindow;
    private static readonly Dictionary<IntPtr, Thread> ActiveDrags = new Dictionary<IntPtr, Thread>();
    private static readonly Dictionary<IntPtr, bool> ExplorerTaskbarVisibility = new Dictionary<IntPtr, bool>();
    private static readonly Dictionary<IntPtr, bool> ExplorerDesktopIconVisibility = new Dictionary<IntPtr, bool>();
    private static string OriginalDesktopWallpaper;
    private static bool HasOriginalDesktopWallpaper;
    private static bool OriginalWallpaperRegistryValueExists;
    private static string OriginalWallpaperRegistryValue;
    private static RegistryValueKind OriginalWallpaperRegistryValueKind;
    private static uint OriginalTaskbarAppBarState;
    private static bool HasOriginalTaskbarAppBarState;
    private static RECT OriginalWorkArea;
    private static bool HasOriginalWorkArea;
    private static bool WorkAreaReserved;

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

    [StructLayout(LayoutKind.Sequential)]
    private struct MONITORINFO
    {
        public int cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public uint dwFlags;
    }

    private sealed class ShellWindowState
    {
        public readonly HashSet<int> ProcessIds = new HashSet<int>();
        public readonly List<IntPtr> Taskbars = new List<IntPtr>();
        public readonly List<IntPtr> DesktopViews = new List<IntPtr>();
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
    private static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint flags);
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern bool GetMonitorInfo(IntPtr monitor, ref MONITORINFO info);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr FindWindowEx(IntPtr parent, IntPtr after, string className, string windowName);
    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SendMessageTimeout(
        IntPtr window, uint message, IntPtr wParam, IntPtr lParam,
        uint flags, uint timeout, out IntPtr result
    );
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool ScreenToClient(IntPtr window, ref POINT point);
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
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SystemParametersInfo(uint action, uint parameter, ref RECT value, uint flags);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "SystemParametersInfoW", SetLastError = true)]
    private static extern bool SystemParametersInfo(uint action, uint parameter, StringBuilder value, uint flags);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "SystemParametersInfoW", SetLastError = true)]
    private static extern bool SystemParametersInfo(uint action, uint parameter, string value, uint flags);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(uint access, bool inheritHandle, uint processId);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool QueryFullProcessImageName(IntPtr process, uint flags, StringBuilder imageName, ref int size);
    [DllImport("kernel32.dll")]
    private static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll")]
    private static extern uint GetCurrentThreadId();
    [DllImport("kernel32.dll")]
    private static extern void SetLastError(uint errorCode);

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
        if (isTaskbar)
        {
            state.Taskbars.Add(hwnd);
            state.HasTaskbar = true;
        }
        if (isDesktop)
        {
            state.HasDesktop = true;
            IntPtr desktopView = FindWindowEx(hwnd, IntPtr.Zero, "SHELLDLL_DefView", null);
            if (desktopView != IntPtr.Zero) state.DesktopViews.Add(desktopView);
        }
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

    private static bool IsAnyWindowVisible(List<IntPtr> windows)
    {
        foreach (IntPtr window in windows)
            if (IsWindow(window) && IsWindowVisible(window)) return true;
        return false;
    }

    private static bool ShowExplorerShellUi()
    {
        ShellWindowState state = GetExplorerShellState();
        if (!state.HasTaskbar || !state.HasDesktop || state.DesktopViews.Count == 0) return false;

        var windows = new List<IntPtr>(state.Taskbars);
        windows.AddRange(state.DesktopViews);
        foreach (IntPtr window in windows)
        {
            if (!IsWindow(window)) continue;
            ShowWindow(window, SW_SHOWNOACTIVATE);
            if (!IsWindowVisible(window)) return false;
        }
        return true;
    }

    public static bool HideExplorerTaskbar()
    {
        ShellWindowState state = GetExplorerShellState();
        if (state.Taskbars.Count == 0) return false;

        foreach (IntPtr taskbar in state.Taskbars)
        {
            if (!IsWindow(taskbar)) continue;
            if (!ExplorerTaskbarVisibility.ContainsKey(taskbar))
                ExplorerTaskbarVisibility.Add(taskbar, IsWindowVisible(taskbar));
        }

        IntPtr primaryTaskbar = state.Taskbars[0];
        if (!HasOriginalTaskbarAppBarState)
        {
            OriginalTaskbarAppBarState = GetTaskbarAppBarState(primaryTaskbar);
            HasOriginalTaskbarAppBarState = true;
        }
        if (!SetTaskbarAppBarState(primaryTaskbar, OriginalTaskbarAppBarState | ABS_AUTOHIDE)
            || (GetTaskbarAppBarState(primaryTaskbar) & ABS_AUTOHIDE) == 0)
        {
            RestoreTaskbarAppBarState(primaryTaskbar);
            return false;
        }

        foreach (IntPtr taskbar in state.Taskbars)
        {
            if (!IsWindow(taskbar)) continue;
            ShowWindow(taskbar, SW_HIDE);
            if (IsWindowVisible(taskbar))
            {
                RestoreExplorerTaskbar();
                return false;
            }
        }
        return true;
    }

    private static uint GetTaskbarAppBarState(IntPtr taskbar)
    {
        APPBARDATA data = NewAppBarData(taskbar, new RECT());
        return (uint)SHAppBarMessage(ABM_GETSTATE, ref data).ToUInt64();
    }

    private static bool RestoreTaskbarAppBarState(IntPtr taskbar)
    {
        if (!HasOriginalTaskbarAppBarState) return true;
        if (!SetTaskbarAppBarState(taskbar, OriginalTaskbarAppBarState)) return false;
        if ((GetTaskbarAppBarState(taskbar) & ABS_AUTOHIDE)
            != (OriginalTaskbarAppBarState & ABS_AUTOHIDE))
            return false;
        HasOriginalTaskbarAppBarState = false;
        return true;
    }

    private static bool SetTaskbarAppBarState(IntPtr taskbar, uint state)
    {
        APPBARDATA data = NewAppBarData(taskbar, new RECT());
        data.lParam = new IntPtr(state);
        return SHAppBarMessage(ABM_SETSTATE, ref data) != UIntPtr.Zero;
    }

    public static bool RestoreExplorerTaskbar()
    {
        ShellWindowState state = GetExplorerShellState();
        IntPtr taskbarForState = state.Taskbars.Count > 0
            ? state.Taskbars[0]
            : IntPtr.Zero;
        if (!RestoreTaskbarAppBarState(taskbarForState)) return false;
        foreach (IntPtr taskbar in state.Taskbars)
        {
            if (!IsWindow(taskbar)) continue;
            bool originalVisibility;
            if (!ExplorerTaskbarVisibility.TryGetValue(taskbar, out originalVisibility)) continue;
            ShowWindow(taskbar, originalVisibility ? SW_SHOWNOACTIVATE : SW_HIDE);
            if (IsWindowVisible(taskbar) != originalVisibility) return false;
            ExplorerTaskbarVisibility.Remove(taskbar);
        }
        return true;
    }

    public static bool HideExplorerDesktopIcons()
    {
        ShellWindowState state = GetExplorerShellState();
        if (state.DesktopViews.Count == 0) return false;

        foreach (IntPtr desktopView in state.DesktopViews)
        {
            if (!IsWindow(desktopView)) continue;
            if (!ExplorerDesktopIconVisibility.ContainsKey(desktopView))
                ExplorerDesktopIconVisibility.Add(desktopView, IsWindowVisible(desktopView));
            ShowWindow(desktopView, SW_HIDE);
            if (IsWindowVisible(desktopView))
            {
                RestoreExplorerDesktopIcons();
                return false;
            }
        }
        return true;
    }

    public static bool RestoreExplorerDesktopIcons()
    {
        ShellWindowState state = GetExplorerShellState();
        foreach (IntPtr desktopView in state.DesktopViews)
        {
            if (!IsWindow(desktopView)) continue;
            bool originalVisibility;
            if (!ExplorerDesktopIconVisibility.TryGetValue(desktopView, out originalVisibility)) continue;
            ShowWindow(desktopView, originalVisibility ? SW_SHOWNOACTIVATE : SW_HIDE);
            if (IsWindowVisible(desktopView) != originalVisibility) return false;
            ExplorerDesktopIconVisibility.Remove(desktopView);
        }
        foreach (IntPtr desktopView in new List<IntPtr>(ExplorerDesktopIconVisibility.Keys))
            if (!IsWindow(desktopView)) ExplorerDesktopIconVisibility.Remove(desktopView);
        return true;
    }

    private static string GetDesktopWallpaper()
    {
        var wallpaper = new StringBuilder(32768);
        if (!SystemParametersInfo(SPI_GETDESKWALLPAPER, (uint)wallpaper.Capacity, wallpaper, 0))
            throw new InvalidOperationException("Could not read the Windows desktop wallpaper: " + Marshal.GetLastWin32Error());
        return wallpaper.ToString();
    }

    private static string FindWallpaperRegistryValueName(RegistryKey key)
    {
        foreach (string name in key.GetValueNames())
            if (string.Equals(name, "Wallpaper", StringComparison.OrdinalIgnoreCase))
                return name;
        return null;
    }

    private static bool TryGetWallpaperRegistryValue(out string value, out RegistryValueKind kind)
    {
        using (RegistryKey key = Registry.CurrentUser.OpenSubKey("Control Panel\\Desktop", false))
        {
            string name = key == null ? null : FindWallpaperRegistryValueName(key);
            if (name == null)
            {
                value = null;
                kind = RegistryValueKind.String;
                return false;
            }
            kind = key.GetValueKind(name);
            if (kind != RegistryValueKind.String && kind != RegistryValueKind.ExpandString)
                throw new InvalidOperationException("Unsupported registry type for the Windows wallpaper value: " + kind);
            value = Convert.ToString(key.GetValue(
                name, null, RegistryValueOptions.DoNotExpandEnvironmentNames
            ));
            return true;
        }
    }

    private static void SetWallpaperRegistryValue(string value, RegistryValueKind kind)
    {
        using (RegistryKey key = Registry.CurrentUser.CreateSubKey("Control Panel\\Desktop"))
        {
            if (key == null)
                throw new InvalidOperationException("Could not open the current-user desktop registry key");
            string name = FindWallpaperRegistryValueName(key) ?? "WallPaper";
            key.SetValue(name, value ?? string.Empty, kind);
        }
    }

    private static void RestoreWallpaperRegistryValue()
    {
        if (OriginalWallpaperRegistryValueExists)
        {
            SetWallpaperRegistryValue(
                OriginalWallpaperRegistryValue, OriginalWallpaperRegistryValueKind
            );
            return;
        }
        using (RegistryKey key = Registry.CurrentUser.OpenSubKey("Control Panel\\Desktop", true))
        {
            if (key != null)
            {
                string name = FindWallpaperRegistryValueName(key);
                if (name != null) key.DeleteValue(name, false);
            }
        }
    }

    private static bool IsWallpaperRegistryValueCleared()
    {
        string value;
        RegistryValueKind kind;
        return TryGetWallpaperRegistryValue(out value, out kind)
            && string.IsNullOrEmpty(value);
    }

    public static bool HideExplorerWallpaper()
    {
        if (!HasOriginalDesktopWallpaper)
        {
            OriginalDesktopWallpaper = GetDesktopWallpaper();
            OriginalWallpaperRegistryValueExists = TryGetWallpaperRegistryValue(
                out OriginalWallpaperRegistryValue, out OriginalWallpaperRegistryValueKind
            );
            HasOriginalDesktopWallpaper = true;
        }
        try
        {
            RegistryValueKind kind = OriginalWallpaperRegistryValueExists
                ? OriginalWallpaperRegistryValueKind
                : RegistryValueKind.String;
            SetWallpaperRegistryValue(string.Empty, kind);
            if (!SystemParametersInfo(
                SPI_SETDESKWALLPAPER, 0, string.Empty, SPIF_UPDATEINIFILE | SPIF_SENDCHANGE
            ))
                throw new InvalidOperationException("Could not disable the Windows desktop wallpaper: " + Marshal.GetLastWin32Error());
            SetWallpaperRegistryValue(string.Empty, kind);
            if (IsWallpaperRegistryValueCleared())
                return true;
            throw new InvalidOperationException("Windows did not apply the cleared desktop wallpaper setting");
        }
        catch
        {
            if (!RestoreExplorerWallpaper())
                throw new InvalidOperationException("Wallpaper disable failed and the original wallpaper could not be restored");
            throw;
        }
    }

    public static bool RestoreExplorerWallpaper()
    {
        if (!HasOriginalDesktopWallpaper) return true;
        if (!IsWallpaperRegistryValueCleared())
        {
            OriginalDesktopWallpaper = null;
            OriginalWallpaperRegistryValue = null;
            HasOriginalDesktopWallpaper = false;
            return true;
        }
        string wallpaperToRestore = OriginalWallpaperRegistryValueExists
            ? OriginalWallpaperRegistryValueKind == RegistryValueKind.ExpandString
                ? Environment.ExpandEnvironmentVariables(OriginalWallpaperRegistryValue)
                : OriginalWallpaperRegistryValue
            : OriginalDesktopWallpaper;
        RestoreWallpaperRegistryValue();
        if (!SystemParametersInfo(
            SPI_SETDESKWALLPAPER, 0, wallpaperToRestore ?? string.Empty, SPIF_SENDCHANGE
        ))
            return false;
        RestoreWallpaperRegistryValue();
        string registryValue;
        RegistryValueKind registryKind;
        bool registryValueExists = TryGetWallpaperRegistryValue(out registryValue, out registryKind);
        if (registryValueExists != OriginalWallpaperRegistryValueExists
            || (registryValueExists
                && (!string.Equals(registryValue, OriginalWallpaperRegistryValue, StringComparison.Ordinal)
                    || registryKind != OriginalWallpaperRegistryValueKind)))
            return false;
        if (!string.IsNullOrEmpty(wallpaperToRestore)
            && !string.Equals(
                GetDesktopWallpaper(), wallpaperToRestore, StringComparison.OrdinalIgnoreCase
            ))
            return false;
        OriginalDesktopWallpaper = null;
        OriginalWallpaperRegistryValue = null;
        HasOriginalDesktopWallpaper = false;
        return true;
    }

    public static bool IsExplorerWallpaperEnabled()
    {
        return !string.IsNullOrEmpty(GetDesktopWallpaper());
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

    private static bool SetAsShellBackground(IntPtr window, int x, int y, int width, int height)
    {
        int style = GetWindowLongPtr(window, GWL_STYLE).ToInt32();
        int windowControls = WS_CAPTION | WS_THICKFRAME | WS_SYSMENU | WS_MINIMIZEBOX | WS_MAXIMIZEBOX;
        int topLevelStyle = (style & ~(WS_CHILD | windowControls)) | WS_POPUP;
        SetLastError(0);
        IntPtr previousStyle = SetWindowLongPtr(window, GWL_STYLE, new IntPtr(topLevelStyle));
        int styleError = Marshal.GetLastWin32Error();
        if (previousStyle == IntPtr.Zero && styleError != 0)
            throw new InvalidOperationException("SetWindowLongPtr(GWL_STYLE) failed: " + styleError);

        SetLastError(0);
        IntPtr previousParent = SetParent(window, IntPtr.Zero);
        int parentError = Marshal.GetLastWin32Error();
        if (previousParent == IntPtr.Zero && parentError != 0)
        {
            SetWindowLongPtr(window, GWL_STYLE, new IntPtr(style));
            throw new InvalidOperationException("SetParent(NULL) failed: " + parentError);
        }

        IntPtr previousOwner = GetWindow(window, GW_OWNER);
        SetLastError(0);
        IntPtr previousWindowOwner = SetWindowLongPtr(window, GWL_HWNDPARENT, IntPtr.Zero);
        int ownerError = Marshal.GetLastWin32Error();
        if ((previousWindowOwner == IntPtr.Zero && ownerError != 0)
            || GetWindow(window, GW_OWNER) != IntPtr.Zero)
        {
            SetParent(window, previousParent);
            SetWindowLongPtr(window, GWL_STYLE, new IntPtr(style));
            if (previousOwner != IntPtr.Zero)
                SetWindowLongPtr(window, GWL_HWNDPARENT, previousOwner);
            throw new InvalidOperationException("Clearing the desktop window owner failed: " + ownerError);
        }

        SetLastError(0);
        IntPtr extendedStyle = GetWindowLongPtr(window, GWL_EXSTYLE);
        if ((extendedStyle.ToInt64() & WS_EX_TOPMOST) != 0)
        {
            SetLastError(0);
            IntPtr previousExtendedStyle = SetWindowLongPtr(
                window, GWL_EXSTYLE, new IntPtr(extendedStyle.ToInt64() & ~WS_EX_TOPMOST)
            );
            int extendedStyleError = Marshal.GetLastWin32Error();
            if (previousExtendedStyle == IntPtr.Zero && extendedStyleError != 0)
            {
                SetParent(window, previousParent);
                SetWindowLongPtr(window, GWL_STYLE, new IntPtr(style));
                if (previousOwner != IntPtr.Zero)
                    SetWindowLongPtr(window, GWL_HWNDPARENT, previousOwner);
                throw new InvalidOperationException("Clearing WS_EX_TOPMOST failed: " + extendedStyleError);
            }
        }

        bool positioned = SetWindowPos(
            window, new IntPtr(1), x, y, Math.Max(1, width), Math.Max(1, height),
            SWP_NOACTIVATE | 0x0020
        );
        if (!positioned)
        {
            int positionError = Marshal.GetLastWin32Error();
            SetParent(window, previousParent);
            SetWindowLongPtr(window, GWL_STYLE, new IntPtr(style));
            if (previousOwner != IntPtr.Zero)
                SetWindowLongPtr(window, GWL_HWNDPARENT, previousOwner);
            throw new InvalidOperationException("SetWindowPos(HWND_BOTTOM) failed: " + positionError);
        }

        RECT actual = new RECT();
        if (!GetWindowRect(window, out actual)
            || actual.Left != x || actual.Top != y
            || actual.Right - actual.Left != width
            || actual.Bottom - actual.Top != height)
        {
            throw new InvalidOperationException(
                "Desktop window bounds did not match the monitor: " +
                actual.Left + "," + actual.Top + " " +
                (actual.Right - actual.Left) + "x" + (actual.Bottom - actual.Top)
            );
        }
        return true;
    }

    private static bool CaptureOriginalWorkArea()
    {
        if (HasOriginalWorkArea) return true;
        RECT current = new RECT();
        if (!SystemParametersInfo(SPI_GETWORKAREA, 0, ref current, 0)) return false;
        OriginalWorkArea = current;
        HasOriginalWorkArea = true;
        return true;
    }

    private static bool ReserveWorkArea(RECT requested, RECT monitorBounds)
    {
        if (!CaptureOriginalWorkArea()) return false;
        if (requested.Left > monitorBounds.Left + 2
            || requested.Right < monitorBounds.Right - 2
            || requested.Top < monitorBounds.Top - 2)
            return false;
        RECT reserved = monitorBounds;
        reserved.Top = Math.Max(monitorBounds.Top, requested.Bottom);
        if (reserved.Top >= reserved.Bottom) return false;
        if (!SystemParametersInfo(SPI_SETWORKAREA, 0, ref reserved, SPIF_SENDCHANGE)) return false;
        WorkAreaReserved = true;
        return true;
    }

    private static bool RestoreWorkArea()
    {
        if (!HasOriginalWorkArea || !WorkAreaReserved)
        {
            HasOriginalWorkArea = false;
            WorkAreaReserved = false;
            return true;
        }

        RECT original = OriginalWorkArea;
        if (!SystemParametersInfo(SPI_SETWORKAREA, 0, ref original, SPIF_SENDCHANGE)) return false;
        HasOriginalWorkArea = false;
        WorkAreaReserved = false;
        return true;
    }

    private static bool IsWorkAreaReserved(RECT requested, RECT monitorBounds)
    {
        RECT current = new RECT();
        return SystemParametersInfo(SPI_GETWORKAREA, 0, ref current, 0)
            && current.Top >= requested.Bottom - 2
            && current.Bottom >= monitorBounds.Bottom - 2
            && current.Left <= requested.Left + 2
            && current.Right >= monitorBounds.Right - 2;
    }

    private static bool PositionFallbackDock(
        IntPtr window, RECT requested, RECT monitorBounds, int width, int height
    )
    {
        if (!ReserveWorkArea(requested, monitorBounds)) return false;
        if (SetWindowPos(
            window, new IntPtr(-1), requested.Left, requested.Top,
            Math.Max(1, width), Math.Max(1, height), SWP_NOACTIVATE
        ))
        {
            return true;
        }
        RestoreWorkArea();
        return false;
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
        RECT workArea = new RECT();
        if (!SystemParametersInfo(SPI_GETWORKAREA, 0, ref workArea, 0))
            throw new InvalidOperationException("Could not read the Windows work area: " + Marshal.GetLastWin32Error());
        return new {
            running = state.ProcessIds.Count > 0,
            taskbar = state.HasTaskbar,
            desktop = state.HasDesktop,
            taskbarVisible = IsAnyWindowVisible(state.Taskbars),
            taskbarAutoHide = state.Taskbars.Count > 0
                && (GetTaskbarAppBarState(state.Taskbars[0]) & ABS_AUTOHIDE) != 0,
            desktopIconsVisible = IsAnyWindowVisible(state.DesktopViews),
            wallpaperEnabled = IsExplorerWallpaperEnabled(),
            wallpaperRegistryDisabled = IsWallpaperRegistryValueCleared(),
            workArea = new {
                x = workArea.Left,
                y = workArea.Top,
                width = workArea.Right - workArea.Left,
                height = workArea.Bottom - workArea.Top
            },
            processIds = new List<int>(state.ProcessIds).ToArray()
        };
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

    public static bool StartExplorerShellVisible()
    {
        if (!StartExplorerShell()) return false;
        return ShowExplorerShellUi();
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
        IntPtr previousDpiContext = SetThreadDpiAwarenessContext(new IntPtr(-3));
        if (previousDpiContext == IntPtr.Zero)
        {
            throw new InvalidOperationException(
                "SetThreadDpiAwarenessContext failed: " +
                Marshal.GetLastWin32Error().ToString(CultureInfo.InvariantCulture)
            );
        }
        try
        {
            return SetDesktopWithMonitorBounds(hwnd, x, y, width, height);
        }
        finally
        {
            SetThreadDpiAwarenessContext(previousDpiContext);
        }
    }

    private static bool SetDesktopWithMonitorBounds(long hwnd, int x, int y, int width, int height)
    {
        IntPtr window = new IntPtr(hwnd);
        IntPtr monitor = MonitorFromWindow(window, MONITOR_DEFAULTTONEAREST);
        if (monitor == IntPtr.Zero)
            throw new InvalidOperationException("Could not locate the desktop window's monitor");
        MONITORINFO monitorInfo = new MONITORINFO {
            cbSize = Marshal.SizeOf(typeof(MONITORINFO))
        };
        if (!GetMonitorInfo(monitor, ref monitorInfo))
            throw new InvalidOperationException("GetMonitorInfo failed: " + Marshal.GetLastWin32Error());
        x = monitorInfo.rcMonitor.Left;
        y = monitorInfo.rcMonitor.Top;
        width = monitorInfo.rcMonitor.Right - x;
        height = monitorInfo.rcMonitor.Bottom - y;

        IntPtr progman = FindWindow("Progman", null);
        if (progman == IntPtr.Zero)
        {
            return SetAsShellBackground(window, x, y, width, height);
        }

        IntPtr worker = IntPtr.Zero;
        IntPtr messageResult;
        SendMessageTimeout(
            progman, 0x052C, new IntPtr(0xD), new IntPtr(1), 0, 1000, out messageResult
        );
        EnumWindows((candidate, unused) => {
            if (FindWindowEx(candidate, IntPtr.Zero, "SHELLDLL_DefView", null) != IntPtr.Zero)
            {
                worker = FindWindowEx(IntPtr.Zero, candidate, "WorkerW", null);
                return worker == IntPtr.Zero;
            }
            return true;
        }, IntPtr.Zero);
        IntPtr desktop = worker != IntPtr.Zero ? worker : progman;

        int style = GetWindowLongPtr(window, GWL_STYLE).ToInt32();
        int childStyle = (style | WS_CHILD) & ~WS_POPUP;
        SetLastError(0);
        IntPtr previousStyle = SetWindowLongPtr(window, GWL_STYLE, new IntPtr(childStyle));
        int styleError = Marshal.GetLastWin32Error();
        if (previousStyle == IntPtr.Zero && styleError != 0)
        {
            return SetAsShellBackground(window, x, y, width, height);
        }

        SetLastError(0);
        IntPtr previousParent = SetParent(window, desktop);
        int parentError = Marshal.GetLastWin32Error();
        if (previousParent == IntPtr.Zero && parentError != 0)
        {
            SetWindowLongPtr(window, GWL_STYLE, new IntPtr(style));
            return SetAsShellBackground(window, x, y, width, height);
        }
        if (GetParent(window) != desktop)
        {
            SetParent(window, previousParent);
            SetWindowLongPtr(window, GWL_STYLE, new IntPtr(style));
            return SetAsShellBackground(window, x, y, width, height);
        }
        POINT origin = new POINT { X = x, Y = y };
        if (!ScreenToClient(desktop, ref origin))
        {
            SetParent(window, previousParent);
            SetWindowLongPtr(window, GWL_STYLE, new IntPtr(style));
            return SetAsShellBackground(window, x, y, width, height);
        }
        bool positioned = SetWindowPos(
            window, IntPtr.Zero, origin.X, origin.Y, Math.Max(1, width), Math.Max(1, height),
            SWP_NOACTIVATE | 0x0020
        );
        if (positioned) return true;
        SetParent(window, previousParent);
        SetWindowLongPtr(window, GWL_STYLE, new IntPtr(style));
        return SetAsShellBackground(window, x, y, width, height);
    }

    public static bool SetDock(long hwnd, int x, int y, int width, int height)
    {
        IntPtr window = new IntPtr(hwnd);
        IntPtr monitor = MonitorFromWindow(window, MONITOR_DEFAULTTONEAREST);
        if (monitor == IntPtr.Zero)
            throw new InvalidOperationException("Could not locate the dock window's monitor");
        MONITORINFO monitorInfo = new MONITORINFO {
            cbSize = Marshal.SizeOf(typeof(MONITORINFO))
        };
        if (!GetMonitorInfo(monitor, ref monitorInfo))
            throw new InvalidOperationException("GetMonitorInfo failed: " + Marshal.GetLastWin32Error());

        x = monitorInfo.rcMonitor.Left;
        y = monitorInfo.rcMonitor.Top;
        width = monitorInfo.rcMonitor.Right - x;
        if (!CaptureOriginalWorkArea())
            throw new InvalidOperationException("Could not capture the original Windows work area");
        RECT monitorBounds = monitorInfo.rcMonitor;
        int requestedHeight = Math.Max(1, height);
        RECT requested = new RECT {
            Left = x, Top = y, Right = x + Math.Max(1, width), Bottom = y + requestedHeight
        };
        APPBARDATA data = NewAppBarData(window, requested);
        if (!AppBars.Contains(window))
        {
            if (SHAppBarMessage(ABM_NEW, ref data) == UIntPtr.Zero)
            {
                return PositionFallbackDock(window, requested, monitorBounds, width, requestedHeight);
            }
            AppBars.Add(window);
        }

        data = NewAppBarData(window, requested);
        if (SHAppBarMessage(ABM_QUERYPOS, ref data) == UIntPtr.Zero)
        {
            RemoveDock(hwnd);
            return PositionFallbackDock(window, requested, monitorBounds, width, requestedHeight);
        }
        data.rc = requested;
        if (SHAppBarMessage(ABM_SETPOS, ref data) == UIntPtr.Zero)
        {
            RemoveDock(hwnd);
            return PositionFallbackDock(window, requested, monitorBounds, width, requestedHeight);
        }
        bool workAreaReserved = ReserveWorkArea(requested, monitorBounds);
        bool positioned = SetWindowPos(
            window, new IntPtr(-1), requested.Left, requested.Top,
            width, requestedHeight,
            SWP_NOACTIVATE
        );
        RECT actual = new RECT();
        bool atRequestedBounds = GetWindowRect(window, out actual)
            && actual.Left == requested.Left
            && actual.Top == requested.Top
            && actual.Right - actual.Left == width
            && actual.Bottom - actual.Top == requestedHeight;
        if (positioned && atRequestedBounds && workAreaReserved
            && IsWorkAreaReserved(requested, monitorBounds)) return true;
        RemoveDock(hwnd);
        return PositionFallbackDock(window, requested, monitorBounds, width, requestedHeight);
    }

    public static bool ResetDock(long hwnd)
    {
        IntPtr window = new IntPtr(hwnd);
        if (!IsWindow(window)) return false;
        bool wasRegistered = AppBars.Contains(window);
        APPBARDATA data = NewAppBarData(window, new RECT());
        UIntPtr removed = SHAppBarMessage(ABM_REMOVE, ref data);
        AppBars.Remove(window);
        bool restored = RestoreWorkArea();
        return (!wasRegistered || removed != UIntPtr.Zero) && restored;
    }

    public static bool RemoveDock(long hwnd)
    {
        IntPtr window = new IntPtr(hwnd);
        bool wasRegistered = AppBars.Remove(window);
        bool removed = true;
        if (wasRegistered)
        {
            APPBARDATA data = NewAppBarData(window, new RECT());
            removed = SHAppBarMessage(ABM_REMOVE, ref data) != UIntPtr.Zero;
        }
        bool restored = RestoreWorkArea();
        return removed && restored;
    }

    public static bool ResetAllDockReservations()
    {
        bool removed = true;
        foreach (IntPtr window in new List<IntPtr>(AppBars))
        {
            APPBARDATA data = NewAppBarData(window, new RECT());
            if (SHAppBarMessage(ABM_REMOVE, ref data) == UIntPtr.Zero) removed = false;
        }
        AppBars.Clear();
        bool restored = RestoreWorkArea();
        return removed && restored;
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
            value = [string]$key.GetValue(
                $name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames
            )
            kind = $kind.ToString()
        }
    } finally {
        $key.Dispose()
    }
}

function Test-UserRegistrySnapshot($actual, $expected) {
    if ([bool]$actual.exists -ne [bool]$expected.exists) {
        return $false
    }
    if (-not $actual.exists) {
        return $true
    }
    return ([string]$actual.value -ceq [string]$expected.value) `
        -and ([string]$actual.kind -ceq [string]$expected.kind)
}

function Set-UserRegistrySnapshot($hive, $keyPath, $name, $snapshot) {
    $key = $hive.OpenSubKey($keyPath, $true)
    if (-not $snapshot.exists) {
        if ($null -eq $key) {
            return
        }
        try {
            if ($key.GetValueNames() -contains $name) {
                $key.DeleteValue($name, $false)
            }
        } finally {
            $key.Dispose()
        }
        return
    }

    if ($null -eq $key) {
        $key = $hive.CreateSubKey($keyPath)
    }
    if ($null -eq $key) {
        throw "Could not open registry key $keyPath for writing"
    }
    try {
        $kind = switch ([string]$snapshot.kind) {
            'String' { [Microsoft.Win32.RegistryValueKind]::String }
            'ExpandString' { [Microsoft.Win32.RegistryValueKind]::ExpandString }
            default { throw "Unsupported registry value kind for $name`: $($snapshot.kind)" }
        }
        $key.SetValue($name, [string]$snapshot.value, $kind)
    } finally {
        $key.Dispose()
    }
}

function Invoke-MachineShellPolicyAction($request) {
    if (-not $PipeName) {
        throw 'Machine shell policy changes require the elevated helper'
    }
    $principal = [Security.Principal.WindowsPrincipal]::new(
        [Security.Principal.WindowsIdentity]::GetCurrent()
    )
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Administrator approval is required to change the machine shell policy'
    }

    $machinePolicyPath = 'Software\Microsoft\Windows\CurrentVersion\Policies\System'
    $machineHive = [Microsoft.Win32.Registry]::LocalMachine
    $machineBefore = Get-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell'
    $backupPath = [System.IO.Path]::GetFullPath([string]$request.backupPath)
    $expectedBackupPath = [System.IO.Path]::GetFullPath(
        (Join-Path (Join-Path $env:ProgramData 'The_Omniscience') 'windows-shell-backup.json')
    )
    if (-not [string]::Equals(
        $backupPath, $expectedBackupPath, [System.StringComparison]::OrdinalIgnoreCase
    )) {
        throw 'Invalid shared shell backup path'
    }

    $backupDirectory = [System.IO.Path]::GetDirectoryName($backupPath)
    $previousBackupBytes = $null
    $backupExisted = [System.IO.File]::Exists($backupPath)
    if ($backupExisted) {
        $previousBackupBytes = [System.IO.File]::ReadAllBytes($backupPath)
    }
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
            if (-not $backupIsValid) {
                throw 'Invalid machine shell backup data'
            }

            [System.IO.Directory]::CreateDirectory($backupDirectory) | Out-Null
            $backupTemporaryPath = "$backupPath.$PID.tmp"
            $backupJson = ConvertTo-Json -InputObject $request.backup -Compress -Depth 10
            [System.IO.File]::WriteAllText(
                $backupTemporaryPath, $backupJson, [System.Text.UTF8Encoding]::new($false)
            )
            Move-Item -LiteralPath $backupTemporaryPath -Destination $backupPath -Force
            $backupWritten = $true

            $machineKey = $machineHive.CreateSubKey($machinePolicyPath)
            if ($null -eq $machineKey) {
                throw 'Could not open machine shell policy registry key'
            }
            try {
                $machineKey.SetValue(
                    'Shell', [string]$request.command, [Microsoft.Win32.RegistryValueKind]::String
                )
            } finally {
                $machineKey.Dispose()
            }

            $machineAfter = Get-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell'
            $applyVerified = $machineAfter.value -ceq [string]$request.command
            if (-not $applyVerified) {
                throw 'Machine shell policy update did not verify'
            }
        } elseif ($request.action -eq 'machine-shell-restore') {
            if (-not $machineBefore.exists -or $machineBefore.value -cne [string]$request.expectedCommand) {
                throw 'The machine-wide shell policy changed; refusing to restore over another shell'
            }
            if (-not $backupExisted) {
                throw 'The shared machine shell backup is missing'
            }
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
            if (-not $restoreVerified) {
                throw 'Machine shell policy restoration did not verify'
            }
        } elseif ($request.action -eq 'machine-shell-update') {
            if (-not $machineBefore.exists -or $machineBefore.value -cne [string]$request.expectedCommand) {
                throw 'The machine shell policy changed; refusing to update another shell'
            }
            if (-not $backupExisted) {
                throw 'The shared machine shell backup is missing'
            }
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
            [System.IO.File]::WriteAllText(
                $backupTemporaryPath, $backupJson, [System.Text.UTF8Encoding]::new($false)
            )
            Move-Item -LiteralPath $backupTemporaryPath -Destination $backupPath -Force
            $backupWritten = $true

            $machineKey = $machineHive.CreateSubKey($machinePolicyPath)
            if ($null -eq $machineKey) {
                throw 'Could not open machine shell policy registry key'
            }
            try {
                $machineKey.SetValue(
                    'Shell', [string]$request.command, [Microsoft.Win32.RegistryValueKind]::String
                )
            } finally {
                $machineKey.Dispose()
            }
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

function Invoke-MachineWinlogonShellAction($request) {
    if (-not $PipeName) {
        throw 'Machine Winlogon shell changes require the elevated helper'
    }
    $principal = [Security.Principal.WindowsPrincipal]::new(
        [Security.Principal.WindowsIdentity]::GetCurrent()
    )
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Administrator approval is required to change the machine Winlogon shell'
    }

    $machinePolicyPath = 'Software\Microsoft\Windows\CurrentVersion\Policies\System'
    $machineWinlogonPath = 'Software\Microsoft\Windows NT\CurrentVersion\Winlogon'
    $machineHive = [Microsoft.Win32.Registry]::LocalMachine
    $policyBefore = Get-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell'
    $winlogonBefore = Get-UserRegistrySnapshot $machineHive $machineWinlogonPath 'Shell'
    $backupPath = [System.IO.Path]::GetFullPath([string]$request.backupPath)
    $expectedBackupPath = [System.IO.Path]::GetFullPath(
        (Join-Path (Join-Path $env:ProgramData 'The_Omniscience') 'windows-shell-backup.json')
    )
    if (-not [string]::Equals(
        $backupPath, $expectedBackupPath, [System.StringComparison]::OrdinalIgnoreCase
    )) {
        throw 'Invalid shared shell backup path'
    }

    $backupExisted = [System.IO.File]::Exists($backupPath)
    $previousBackupBytes = $null
    if ($backupExisted) {
        $previousBackupBytes = [System.IO.File]::ReadAllBytes($backupPath)
    }
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
            if (-not $backupIsValid) {
                throw 'Invalid Winlogon shell backup data'
            }

            if ($null -eq $request.expectedPreviousBackup) {
                if ($backupExisted) {
                    throw 'An unexpected machine shell backup already exists'
                }
                if (-not (Test-UserRegistrySnapshot $policyBefore $request.backup.machinePolicyShell)) {
                    throw 'Original machine policy snapshot does not match the current registry'
                }
            } else {
                if (-not $backupExisted) {
                    throw 'The expected previous machine shell backup is missing'
                }
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
                        (Test-UserRegistrySnapshot $request.backup.machinePolicyShell $savedBackup.machinePolicyShell) -and
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
            [System.IO.File]::WriteAllText(
                $backupTemporaryPath, $backupJson, [System.Text.UTF8Encoding]::new($false)
            )
            Move-Item -LiteralPath $backupTemporaryPath -Destination $backupPath -Force
            $backupWritten = $true

            Set-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell' $request.backup.machinePolicyShell
            Set-UserRegistrySnapshot $machineHive $machineWinlogonPath 'Shell' @{
                exists = $true
                value = [string]$request.command
                kind = 'String'
            }
            $applyVerified = (Test-UserRegistrySnapshot `
                (Get-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell') `
                $request.backup.machinePolicyShell) -and
                ((Get-UserRegistrySnapshot $machineHive $machineWinlogonPath 'Shell').value -ceq [string]$request.command)
            if (-not $applyVerified) {
                throw 'Machine Winlogon shell update did not verify'
            }
        } elseif ($request.action -eq 'machine-winlogon-restore') {
            $backup = $request.backup
            $restoreStateMatches = ($backup.schemaVersion -eq 4) -and
                ($backup.scope -eq 'machine') -and
                ($winlogonBefore.value -ceq [string]$backup.command) -and
                (Test-UserRegistrySnapshot $policyBefore $backup.machinePolicyShell)
            if (-not $restoreStateMatches) {
                throw 'Machine shell values changed; refusing to restore over another shell'
            }
            if (-not $backupExisted) {
                throw 'The shared machine shell backup is missing'
            }
            $savedBackup = [System.Text.Encoding]::UTF8.GetString($previousBackupBytes) | ConvertFrom-Json
            $backupMatches = ($savedBackup.schemaVersion -eq 4) -and
                ($savedBackup.scope -eq 'machine') -and
                ($savedBackup.command -ceq [string]$backup.command) -and
                (Test-UserRegistrySnapshot $savedBackup.machinePolicyShell $backup.machinePolicyShell) -and
                (Test-UserRegistrySnapshot $savedBackup.machineWinlogonShell $backup.machineWinlogonShell)
            if (-not $backupMatches) {
                throw 'The shared Winlogon shell backup does not match the requested restore'
            }
            Set-UserRegistrySnapshot $machineHive $machineWinlogonPath 'Shell' $backup.machineWinlogonShell
            Set-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell' $backup.machinePolicyShell
            $restoreVerified = (Test-UserRegistrySnapshot `
                (Get-UserRegistrySnapshot $machineHive $machineWinlogonPath 'Shell') `
                $backup.machineWinlogonShell) -and
                (Test-UserRegistrySnapshot `
                    (Get-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell') `
                    $backup.machinePolicyShell)
            if (-not $restoreVerified) {
                throw 'Machine Winlogon shell restoration did not verify'
            }
        } else {
            throw "Unsupported machine Winlogon shell action: $($request.action)"
        }
        return $true
    } catch {
        $failure = $_
        try {
            Set-UserRegistrySnapshot $machineHive $machinePolicyPath 'Shell' $policyBefore
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
            'machine-shell-restore' { Invoke-MachineShellPolicyAction $request }
            'machine-winlogon-restore' { Invoke-MachineWinlogonShellAction $request }
            'explorer-shell-status' { [OmniWin32]::GetExplorerShellStatus() }
            'explorer-shell-start' { [OmniWin32]::StartExplorerShellVisible() }
            'taskbar-hide' { [OmniWin32]::HideExplorerTaskbar() }
            'taskbar-restore' { [OmniWin32]::RestoreExplorerTaskbar() }
            'desktop-icons-hide' { [OmniWin32]::HideExplorerDesktopIcons() }
            'desktop-icons-restore' { [OmniWin32]::RestoreExplorerDesktopIcons() }
            'desktop-wallpaper-hide' { [OmniWin32]::HideExplorerWallpaper() }
            'desktop-wallpaper-restore' { [OmniWin32]::RestoreExplorerWallpaper() }
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

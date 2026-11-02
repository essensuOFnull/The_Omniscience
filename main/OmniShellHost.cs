using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

internal static class OmniShellHost
{
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr FindWindow(string className, string windowName);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr FindWindowEx(IntPtr parent, IntPtr after, string className, string windowName);
    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hwnd, int command);

    private const int SW_SHOWNOACTIVATE = 4;

    private static bool RestoreExplorerDesktop()
    {
        IntPtr taskbar = FindWindow("Shell_TrayWnd", null);
        if (taskbar == IntPtr.Zero) return false;
        ShowWindow(taskbar, SW_SHOWNOACTIVATE);

        IntPtr programManager = FindWindow("Progman", null);
        IntPtr desktopView = programManager == IntPtr.Zero
            ? IntPtr.Zero
            : FindWindowEx(programManager, IntPtr.Zero, "SHELLDLL_DefView", null);
        if (desktopView != IntPtr.Zero) ShowWindow(desktopView, SW_SHOWNOACTIVATE);
        return IsWindowVisible(taskbar);
    }

    private static int Main(string[] args)
    {
        WriteLog("Shell host starting.");
        string executable = null;
        string appPath = null;
        for (int i = 0; i < args.Length; i++)
        {
            if (string.Equals(args[i], "--executable", StringComparison.OrdinalIgnoreCase)
                && i + 1 < args.Length)
            {
                executable = args[++i];
            }
            else if (string.Equals(args[i], "--app-path", StringComparison.OrdinalIgnoreCase)
                && i + 1 < args.Length)
            {
                appPath = args[++i];
            }
        }

        try
        {
            if (string.IsNullOrWhiteSpace(executable) || !File.Exists(executable))
            {
                throw new FileNotFoundException("The configured Electron executable was not found.", executable);
            }

            var startInfo = new ProcessStartInfo
            {
                FileName = executable,
                Arguments = string.IsNullOrWhiteSpace(appPath) ? string.Empty : QuoteArgument(appPath),
                WorkingDirectory = !string.IsNullOrWhiteSpace(appPath) && Directory.Exists(appPath)
                    ? appPath
                    : Path.GetDirectoryName(executable),
                UseShellExecute = true,
                Verb = "runas"
            };

            using (Process application = Process.Start(startInfo))
            {
                if (application == null)
                {
                    throw new InvalidOperationException("Windows did not start the Electron process.");
                }
                WriteLog("Elevated Electron process started with PID " + application.Id + ".");
                application.WaitForExit();
                WriteLog("Electron process exited with code " + application.ExitCode + ".");
            }
        }
        catch (Exception error)
        {
            WriteLog(error.ToString());
        }

        EnsureExplorer();
        return 0;
    }

    private static string QuoteArgument(string value)
    {
        var result = new StringBuilder("\"");
        int backslashes = 0;
        foreach (char character in value)
        {
            if (character == '\\')
            {
                backslashes++;
            }
            else if (character == '"')
            {
                result.Append('\\', backslashes * 2 + 1);
                result.Append(character);
                backslashes = 0;
            }
            else
            {
                result.Append('\\', backslashes);
                result.Append(character);
                backslashes = 0;
            }
        }
        result.Append('\\', backslashes * 2);
        result.Append('"');
        return result.ToString();
    }

    private static void EnsureExplorer()
    {
        IntPtr taskbar = FindWindow("Shell_TrayWnd", null);
        if (taskbar != IntPtr.Zero)
        {
            WriteLog(RestoreExplorerDesktop()
                ? "Explorer desktop and taskbar are visible; fallback skipped."
                : "Explorer taskbar exists but could not be made visible.");
            return;
        }

        try
        {
            WriteLog("Explorer taskbar is absent; starting Explorer fallback.");
            string explorerPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.Windows),
                "explorer.exe"
            );
            using (Process explorer = Process.Start(new ProcessStartInfo
            {
                FileName = explorerPath,
                UseShellExecute = false,
                CreateNoWindow = true
            }))
            {
                if (explorer == null)
                {
                    throw new InvalidOperationException("Windows did not start Explorer.");
                }
                for (int attempt = 0; attempt < 150; attempt++)
                {
                    if (RestoreExplorerDesktop())
                    {
                        WriteLog("Explorer desktop and taskbar appeared.");
                        return;
                    }
                    Thread.Sleep(100);
                }
                WriteLog("Explorer started, but its taskbar did not appear within 15 seconds.");
            }
        }
        catch (Exception error)
        {
            WriteLog("Could not start Explorer: " + error);
        }
    }

    private static void WriteLog(string message)
    {
        try
        {
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string logDirectory = Path.Combine(localAppData, "The_Omniscience");
            Directory.CreateDirectory(logDirectory);
            File.AppendAllText(
                Path.Combine(logDirectory, "shell-launcher.log"),
                DateTime.UtcNow.ToString("o") + " " + message + Environment.NewLine,
                new UTF8Encoding(false)
            );
        }
        catch
        {
        }
    }
}

export default function () {
  global.$.ipc_errorLogger();
  global.$.ipc_getAppsList();
  global.$.ipc_getConfig();
  global.$.ipc_registerWebview();
  global.$.ipc_reactDevToolsBridge();
  global.$.ipc_files();
  global.$.ipc_windowManager();
}
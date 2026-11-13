const APP_TYPES = new Set(['componentapp', 'webapp', 'extension']);

export function parseLauncherCommand(args = []) {
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--quit') return { type: 'quit' };
    if (args[index] === '--background') return { type: 'background' };
    if (args[index] !== '--launch-app') continue;

    const appType = args[index + 1];
    const appId = args[index + 2];
    if (!APP_TYPES.has(appType) || !appId) {
      return { type: 'invalid', reason: 'Expected --launch-app <componentapp|webapp|extension> <id>' };
    }
    return { type: 'launch-app', appType, appId };
  }
  return { type: 'background' };
}

export function getLaunchAppArgs(appType, appId) {
  if (!APP_TYPES.has(appType) || typeof appId !== 'string' || !appId) {
    throw new TypeError('Invalid Omniscience app shortcut target');
  }
  return ['--launch-app', appType, appId];
}

export function quoteDesktopExecArg(value) {
  const text = String(value).replace(/%/g, '%%');
  return `"${text.replace(/([\\\"`$])/g, '\\$1')}"`;
}

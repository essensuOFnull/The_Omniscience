const APP_TYPES = new Set(['componentapp', 'webapp', 'extension']);
const APP_TYPE_HINT = 'componentapp|webapp|extension';

function stripWrappingQuotes(token) {
  return token.replace(/^"(.*)"$/, '$1');
}

function splitQuotedTokens(text) {
  const matches = String(text).match(/"(?:\\.|[^"])*"|\S+/g);
  if (!matches) return [String(text)];
  return matches.map((token) => token.replace(/^"|"$/g, ''));
}

function toArgArray(args) {
  if (Array.isArray(args)) return args;
  if (typeof args === 'string') return [args];
  return [];
}

function normalizeArgs(rawArgs) {
  const args = toArgArray(rawArgs);
  const normalized = [];

  for (let index = 0; index < args.length; index += 1) {
    const raw = args[index];
    if (typeof raw !== 'string') {
      normalized.push(raw);
      continue;
    }

    const arg = stripWrappingQuotes(raw);

    // "--launch-app=..." либо целиком закавыченная строка "--launch-app webapp id"
    if (/^--launch-app(?:=|\s)/.test(arg)) {
      normalized.push(...splitQuotedTokens(arg));
      continue;
    }

    // "--launch-app" + склеенный токен "webapp id"
    if (arg === '--launch-app' && typeof args[index + 1] === 'string') {
      const next = stripWrappingQuotes(args[index + 1]);
      if (!APP_TYPES.has(next)) {
        const tokens = splitQuotedTokens(next);
        if (tokens.length > 1 && APP_TYPES.has(tokens[0])) {
          normalized.push(arg, ...tokens);
          index += 1; // съедаем склеенный токен, чтобы не было дублирования
          continue;
        }
      }
    }

    normalized.push(arg);
  }

  return normalized;
}

export function parseLauncherCommand(rawArgs = []) {
  const normalizedArgs = normalizeArgs(rawArgs);

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const arg = normalizedArgs[index];

    if (arg === '--quit') return { type: 'quit' };
    if (arg === '--background') return { type: 'background' };

    if (typeof arg === 'string' && arg.startsWith('--launch-app=')) {
      const value = arg.slice('--launch-app='.length);
      const separator = value.indexOf(':');
      const appType = separator === -1 ? value : value.slice(0, separator);
      const appId =
        separator === -1 ? normalizedArgs[index + 1] : value.slice(separator + 1);

      if (APP_TYPES.has(appType) && typeof appId === 'string' && appId.length > 0) {
        return { type: 'launch-app', appType, appId };
      }
      return {
        type: 'invalid',
        reason: `Expected --launch-app <${APP_TYPE_HINT}> <id>; received ${JSON.stringify(
          normalizedArgs.slice(index, index + 3),
        )}`,
      };
    }

    if (arg !== '--launch-app') continue;

    const appType = normalizedArgs[index + 1];
    const appId = normalizedArgs[index + 2];

    if (!APP_TYPES.has(appType) || typeof appId !== 'string' || appId.length === 0) {
      return {
        type: 'invalid',
        reason: `Expected --launch-app <${APP_TYPE_HINT}> <id>; received ${JSON.stringify(
          normalizedArgs.slice(index, index + 4),
        )}`,
      };
    }

    return { type: 'launch-app', appType, appId };
  }

  return { type: 'background' };
}

export function getLaunchAppArgs(appType, appId) {
  if (!APP_TYPES.has(appType) || typeof appId !== 'string' || !appId) {
    throw new TypeError('Invalid Omniscience app shortcut target');
  }
  // Возвращаем один аргумент, объединяя тип и ID через двоеточие.
  // Это защитит их от потери при передаче через ярлык и Electron.
  return [`--launch-app=${appType}:${appId}`];
}

export function quoteDesktopExecArg(value) {
  const text = String(value).replace(/%/g, '%%');
  return `"${text.replace(/([\\"`$])/g, '\\$1')}"`;
}
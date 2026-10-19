import { readFileSync } from 'fs';

// Кэш: pid → { ppid, comm, ts }. Читаем /proc/<pid>/stat.
// Сбрасываем раз в N секунд — процессы переиспользуют PID'ы, но не за 5с.
const CACHE_TTL_MS = 5000;
const pidCache = new Map();

function readProcPid(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    // Формат: pid (comm) state ppid ...
    // comm может содержать пробелы и скобки, поэтому ищем ПОСЛЕДНЮЮ ')'.
    const closeParen = stat.lastIndexOf(')');
    const rest = stat.slice(closeParen + 2).split(' ');
    // rest[0] = state, rest[1] = ppid
    const ppid = parseInt(rest[1], 10);
    const comm = stat.slice(stat.indexOf('(') + 1, closeParen);
    return { ppid: Number.isFinite(ppid) ? ppid : null, comm };
  } catch {
    return null;
  }
}

export function getPpid(pid) {
  if (!pid) return null;
  const cached = pidCache.get(pid);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.ppid;
  const info = readProcPid(pid);
  if (!info) return null;
  pidCache.set(pid, { ...info, ts: Date.now() });
  return info.ppid;
}

export function getComm(pid) {
  if (!pid) return null;
  const cached = pidCache.get(pid);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.comm;
  const info = readProcPid(pid);
  if (!info) return null;
  pidCache.set(pid, { ...info, ts: Date.now() });
  return info.comm;
}

// Идём вверх по PPID-цепочке от `pid` и ищем первый PID,
// который есть в множестве `knownPids`. Возвращает его или null.
//
// Себя и init(1) пропускаем.
export function findAncestorWindowPid(pid, knownPids) {
  if (!pid) return null;
  const known = new Set(knownPids.map(Number).filter(Boolean));
  if (!known.size) return null;

  let current = pid;
  const seen = new Set();

  while (current && current !== 1 && !seen.has(current)) {
    seen.add(current);
    current = getPpid(current);
    if (!current || current === 1) break;
    if (known.has(current) && current !== pid) return current;
  }
  return null;
}

// Для отладки: полная цепочка предков.
export function ancestorChain(pid, maxDepth = 16) {
  const out = [];
  let current = pid;
  while (current && current !== 1 && out.length < maxDepth) {
    out.push({ pid: current, comm: getComm(current) });
    current = getPpid(current);
  }
  return out;
}
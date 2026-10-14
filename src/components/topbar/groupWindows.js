// Строит дерево окон из плоского списка.
// Узел:
//   { id, roles:Set<string>, title, icon, focused, isHidden,
//     children:[...node], _window }
//
// roles — множество того, чем узел является ПО ОТНОШЕНИЮ К РОДИТЕЛЮ.
// Обычно одна роль, но бывает и несколько:
//   DevTools окна A = ['i','v']  (сам для A — инспектор, но у него тоже
//                                 есть UI, на который можно смотреть)
//   xterm эмулятор  = ['v']      (для родителя он view; процессы он
//                                 держит как своих p-детей)

const ORDER = { p: 0, v: 1, i: 2 };

function makeNode(w, roles) {
  return {
    id: w.id,
    roles: new Set(roles),
    title: w.title || w.kind || 'Окно',
    icon: w.icon || null,
    focused: !!w.focused,
    isHidden: !!w.isHidden,
    children: [],
    _window: w,
  };
}

export function buildWindowTree(windows = []) {
  const byId = new Map();
  const roots = [];

  // 1. Первый проход — потенциальные корни.
  for (const w of windows) {
    let roles;
    if (w.isBridgeOverlay) roles = ['i'];
    else if (w.isDevTools) roles = ['i', 'v'];  // DevTools может быть вложенным
    else roles = ['v'];

    const node = makeNode(w, roles);
    byId.set(w.id, node);
    roots.push(node);
  }

  // 2. Второй проход — цепляем детей к родителям.
  // 2. Второй проход — цепляем детей к родителям по разным правилам:
  //    - DevTools → его ownerBrowserWindow (по ownerId)
  //    - GTK-оверлей → его нативное GTK-окно (по gtkXid ↔ native.xid)
  //    - Окно-потомок процесса → его окно-предок (по parentXid)
  const stillRoot = [];
  for (const node of roots) {
    const w = node._window;

    // 2a. DevTools → BrowserWindow-владелец
    if (w.isDevTools && w.ownerId) {
      const parent = byId.get(w.ownerId);
      if (parent) { parent.children.push(node); continue; }
    }

    // 2b. GTK-оверлей → нативное GTK-окно по XID
    if (w.isBridgeOverlay && w.gtkXid) {
      const parent = byId.get(w.gtkXid);
      if (parent) { parent.children.push(node); continue; }
      node._orphan = true;
    }

    // 2c. Окно-потомок по PPID-цепочке → окно-предок
    //     parentXid — XID окна-предка (уже посчитан в ipc_topbar.js).
    if (w.parentXid) {
      const parent = byId.get(w.parentXid);
      if (parent) {
        // Роль — 'p' (у этого родителя я — его процесс-потомок).
        // Если у узла уже была роль 'v', она остаётся — узел многоролевой.
        node.roles.add('p');
        parent.children.push(node);
        continue;
      }
    }

    stillRoot.push(node);
  }

  // 3. Сортировка детей: p → v → i. Внутри одного типа — стабильно.
  const sortChildren = (node) => {
    node.children.sort((a, b) => {
      // Если у ребёнка несколько ролей, берём "главную" для сравнения:
      // наименее приоритетную из его набора (p важнее v важнее i).
      const ra = Math.min(...[...a.roles].map((r) => ORDER[r] ?? 9));
      const rb = Math.min(...[...b.roles].map((r) => ORDER[r] ?? 9));
      return ra - rb;
    });
    for (const c of node.children) sortChildren(c);
  };
  for (const r of stillRoot) sortChildren(r);

  return stillRoot;
}
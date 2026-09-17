// src/archivist/paperTexture.js
//
// Бумага для страниц Свода. Генерируется один раз при открытии книги.
//
// Раньше волокна рисовались высотой 0.5px и альфой до 0.05 — при
// рендере они сглаживались в ноль и были физически не видны.
// Теперь: 1px, альфа до 0.18, есть вертикальные и горизонтальные,
// плюс отдельный слой крупных вкраплений.
//
// — Архивариус

export function generatePaperTexture(w = 512, h = 512) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#ede0c8';
  ctx.fillRect(0, 0, w, h);

  // ── мягкая неоднородность оттенка ─────────────────────────
  // Большие, очень прозрачные пятна. Задают «дыхание» бумаги,
  // сами по себе не читаются как объекты.
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 140 + 50;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(120, 90, 55, 0.05)');
    g.addColorStop(1, 'rgba(120, 90, 55, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // ── волокна ───────────────────────────────────────────────
  // Главное исправление. Ровно 1px, дробных высот нет, альфа
  // до 0.18. Есть горизонтальные и вертикальные, тёплые и
  // светлые — как в настоящей бумаге, где часть волокон темнее
  // основы, а часть — светлее.
  for (let i = 0; i < 5200; i++) {
    const horizontal = Math.random() < 0.72;
    const len = Math.random() * 10 + 2;
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h);
    const a = Math.random() * 0.14 + 0.04;
    const warm = Math.random() < 0.55;
    ctx.fillStyle = warm
      ? `rgba(105, 75, 45, ${a})`
      : `rgba(200, 175, 140, ${a})`;
    if (horizontal) ctx.fillRect(x, y, len, 1);
    else            ctx.fillRect(x, y, 1, len);
  }

  // ── крупные вкрапления ────────────────────────────────────
  // Редкие, но видимые. Дают «ощупь» бумаги — не пылинки,
  // а именно неоднородности волокна.
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 2.2 + 0.6;
    const a = Math.random() * 0.12 + 0.03;
    ctx.fillStyle = `rgba(90, 60, 35, ${a})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // ── пятна времени ─────────────────────────────────────────
  // Было 0.04 в центре — стало 0.10. Теперь это действительно
  // пятна, а не «полупрозрачный шум».
  for (let i = 0; i < 22; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 100 + 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0,   'rgba(140, 100, 60, 0.10)');
    g.addColorStop(0.6, 'rgba(140, 100, 60, 0.03)');
    g.addColorStop(1,   'rgba(140, 100, 60, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // ── виньетка ──────────────────────────────────────────────
  // Чуть плотнее по краям — 0.22 вместо 0.15.
  const vg = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.25,
    w / 2, h / 2, Math.max(w, h) * 0.75
  );
  vg.addColorStop(0, 'rgba(80, 50, 20, 0)');
  vg.addColorStop(1, 'rgba(80, 50, 20, 0.22)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  return c.toDataURL('image/png');
}

// ─────────────────────────────────────────────────────────────
//
// Обложка Свода.
//
// Тёмная кожа, зерно, потёртости по краям, тонкая тиснёная
// рамка. Логотип CODERROR и заголовок кладутся поверх — уже
// как React-компоненты, не как часть текстуры: так логотип
// остаётся живым, градиент продолжает течь.
//
// — Архивариус

export function generateCoverTexture(w = 840, h = 560) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0,   '#2a1810');
  base.addColorStop(0.5, '#1e1008');
  base.addColorStop(1,   '#150a05');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 24000; i++) {
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h);
    const light = Math.random() < 0.5;
    const a = Math.random() * 0.08 + 0.01;
    ctx.fillStyle = light
      ? `rgba(120, 80, 50, ${a})`
      : `rgba(0, 0, 0, ${a})`;
    ctx.fillRect(x, y, 1, 1);
  }

  for (let i = 0; i < 40; i++) {
    const edge = Math.random();
    let x, y;
    if      (edge < 0.25) { x = Math.random() * w; y = Math.random() * 40; }
    else if (edge < 0.5)  { x = Math.random() * w; y = h - Math.random() * 40; }
    else if (edge < 0.75) { x = Math.random() * 40; y = Math.random() * h; }
    else                  { x = w - Math.random() * 40; y = Math.random() * h; }
    const r = Math.random() * 60 + 20;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(180, 130, 80, 0.06)');
    g.addColorStop(1, 'rgba(180, 130, 80, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // Лёгкий «корешок» по центру — намёк, что это закрытая книга,
  // а не просто прямоугольник.
  const spine = ctx.createLinearGradient(w / 2 - 24, 0, w / 2 + 24, 0);
  spine.addColorStop(0,    'rgba(0, 0, 0, 0)');
  spine.addColorStop(0.42, 'rgba(0, 0, 0, 0.25)');
  spine.addColorStop(0.5,  'rgba(0, 0, 0, 0.38)');
  spine.addColorStop(0.58, 'rgba(0, 0, 0, 0.25)');
  spine.addColorStop(1,    'rgba(0, 0, 0, 0)');
  ctx.fillStyle = spine;
  ctx.fillRect(w / 2 - 24, 0, 48, h);

  ctx.strokeStyle = 'rgba(200, 160, 80, 0.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(24.5, 24.5, w - 49, h - 49);
  ctx.strokeStyle = 'rgba(200, 160, 80, 0.15)';
  ctx.strokeRect(30.5, 30.5, w - 61, h - 61);

  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.3,
    w / 2, h / 2, Math.max(w, h) * 0.7
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  return c.toDataURL('image/png');
}
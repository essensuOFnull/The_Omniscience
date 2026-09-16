// src/archivist/paperTexture.js
export function generatePaperTexture(w = 512, h = 512) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#ede0c8';
  ctx.fillRect(0, 0, w, h);

  // волокна
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(120,90,60,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 3 + 0.5, 0.5);
  }

  // пятна
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = Math.random() * 80 + 20;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(140,100,60,0.04)');
    g.addColorStop(1, 'rgba(140,100,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // виньетка
  const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(80,50,20,0.15)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  return c.toDataURL('image/png');
}
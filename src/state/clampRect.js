export function clampRect(cx, cy, w, h, vp) {
  if (!isFinite(cx) || !isFinite(cy) || !isFinite(w) || !isFinite(h) || vp.width === 0 || vp.height === 0) {
    return { cx: vp.centerX, cy: vp.centerY, w: Math.min(w, vp.width), h: Math.min(h, vp.height) };
  }
  let newCx = cx, newCy = cy, newW = w, newH = h;
  if (newW > vp.width) { newW = vp.width; newCx = vp.width / 2; }
  else { if (newCx - newW / 2 < 0) newCx = newW / 2; if (newCx + newW / 2 > vp.width) newCx = vp.width - newW / 2; }
  if (newH > vp.height) { newH = vp.height; newCy = vp.height / 2; }
  else { if (newCy - newH / 2 < 0) newCy = newH / 2; if (newCy + newH / 2 > vp.height) newCy = vp.height - newH / 2; }
  return { cx: newCx, cy: newCy, w: newW, h: newH };
}
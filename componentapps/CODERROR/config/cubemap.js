// src/config/cubemap.js
// Порядок для THREE.CubeTextureLoader.load(urls):
//   [+X, -X, +Y, -Y, +Z, -Z]  ==  [right, left, top, bottom, front, back]
const BASE = '../../../componentapps/CODERROR/textures/MainMenu/cubemap/';

export const CUBEMAP_FACES = {
  right:  BASE + 'right.png',
  left:   BASE + 'left.png',
  top:    BASE + 'top.png',
  bottom: BASE + 'bottom.png',
  front:  BASE + 'front.png',
  back:   BASE + 'back.png',
};

// Если у тебя файлы пока называются px.png и т.п. — просто поменяй значения выше:
//   right: BASE + 'px.png', left: BASE + 'nx.png', ... и т.д.

export function facesToArray(faces) {
  return [
    faces.right,
    faces.left,
    faces.top,
    faces.bottom,
    faces.front,
    faces.back,
  ];
}
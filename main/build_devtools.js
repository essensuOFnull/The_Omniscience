import { build } from 'esbuild';
import path from 'path';
import { mkdir, copyFile } from 'fs/promises';

export default async function() {
  const rootDir = global.paths.projectRoot;
  const outDir = path.join(rootDir, 'dist', 'devtools');
  await mkdir(outDir, { recursive: true });

  await build({
    entryPoints: [path.join(rootDir, 'src', 'devtools', 'Main.jsx')],
    outfile: path.join(outDir, 'devtools.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    jsx: 'automatic',
    loader: { '.jsx': 'jsx', '.js': 'jsx' },
    minify: false,
    sourcemap: true,
    define: {
      'process.env.NODE_ENV': '"development"',
    },
    alias: {
      'react': 'react-exp',
      'react-dom': 'react-dom-exp',
    },
  });

  // 👇 Скопировать HTML из исходников в dist
  await copyFile(
    path.join(rootDir, 'src', 'devtools', 'index.html'),
    path.join(outDir, 'index.html'),
  );

  console.log('[devtools] bundle ready at', outDir);
}
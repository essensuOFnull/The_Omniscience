import { build } from 'esbuild';
import path from 'path';

export default async function buildFrameRuntime() {
  const rootDir = global.paths.projectRoot;
  const srcDir = global.paths.srcDir;
  const outfile = path.join(rootDir, '.temp', 'frame-runtime.js');

  await build({
    entryPoints: [path.join(srcDir, 'frame-runtime', 'Index.jsx')],
    outfile,
    bundle: true,
    format: 'iife',
    globalName: 'OmniFrame',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    sourcemap: false,
    jsx: 'automatic',
    loader: { '.jsx': 'jsx' },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });

  return outfile;
}
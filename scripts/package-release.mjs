import archiver from 'archiver';
import { createWriteStream } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const platform = process.argv[2];
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const extension = platform === 'win' ? 'exe' : platform === 'linux' ? 'AppImage' : null;

if (!extension) throw new Error(`Unsupported release platform: ${platform}`);

const artifactName = `Omniscience-${version}-${platform === 'win' ? 'win' : 'linux'}-x64.${extension}`;
const artifactPath = path.join(root, 'release', artifactName);
const archivePath = path.join(root, 'release', `Omniscience-${version}-${platform}-x64.zip`);
await access(artifactPath);

const appDirectories = ['componentapps', 'webapps', 'extensions'];
await Promise.all(appDirectories.map((directory) => access(path.join(root, directory))));

const output = createWriteStream(archivePath);
const archive = archiver('zip', { zlib: { level: 9 } });

await new Promise((resolve, reject) => {
  output.once('close', resolve);
  output.once('error', reject);
  archive.once('error', reject);
  archive.pipe(output);
  archive.file(artifactPath, { name: artifactName });
  for (const directory of appDirectories) {
    archive.directory(path.join(root, directory), directory);
  }
  archive.finalize().catch(reject);
});

console.log(`Created ${archivePath} (${archive.pointer()} bytes)`);

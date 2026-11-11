import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = resolve(root, 'public') + sep;
const assets = JSON.parse(readFileSync(new URL('../assets/yhc-design-assets.json', import.meta.url), 'utf8'));
for (const [relativePath, encoded] of Object.entries(assets)) {
  const destination = resolve(root, relativePath);
  if (!destination.startsWith(publicRoot) || typeof encoded !== 'string') throw new Error('Invalid design asset');
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, Buffer.from(encoded, 'base64'));
}

import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workshopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(workshopRoot, '..');
const assetsRoot = path.join(workshopRoot, 'public', 'assets');

await mkdir(path.join(assetsRoot, 'logos'), { recursive: true });
await cp(path.join(repositoryRoot, 'public', 'logo.png'), path.join(assetsRoot, 'logos', 'cityops.png'));
await cp(path.join(workshopRoot, 'content', 'github', 'images'), path.join(assetsRoot, 'images'), {
  recursive: true,
  force: true,
});

console.log('Prepared CityOps logo and workshop lesson images for local development and export.');

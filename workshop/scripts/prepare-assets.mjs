import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workshopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsRoot = path.join(workshopRoot, 'public', 'assets');

await mkdir(path.join(assetsRoot, 'logos'), { recursive: true });
await cp(path.join(workshopRoot, 'content', 'github', 'images'), path.join(assetsRoot, 'images'), {
  recursive: true,
  force: true,
});

// Warns off anyone who edits the copy: this folder is gitignored and overwritten every build.
await writeFile(
  path.join(assetsRoot, 'images', 'README.md'),
  [
    '# Generated folder — do not edit',
    '',
    'These files are copied from `workshop/content/github/images/` by',
    '`workshop/scripts/prepare-assets.mjs` on every `npm run dev` and `npm run build`.',
    'Anything you change here is silently overwritten on the next build, and the folder is',
    'gitignored so it can never be committed.',
    '',
    'Edit the originals in `workshop/content/github/images/` instead.',
    '',
    'The copy exists because Next.js only serves static assets from `public/`, while the',
    'lesson markdown references images relatively (`../images/foo.png`) so they also render',
    'when browsing the `.md` files on github.com.',
    '',
  ].join('\n'),
);

console.log('Prepared workshop lesson images for local development and export.');

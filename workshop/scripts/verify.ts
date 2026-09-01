import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { workshop } from '../lib/workshop-data';

const workshopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(workshopRoot, 'out');
const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? '';
const basePath = configuredBasePath === '/' ? '' : configuredBasePath.replace(/\/$/u, '');
const errors: string[] = [];

const routeFiles = [
  'index.html',
  ...workshop.tracks.map((track) => path.join('tracks', track.id, 'index.html')),
  ...workshop.modules.map((module) => path.join('modules', module.id, 'index.html')),
  ...workshop.lessons.map((lesson) => path.join('lessons', lesson.id, 'index.html')),
];

if (!fs.existsSync(outputRoot)) {
  console.error('Workshop artifact is missing. Run npm run build first.');
  process.exit(1);
}

for (const routeFile of routeFiles) {
  if (!fs.existsSync(path.join(outputRoot, routeFile)))
    errors.push(`missing expected content route ${routeFile.replaceAll(path.sep, '/')}`);
}

const htmlFiles: string[] = [];
function visit(directory: string): void {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(entryPath);
    else if (entry.name.endsWith('.html')) htmlFiles.push(entryPath);
  }
}
visit(outputRoot);

function resolveLocalTarget(value: string, sourceFile: string): string | null {
  const withoutSuffix = value.split(/[?#]/u)[0] ?? '';
  if (!withoutSuffix) return null;
  let localPath = withoutSuffix;
  if (basePath && (localPath === basePath || localPath.startsWith(`${basePath}/`)))
    localPath = localPath.slice(basePath.length) || '/';
  if (localPath.startsWith('/')) {
    const relative = localPath.replace(/^\/+/, '');
    let target = path.join(outputRoot, relative);
    if (localPath.endsWith('/')) target = path.join(target, 'index.html');
    return target;
  }
  let target = path.resolve(path.dirname(sourceFile), localPath);
  if (localPath.endsWith('/')) target = path.join(target, 'index.html');
  return target;
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const relativeFile = path.relative(outputRoot, file).replaceAll(path.sep, '/');
  const $ = load(html);
  if ($('script[src*="marked"]').length > 0 || html.includes('marked.parse(') || html.includes('fetch('))
    errors.push(`${relativeFile}: contains runtime Markdown rendering`);

  $('a[href], link[href], script[src], img[src]').each((_, element) => {
    const attribute = element.tagName === 'script' || element.tagName === 'img' ? 'src' : 'href';
    const value = $(element).attr(attribute);
    if (!value || /^(?:https?:|mailto:|data:|#)/iu.test(value)) return;
    const target = resolveLocalTarget(value, file);
    if (!target || fs.existsSync(target)) return;
    if (!path.extname(target) && fs.existsSync(path.join(target, 'index.html'))) return;
    errors.push(`${relativeFile}: missing local target ${value}`);
  });
}

if (routeFiles.length !== 64)
  errors.push(`verifier expected-route list has ${routeFiles.length} entries instead of 64`);
if (errors.length > 0) {
  console.error(`Workshop artifact verification failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    `Workshop artifact verified: all ${routeFiles.length} expected content route files are present; ${htmlFiles.length} total HTML files checked with resolved local links/assets and no runtime Markdown renderer.`,
  );
}

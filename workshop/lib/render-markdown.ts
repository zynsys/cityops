import fs from 'node:fs';
import path from 'node:path';
import { load, type CheerioAPI } from 'cheerio';
import MarkdownIt from 'markdown-it';
import markdownItTaskLists from 'markdown-it-task-lists';
import sanitizeHtml from 'sanitize-html';
import { withBasePath } from './base-path';
import { workshop, type WorkshopLesson } from './workshop-data';

const markdown = new MarkdownIt({ html: false, linkify: true, typographer: true }).use(markdownItTaskLists, {
  enabled: true,
  label: true,
});
const lessonBySource = new Map(
  workshop.lessons.map((lesson) => [path.normalize(lesson.sourcePath).toLowerCase(), lesson]),
);

function resolveContentUrl(url: string, lesson: WorkshopLesson): string {
  if (/^(?:[a-z]+:|#)/iu.test(url)) return url;
  if (url.startsWith('/')) return withBasePath(url);

  const [pathname = '', suffix = ''] = url.split(/(?=[?#])/u, 2);
  const absoluteTarget = path.resolve(path.dirname(lesson.sourcePath), decodeURIComponent(pathname));
  const linkedLesson = lessonBySource.get(path.normalize(absoluteTarget).toLowerCase());
  if (linkedLesson) return withBasePath(`${linkedLesson.url}${suffix}`);

  if (/\.(?:png|jpe?g|gif|svg|webp)$/iu.test(pathname)) {
    const imagesRoot = path.join(workshop.workshopRoot, 'content', 'github', 'images');
    const relativeImage = path.relative(imagesRoot, absoluteTarget);
    if (!relativeImage.startsWith('..') && !path.isAbsolute(relativeImage)) {
      return withBasePath(`/assets/images/${relativeImage.replaceAll(path.sep, '/')}${suffix}`);
    }
  }

  if (fs.existsSync(absoluteTarget)) {
    const repositoryPath = path
      .relative(path.resolve(workshop.workshopRoot, '..'), absoluteTarget)
      .replaceAll(path.sep, '/');
    const view = fs.statSync(absoluteTarget).isDirectory() ? 'tree' : 'blob';
    return `${workshop.repositoryUrl}/${view}/main/${encodeURI(repositoryPath)}${suffix}`;
  }

  return url;
}

function enhanceCallouts($: CheerioAPI): void {
  const callouts: Readonly<Record<string, readonly [string, string]>> = {
    NOTE: ['ℹ️', 'var(--neon-cyan)'],
    TIP: ['💡', 'var(--success-green)'],
    IMPORTANT: ['❗', 'var(--neon-purple)'],
    WARNING: ['⚠️', 'var(--warning-yellow)'],
    CAUTION: ['🔴', '#ff6b6b'],
  };
  $('blockquote').each((_, element) => {
    const blockquote = $(element);
    const firstParagraph = blockquote.children('p').first();
    const match = firstParagraph.text().match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/iu);
    if (!match?.[1]) return;
    const type = match[1].toUpperCase();
    const callout = callouts[type];
    if (!callout) return;
    const [icon, color] = callout;
    firstParagraph.html(
      (firstParagraph.html() ?? '').replace(/^\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:<br\s*\/?>)?\s*/iu, ''),
    );
    blockquote
      .addClass(`callout callout-${type.toLowerCase()}`)
      .attr('style', `border-left-color: ${color}`)
      .wrapInner('<div class="callout-body"></div>')
      .prepend(`<span class="callout-label" style="color: ${color}">${icon} ${type}</span>`);
  });
}

function enhanceCodeBlocks($: CheerioAPI): void {
  $('pre').each((index, element) => {
    const pre = $(element);
    const preview =
      pre
        .text()
        .split('\n')
        .find((line) => line.trim())
        ?.trim()
        .slice(0, 40) ?? '';
    const label = preview ? `Copy code block ${index + 1}: ${preview}` : `Copy code block ${index + 1}`;
    pre.wrap('<div class="code-block"></div>');
    pre.before(
      `<button type="button" class="copy-code-btn" data-copy-state="idle" aria-label="${label.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">Copy</button>`,
    );
  });
}

export function renderMarkdown(lesson: WorkshopLesson): string {
  const source = fs.readFileSync(lesson.sourcePath, 'utf8');
  const $ = load(`<main id="lesson-content">${markdown.render(source)}</main>`, null, false);
  $('#lesson-content a[href], #lesson-content img[src]').each((_, element) => {
    const attribute = element.tagName === 'a' ? 'href' : 'src';
    const value = $(element).attr(attribute);
    if (value) $(element).attr(attribute, resolveContentUrl(value, lesson));
  });
  enhanceCallouts($);
  enhanceCodeBlocks($);

  return sanitizeHtml($('#lesson-content').html() ?? '', {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'input']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['class', 'id', 'aria-label', 'style', 'data-copy-state'],
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      input: ['type', 'checked', 'aria-label'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedStyles: {
      '*': {
        'border-left-color': [/^(?:var\(--[a-z-]+\)|#[0-9a-f]{6})$/iu],
        color: [/^(?:var\(--[a-z-]+\)|#[0-9a-f]{6})$/iu],
      },
    },
  });
}

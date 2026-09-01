'use client';

import { useEffect, useRef } from 'react';

interface LessonContentProps {
  readonly html: string;
}

export function LessonContent({ html }: LessonContentProps): React.JSX.Element {
  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    async function handleClick(event: MouseEvent): Promise<void> {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>('.copy-code-btn');
      if (!button || !article?.contains(button)) return;
      const code = button.parentElement?.querySelector('pre code');
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code.textContent ?? '');
        button.textContent = 'Copied!';
        button.dataset.copyState = 'copied';
      } catch {
        button.textContent = 'Copy failed';
        button.dataset.copyState = 'error';
      }
      window.setTimeout(() => {
        button.textContent = 'Copy';
        button.dataset.copyState = 'idle';
      }, 2000);
    }

    article.addEventListener('click', handleClick);
    return () => article.removeEventListener('click', handleClick);
  }, []);

  return <article ref={articleRef} className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}

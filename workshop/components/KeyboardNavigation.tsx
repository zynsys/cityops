'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardNavigationProps {
  readonly previousUrl: string | null;
  readonly nextUrl: string | null;
}

export function KeyboardNavigation({ previousUrl, nextUrl }: KeyboardNavigationProps): null {
  const router = useRouter();
  useEffect(() => {
    function navigate(event: KeyboardEvent): void {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === 'ArrowLeft' && previousUrl) router.push(previousUrl);
      if (event.key === 'ArrowRight' && nextUrl) router.push(nextUrl);
    }
    document.addEventListener('keydown', navigate);
    return () => document.removeEventListener('keydown', navigate);
  }, [nextUrl, previousUrl, router]);
  return null;
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Master AI-Powered DevOps with CityOps',
  description: 'Choose GitHub or Azure DevOps and follow a sequential AI-powered DevOps workshop using CityOps.',
};

// Runs before paint so the stored theme is applied without a flash of the default theme.
const themeScript = `try{document.documentElement.dataset.theme=localStorage.getItem('theme')==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? '';
const basePath = configuredBasePath === '/' ? '' : configuredBasePath.replace(/\/$/u, '');

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath || undefined,
  // Pin the workspace root: without this, Next.js infers the parent
  // CityOps repo root (two lockfiles present) and resolves `@/*` imports
  // and file tracing against the wrong project.
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;

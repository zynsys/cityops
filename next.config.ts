import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  reactCompiler: true,
  images: {
    // Report attachments served from Azure Blob Storage (STORAGE_PROVIDER=azure).
    remotePatterns: [{ protocol: 'https', hostname: '*.blob.core.windows.net' }],
  },
};

export default nextConfig;

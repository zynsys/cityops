const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? '';
export const basePath = configuredBasePath === '/' ? '' : configuredBasePath.replace(/\/$/u, '');

export function withBasePath(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return value;
  return `${basePath}${value}`;
}

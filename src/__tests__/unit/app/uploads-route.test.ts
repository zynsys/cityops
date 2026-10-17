// @vitest-environment node
import { Readable } from 'stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const readAttachment = vi.hoisted(() => vi.fn());
vi.mock('@/lib/storage', () => ({ readAttachment }));

import { GET } from '@/app/uploads/[...path]/route';

const OLD_ENV = process.env;

function call(path: string[]) {
  return GET(new Request(`http://localhost/uploads/${path.join('/')}`), { params: Promise.resolve({ path }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...OLD_ENV, STORAGE_PROVIDER: 'azure' };
});

afterEach(() => {
  process.env = OLD_ENV;
});

describe('GET /uploads/[...path]', () => {
  it('returns 404 without reading storage when STORAGE_PROVIDER is local', async () => {
    process.env.STORAGE_PROVIDER = 'local';

    const res = await call(['42', 'a.jpg']);

    expect(res.status).toBe(404);
    expect(readAttachment).not.toHaveBeenCalled();
  });

  it('returns 404 when the attachment is missing or the name is invalid', async () => {
    readAttachment.mockResolvedValueOnce(null);

    const res = await call(['..', 'secret']);

    expect(res.status).toBe(404);
    expect(readAttachment).toHaveBeenCalledWith('../secret');
  });

  it('streams images inline with immutable caching and hardening headers', async () => {
    readAttachment.mockResolvedValueOnce({
      body: Readable.from([Buffer.from([1, 2, 3])]),
      contentType: 'image/png',
      contentLength: 3,
    });

    const res = await call(['42', 'x.png']);

    expect(res.status).toBe(200);
    expect(readAttachment).toHaveBeenCalledWith('42/x.png');
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('content-disposition')).toBe('inline');
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-length')).toBe('3');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('forces non-image content to download as octet-stream', async () => {
    readAttachment.mockResolvedValueOnce({
      body: Readable.from([Buffer.from('<script>')]),
      contentType: 'text/html',
    });

    const res = await call(['42', 'x.html']);

    expect(res.headers.get('content-type')).toBe('application/octet-stream');
    expect(res.headers.get('content-disposition')).toBe('attachment');
    expect(res.headers.get('content-security-policy')).toContain('sandbox');
  });
});

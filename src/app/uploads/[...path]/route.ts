import { Readable } from 'stream';
import { NextResponse } from 'next/server';
import { readAttachment } from '@/lib/storage';

// Serves report and avatar attachments from private Azure Blob Storage. Locally
// (STORAGE_PROVIDER=local) the same /uploads/... paths are static files in public/.
// Access matches the previous public-blob behaviour: anyone with the unguessable URL can view it.
const INLINE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if ((process.env.STORAGE_PROVIDER ?? 'local') !== 'azure') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { path } = await params;
  const attachment = await readAttachment(path.join('/'));
  if (!attachment) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const isImage = INLINE_IMAGE_TYPES.has(attachment.contentType);
  const headers = new Headers({
    'Content-Type': isImage ? attachment.contentType : 'application/octet-stream',
    'Content-Disposition': isImage ? 'inline' : 'attachment',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  });
  if (attachment.contentLength !== undefined) {
    headers.set('Content-Length', String(attachment.contentLength));
  }

  const body = Readable.toWeb(attachment.body as Readable) as ReadableStream<Uint8Array>;
  return new Response(body, { status: 200, headers });
}

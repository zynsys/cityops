import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Liveness + DB round-trip target for pipeline smoke tests and App Service's platform health
// check (see infra/modules/appservice.bicep healthCheckPath). Must stay cheap — no auth, no data.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}

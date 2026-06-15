import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBearerToken, verifyAuthToken } from '@/lib/auth';

export async function POST(req: Request) {
  const token = getBearerToken(req.headers);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await verifyAuthToken(token);
  if (!auth?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // TODO: call score provider and upsert fixtures.
  await prisma.fixtureSyncLog.create({
    data: {
      providerName: process.env.SCORE_PROVIDER_URL ? 'external-score-provider' : 'placeholder',
      success: false,
      message: 'Score sync not yet wired to a real provider',
    },
  });

  return NextResponse.json({ ok: false, message: 'Provider sync not implemented yet' }, { status: 501 });
}

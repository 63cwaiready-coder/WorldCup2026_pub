import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBearerToken, verifyAuthToken } from '@/lib/auth';
import { settleFixture } from '@/lib/service';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = getBearerToken(req.headers);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await verifyAuthToken(token);
  if (!auth?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await settleFixture(id);
    const fixture = await prisma.fixture.findUnique({ where: { id } });
    return NextResponse.json({ ok: true, fixture });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Settlement failed' }, { status: 400 });
  }
}

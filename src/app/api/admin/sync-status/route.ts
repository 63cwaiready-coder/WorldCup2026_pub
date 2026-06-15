import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const last = await prisma.fixtureSyncLog.findFirst({ orderBy: { syncedAt: 'desc' } });
  return NextResponse.json({ lastSync: last ?? null });
}

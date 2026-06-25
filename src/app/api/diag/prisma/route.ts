import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function hasEnv(name: string) {
  return Boolean(process.env[name]);
}

export async function GET() {
  const modelChecks = {
    user: Boolean((prisma as any).user),
    fixture: Boolean((prisma as any).fixture),
    bid: Boolean((prisma as any).bid),
    tokenLedger: Boolean((prisma as any).tokenLedger),
    fixtureSyncLog: Boolean((prisma as any).fixtureSyncLog),
  };

  const prismaKeys = Object.keys(prisma as any).filter((key) => !key.startsWith('$')).sort();

  return NextResponse.json({
    ok: true,
    runtime: process.env.NEXT_RUNTIME ?? 'nodejs',
    env: {
      DATABASE_URL: hasEnv('DATABASE_URL'),
      POSTGRES_PRISMA_URL: hasEnv('POSTGRES_PRISMA_URL'),
      POSTGRES_URL_NON_POOLING: hasEnv('POSTGRES_URL_NON_POOLING'),
      POSTGRES_URL: hasEnv('POSTGRES_URL'),
      NEON_DATABASE_URL: hasEnv('NEON_DATABASE_URL'),
    },
    modelChecks,
    prismaKeys,
  });
}

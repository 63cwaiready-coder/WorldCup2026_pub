import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const fixtures = await prisma.fixture.findMany({ orderBy: { kickoffAt: 'asc' } });
  return NextResponse.json({ fixtures });
}

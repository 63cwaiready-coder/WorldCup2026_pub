import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const fixture = await prisma.fixture.findUnique({ where: { id } });
  if (!fixture) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ fixture });
}

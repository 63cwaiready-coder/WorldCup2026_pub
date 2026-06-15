import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getBearerToken, verifyAuthToken } from '@/lib/auth';
import { placeBid } from '@/lib/service';

const schema = z.object({
  bidType: z.enum(['RESULT', 'SCORE']),
  predictedResult: z.enum(['HOME', 'AWAY', 'DRAW']).optional(),
  predictedHomeScore: z.number().int().nonnegative().optional(),
  predictedAwayScore: z.number().int().nonnegative().optional(),
});

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = getBearerToken(req.headers);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await verifyAuthToken(token);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bids = await prisma.bid.findMany({ where: { fixtureId: id, userId: auth.userId } });
  return NextResponse.json({ bids });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = getBearerToken(req.headers);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await verifyAuthToken(token);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  try {
    const bid = await placeBid({
      userId: auth.userId,
      fixtureId: id,
      bidType: parsed.data.bidType,
      predictedResult: parsed.data.predictedResult,
      predictedHomeScore: parsed.data.predictedHomeScore,
      predictedAwayScore: parsed.data.predictedAwayScore,
    });
    return NextResponse.json({ bid }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to place bid' }, { status: 400 });
  }
}

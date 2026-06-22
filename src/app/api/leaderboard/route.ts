import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const limitParam = new URL(req.url).searchParams.get('limit');
  const limit = Math.min(Math.max(Number(limitParam ?? 50) || 50, 1), 50);

  const players: Array<{ id: string; displayName: string | null; currentTokens: number }> =
    await prisma.user.findMany({
      orderBy: { currentTokens: 'desc' },
      take: limit,
      select: { id: true, displayName: true, currentTokens: true },
    });

  let currentRank = 0;
  let previousTokens: number | null = null;

  return NextResponse.json({
    leaderboard: players.map((player, index) => {
      if (previousTokens !== player.currentTokens) {
        currentRank = index + 1;
        previousTokens = player.currentTokens;
      }

      return {
        id: player.id,
        nickname: player.displayName ?? 'Player',
        currentTokens: player.currentTokens,
        rank: currentRank,
      };
    }),
  });
}

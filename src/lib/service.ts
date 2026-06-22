import { prisma } from './prisma';
import { evaluateExactScoreBid, evaluateResultBid } from './rules';

export async function getCurrentBalance(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { currentTokens: true } });
  return user?.currentTokens ?? null;
}

export async function placeBid(params: {
  userId: string;
  fixtureId: string;
  bidType: 'RESULT' | 'SCORE';
  predictedResult?: 'HOME' | 'AWAY' | 'DRAW';
  predictedHomeScore?: number;
  predictedAwayScore?: number;
}) {
  const fixture = await prisma.fixture.findUnique({ where: { id: params.fixtureId } });
  if (!fixture) throw new Error('Fixture not found');
  if (fixture.kickoffAt <= new Date()) throw new Error('Bidding is closed for this fixture');

  return prisma.$transaction(async (tx: any) => {
    const user = await tx.user.findUnique({ where: { id: params.userId } });
    if (!user) throw new Error('User not found');
    if (user.currentTokens < 10) throw new Error('Insufficient tokens');

    const bid = await tx.bid.create({
      data: {
        userId: params.userId,
        fixtureId: params.fixtureId,
        bidType: params.bidType,
        predictedResult: params.predictedResult,
        predictedHomeScore: params.predictedHomeScore,
        predictedAwayScore: params.predictedAwayScore,
        costTokens: 10,
      },
    });

    const balanceAfter = user.currentTokens - 10;
    await tx.user.update({ where: { id: params.userId }, data: { currentTokens: balanceAfter } });
    await tx.tokenLedger.create({
      data: {
        userId: params.userId,
        fixtureId: params.fixtureId,
        bidId: bid.id,
        entryType: 'BID_COST',
        amount: -10,
        balanceAfter,
        note: `Bid placed for ${params.bidType}`,
      },
    });

    return bid;
  });
}

export async function settleFixture(fixtureId: string) {
  const fixture = await prisma.fixture.findUnique({
    where: { id: fixtureId },
    include: { bids: true },
  });
  if (!fixture) throw new Error('Fixture not found');
  if (fixture.homeScore == null || fixture.awayScore == null) throw new Error('Fixture score not ready');

  return prisma.$transaction(async (tx: any) => {
    for (const bid of fixture.bids) {
      if (bid.status !== 'PENDING') continue;
      const user = await tx.user.findUnique({ where: { id: bid.userId } });
      if (!user) continue;

      let winAmount = 0;
      let won = false;

      if (bid.bidType === 'RESULT' && bid.predictedResult) {
        won = evaluateResultBid(bid.predictedResult as 'HOME' | 'AWAY' | 'DRAW', fixture.homeScore!, fixture.awayScore!);
        if (won) winAmount = 20;
      }

      if (bid.bidType === 'SCORE' && bid.predictedHomeScore != null && bid.predictedAwayScore != null) {
        won = evaluateExactScoreBid(bid.predictedHomeScore, bid.predictedAwayScore, fixture.homeScore!, fixture.awayScore!);
        if (won) winAmount = 60;
      }

      if (won) {
        const balanceAfter = user.currentTokens + winAmount;
        await tx.user.update({ where: { id: user.id }, data: { currentTokens: balanceAfter } });
        await tx.tokenLedger.create({
          data: {
            userId: user.id,
            fixtureId: fixture.id,
            bidId: bid.id,
            entryType: bid.bidType === 'RESULT' ? 'RESULT_WIN' : 'SCORE_WIN',
            amount: winAmount,
            balanceAfter,
            note: 'Winning bid settled',
          },
        });
      }

      await tx.bid.update({
        where: { id: bid.id },
        data: { status: won ? 'WON' : 'LOST', settledAt: new Date() },
      });
    }

    return true;
  });
}

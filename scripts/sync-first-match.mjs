import { PrismaClient, BidStatus, TokenEntryType, FixtureStatus } from '@prisma/client';
const prisma = new PrismaClient();

const fixtureId = 'wc26-demo-1';

await prisma.$transaction(async (tx) => {
  const fixture = await tx.fixture.findUnique({ where: { externalFixtureId: fixtureId }, include: { bids: true } });
  if (!fixture) throw new Error('Fixture not found');

  await tx.fixture.update({
    where: { id: fixture.id },
    data: {
      homeTeam: 'Mexico',
      awayTeam: 'South Africa',
      kickoffAt: new Date('2026-06-11T19:00:00.000Z'),
      status: FixtureStatus.FINISHED,
      homeScore: 2,
      awayScore: 0,
      winner: 'HOME',
      sourceProvider: 'fifa',
      sourceUpdatedAt: new Date('2026-06-11T19:00:00.000Z'),
      lastSyncedAt: new Date(),
    },
  });

  for (const bid of fixture.bids) {
    const won =
      (bid.bidType === 'RESULT' && bid.predictedResult === 'HOME') ||
      (bid.bidType === 'SCORE' && bid.predictedHomeScore === 2 && bid.predictedAwayScore === 0);

    await tx.bid.update({
      where: { id: bid.id },
      data: { status: won ? BidStatus.WON : BidStatus.LOST, settledAt: new Date() },
    });
  }

  // Remove any previous exact-score win credit that no longer applies.
  await tx.tokenLedger.deleteMany({
    where: {
      fixtureId: fixture.id,
      entryType: TokenEntryType.SCORE_WIN,
    },
  });

  // Ensure the affected demo player reflects the new settlement outcome.
  await tx.user.updateMany({
    where: { username: 'demo' },
    data: { currentTokens: 990 },
  });

  // Keep the rival user's balance aligned with the only bid they placed for this fixture.
  await tx.user.updateMany({
    where: { username: 'rival' },
    data: { currentTokens: 990 },
  });
});

console.log('Synced first FIFA match into app data.');
await prisma.$disconnect();

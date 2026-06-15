const hashedPassword = await bcrypt.hash('password123', 10);

const users = new Map();
for (const seedUser of SEED_USERS) {
  const user = await tx.user.create({
    data: {
      username: seedUser.username,
      displayName: seedUser.displayName,
      passwordHash: hashedPassword,
      currentTokens: seedUser.currentTokens,
      startingTokens: 1000,
      isAdmin: seedUser.isAdmin,
    },
  });
  users.set(seedUser.username, user);
  await tx.tokenLedger.create({
    data: {
      userId: user.id,
      entryType: TokenEntryType.INITIAL_BONUS,
      amount: 1000,
      balanceAfter: 1000,
      note: 'Initial token allocation',
    },
  });
}

const [finishedFixture, upcomingFixture1, upcomingFixture2] = await Promise.all(
  FIXTURES.map((fixture) => tx.fixture.create({ data: fixture })),
);

const demoUser = users.get('demo');
const rivalUser = users.get('rival');

const demoBid = await tx.bid.create({
  data: {
    userId: demoUser.id,
    fixtureId: finishedFixture.id,
    bidType: BidType.SCORE,
    predictedHomeScore: 2,
    predictedAwayScore: 1,
    costTokens: 10,
    status: BidStatus.LOST,
    placedAt: new Date(finishedFixture.kickoffAt.getTime() - 12 * 60 * 60 * 1000),
    lockedAt: finishedFixture.kickoffAt,
    settledAt: new Date(),
  },
});

await tx.tokenLedger.create({
  data: {
    userId: demoUser.id,
    fixtureId: finishedFixture.id,
    bidId: demoBid.id,
    entryType: TokenEntryType.BID_COST,
    amount: -10,
    balanceAfter: 990,
    note: 'Bid placed for SCORE',
  },
});

const rivalBid = await tx.bid.create({
  data: {
    userId: rivalUser.id,
    fixtureId: finishedFixture.id,
    bidType: BidType.RESULT,
    predictedResult: 'AWAY',
    costTokens: 10,
    status: BidStatus.LOST,
    placedAt: new Date(finishedFixture.kickoffAt.getTime() - 10 * 60 * 60 * 1000),
    lockedAt: finishedFixture.kickoffAt,
    settledAt: new Date(),
  },
});

await tx.tokenLedger.create({
  data: {
    userId: rivalUser.id,
    fixtureId: finishedFixture.id,
    bidId: rivalBid.id,
    entryType: TokenEntryType.BID_COST,
    amount: -10,
    balanceAfter: 990,
    note: 'Bid placed for RESULT',
  },
});

await tx.fixture.updateMany({
  where: { id: { in: [finishedFixture.id, upcomingFixture1.id, upcomingFixture2.id] } },
  data: { lastSyncedAt: new Date('2026-06-15T07:30:10.394Z'), sourceProvider: 'fifa' },
});

import { PrismaClient, FixtureStatus } from '@prisma/client';

const prisma = new PrismaClient();

const syncedAt = new Date();
const fixtures = [
  {
    externalFixtureId: 'fifa-2026-06-15-germany-curacao',
    competition: 'World Cup 2026',
    stage: 'First Stage',
    homeTeam: 'Germany',
    awayTeam: 'Curaçao',
    kickoffAt: new Date('2026-06-15T00:00:00.000Z'),
    status: FixtureStatus.FINISHED,
    homeScore: 7,
    awayScore: 1,
    winner: 'HOME',
    sourceProvider: 'fifa',
    sourceUpdatedAt: syncedAt,
    lastSyncedAt: syncedAt,
  },
  {
    externalFixtureId: 'fifa-2026-06-15-netherlands-japan',
    competition: 'World Cup 2026',
    stage: 'First Stage',
    homeTeam: 'Netherlands',
    awayTeam: 'Japan',
    kickoffAt: new Date('2026-06-15T02:00:00.000Z'),
    status: FixtureStatus.FINISHED,
    homeScore: 2,
    awayScore: 2,
    winner: 'DRAW',
    sourceProvider: 'fifa',
    sourceUpdatedAt: syncedAt,
    lastSyncedAt: syncedAt,
  },
  {
    externalFixtureId: 'fifa-2026-06-15-cote-divoire-ecuador',
    competition: 'World Cup 2026',
    stage: 'First Stage',
    homeTeam: "Côte d'Ivoire",
    awayTeam: 'Ecuador',
    kickoffAt: new Date('2026-06-15T04:00:00.000Z'),
    status: FixtureStatus.FINISHED,
    homeScore: 1,
    awayScore: 0,
    winner: 'HOME',
    sourceProvider: 'fifa',
    sourceUpdatedAt: syncedAt,
    lastSyncedAt: syncedAt,
  },
  {
    externalFixtureId: 'fifa-2026-06-15-sweden-tunisia',
    competition: 'World Cup 2026',
    stage: 'First Stage',
    homeTeam: 'Sweden',
    awayTeam: 'Tunisia',
    kickoffAt: new Date('2026-06-15T06:00:00.000Z'),
    status: FixtureStatus.FINISHED,
    homeScore: 5,
    awayScore: 1,
    winner: 'HOME',
    sourceProvider: 'fifa',
    sourceUpdatedAt: syncedAt,
    lastSyncedAt: syncedAt,
  },
];

async function main() {
  const results = [];
  for (const fixture of fixtures) {
    const saved = await prisma.fixture.upsert({
      where: { externalFixtureId: fixture.externalFixtureId },
      create: fixture,
      update: {
        competition: fixture.competition,
        stage: fixture.stage,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        kickoffAt: fixture.kickoffAt,
        status: fixture.status,
        homeScore: fixture.homeScore,
        awayScore: fixture.awayScore,
        winner: fixture.winner,
        sourceProvider: fixture.sourceProvider,
        sourceUpdatedAt: fixture.sourceUpdatedAt,
        lastSyncedAt: fixture.lastSyncedAt,
      },
    });
    results.push(saved);
  }

  await prisma.fixtureSyncLog.create({
    data: {
      providerName: 'fifa',
      success: true,
      message: 'Synced 4 finished World Cup 2026 fixtures from FIFA scores page',
      rawPayload: {
        fixtures: results.map((fixture) => ({
          externalFixtureId: fixture.externalFixtureId,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          homeScore: fixture.homeScore,
          awayScore: fixture.awayScore,
          status: fixture.status,
        })),
      },
    },
  });

  console.log(JSON.stringify({ synced: results.length, fixtures: results.map((fixture) => ({
    externalFixtureId: fixture.externalFixtureId,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
    status: fixture.status,
  })) }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

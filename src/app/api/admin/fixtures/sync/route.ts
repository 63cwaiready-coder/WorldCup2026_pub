import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { settleFixture } from '@/lib/service';
import { formatTournamentCutoffHkt, getTournamentCutoffDate } from '@/lib/tournament';
import { fetchEspnFifaWorldCupFixtures, isEspnFifaWorldCupUrl } from '@/lib/espn';

type IncomingFixture = {
  externalFixtureId: string;
  competition?: string;
  stage?: string | null;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  status: 'UPCOMING' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | string;
  homeScore?: number | null;
  awayScore?: number | null;
  winner?: string | null;
  sourceUpdatedAt?: string | null;
};

type ProviderPayload = {
  fixtures?: IncomingFixture[];
  data?: IncomingFixture[];
};

function isCronAllowed(req: Request) {
  if (req.headers.get('x-vercel-cron') === '1') return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('x-cron-secret');
  return Boolean(header && header === secret);
}

function normalizeStatus(value: string): 'UPCOMING' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' {
  const upper = value.toUpperCase();
  if (upper === 'LIVE' || upper === 'FINISHED' || upper === 'POSTPONED' || upper === 'CANCELLED') return upper;
  return 'UPCOMING';
}

export async function GET(req: Request) {
  if (!isCronAllowed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (new Date() >= getTournamentCutoffDate()) {
    await prisma.fixtureSyncLog.create({
      data: {
        providerName: 'cutoff',
        success: true,
        message: `Sync disabled after World Cup 2026 cutoff on ${formatTournamentCutoffHkt()}`,
      },
    });
    return NextResponse.json({ ok: true, skipped: true, message: 'Tournament ended; sync disabled' });
  }

  const providerUrl = process.env.SCORE_PROVIDER_URL?.trim() || '/api/providers/espn';
  const providerFetchUrl = new URL(providerUrl, req.url).toString();

  try {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (process.env.SCORE_PROVIDER_API_KEY) {
      headers.authorization = `Bearer ${process.env.SCORE_PROVIDER_API_KEY}`;
    }

    const isEspn = isEspnFifaWorldCupUrl(providerUrl) || isEspnFifaWorldCupUrl(providerFetchUrl);
    let rawPayload: Prisma.InputJsonValue;
    let fixtures: IncomingFixture[];

    if (isEspn) {
      const espn = await fetchEspnFifaWorldCupFixtures();
      rawPayload = espn.rawPayload as Prisma.InputJsonValue;
      fixtures = espn.fixtures;
    } else {
      const response = await fetch(providerFetchUrl, { headers, cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Provider returned ${response.status}`);
      }
      rawPayload = (await response.json()) as Prisma.InputJsonValue;
      const providerPayload = rawPayload as ProviderPayload;
      fixtures = providerPayload.fixtures ?? providerPayload.data ?? [];
    }

    const settled: string[] = [];

    for (const incoming of fixtures) {
      const kickoffAt = new Date(incoming.kickoffAt);
      const sourceUpdatedAt = incoming.sourceUpdatedAt ? new Date(incoming.sourceUpdatedAt) : new Date();
      const fixtureData = {
        competition: incoming.competition ?? 'World Cup 2026',
        stage: incoming.stage ?? null,
        homeTeam: incoming.homeTeam,
        awayTeam: incoming.awayTeam,
        kickoffAt,
        status: normalizeStatus(incoming.status),
        homeScore: incoming.homeScore ?? null,
        awayScore: incoming.awayScore ?? null,
        winner: incoming.winner ?? null,
        sourceProvider: providerUrl,
        sourceUpdatedAt,
        lastSyncedAt: new Date(),
      };const existing = await prisma.fixture.findFirst({
        where: {
          competition: fixtureData.competition,
          homeTeam: fixtureData.homeTeam,
          awayTeam: fixtureData.awayTeam,
          kickoffAt: fixtureData.kickoffAt,
        },
      });

      const saved = existing
        ? await prisma.fixture.update({
            where: { id: existing.id },
            data: fixtureData,
          })
        : await prisma.fixture.upsert({
            where: { externalFixtureId: incoming.externalFixtureId },
            create: {
              externalFixtureId: incoming.externalFixtureId,
              ...fixtureData,
            },
            update: fixtureData,
          });

      if (saved.status === 'FINISHED' && saved.homeScore != null && saved.awayScore != null) {
        await settleFixture(saved.id);
        settled.push(saved.externalFixtureId);
      }
    }

    await prisma.fixtureSyncLog.create({
      data: {
        providerName: providerFetchUrl,
        success: true,
        message: `Synced ${fixtures.length} fixtures; settled ${settled.length}`,
        rawPayload: rawPayload as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true, synced: fixtures.length, settled });
  } catch (error) {
    await prisma.fixtureSyncLog.create({
      data: {
        providerName: providerFetchUrl,
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      },
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 },
    );
  }
        }

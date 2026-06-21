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

type EspnCompetitor = {
  homeAway?: 'home' | 'away';
  score?: string | number | null;
  winner?: boolean;
  team?: {
    displayName?: string | null;
    location?: string | null;
    nickname?: string | null;
  } | null;
};

type EspnEvent = {
  id?: string;
  date?: string;
  season?: {
    type?: {
      abbreviation?: string | null;
    } | null;
  } | null;
  competitions?: Array<{
    startDate?: string;
    altGameNote?: string | null;
    status?: {
      type?: {
        state?: string | null;
        completed?: boolean | null;
      } | null;
    } | null;
    competitors?: EspnCompetitor[];
  }>;
};

type EspnScoreboardPayload = {
  events?: EspnEvent[];
};

const ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const ESPN_SCOREBOARD_RE = /(?:site\.api\.espn\.com\/apis\/site\/v2\/sports\/soccer\/fifa\.world\/scoreboard|espn\.com\/soccer\/scoreboard\/_\/league\/fifa\.world)/i;
const ESPN_TOURNAMENT_DATES = '20260611-20260720';

function slugTeamName(name: string) {
  return name
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function buildFixtureId(kickoffAt: string, homeTeam: string, awayTeam: string) {
  const datePart = new Date(kickoffAt).toISOString().slice(0, 10);
  return `fifa-${datePart}-${slugTeamName(homeTeam)}-${slugTeamName(awayTeam)}`;
}

function normalizeEspnScoreboard(payload: EspnScoreboardPayload): IncomingFixture[] {
  const events = payload.events ?? [];

  return events.flatMap((event) => {
    const competition = event.competitions?.[0];
    if (!competition) return [];

    const competitors = competition.competitors ?? [];
    const home = competitors.find((competitor) => competitor.homeAway === 'home');
    const away = competitors.find((competitor) => competitor.homeAway === 'away');
    if (!home || !away) return [];

    const homeTeam = home.team?.displayName ?? home.team?.location ?? home.team?.nickname;
    const awayTeam = away.team?.displayName ?? away.team?.location ?? away.team?.nickname;
    if (!homeTeam || !awayTeam) return [];

    const kickoffAt = competition.startDate ?? event.date;
    if (!kickoffAt) return [];

    const completed = Boolean(competition.status?.type?.completed || competition.status?.type?.state === 'post');
    const live = competition.status?.type?.state === 'in';
    const status = completed ? 'FINISHED' : live ? 'LIVE' : 'UPCOMING';
    const homeScore = completed || live ? (home.score == null ? null : Number(home.score)) : null;
    const awayScore = completed || live ? (away.score == null ? null : Number(away.score)) : null;
    const winner = completed
      ? home.winner
        ? 'HOME'
        : away.winner
          ? 'AWAY'
          : homeScore != null && awayScore != null && homeScore === awayScore
            ? 'DRAW'
            : null
      : null;

    return [{
      externalFixtureId: buildFixtureId(kickoffAt, homeTeam, awayTeam),
      competition: 'World Cup 2026',
      stage: competition.altGameNote ?? event.season?.type?.abbreviation ?? null,
      homeTeam,
      awayTeam,
      kickoffAt,
      status,
      homeScore,
      awayScore,
      winner,
      sourceUpdatedAt: new Date().toISOString(),
    }];
  });
}

export function isEspnFifaWorldCupUrl(providerUrl: string) {
  return ESPN_SCOREBOARD_RE.test(providerUrl);
}

export async function fetchEspnFifaWorldCupFixtures() {
  const url = new URL(ESPN_SCOREBOARD_URL);
  url.searchParams.set('dates', ESPN_TOURNAMENT_DATES);
  url.searchParams.set('limit', '950');

  const response = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`ESPN returned ${response.status}`);
  }

  const payload = (await response.json()) as EspnScoreboardPayload;
  return {
    fixtures: normalizeEspnScoreboard(payload),
    rawPayload: payload,
  };
}

export type { IncomingFixture, EspnScoreboardPayload };

export const DEFAULT_TOURNAMENT_CUTOFF_AT = '2026-07-20T16:00:00.000Z';

export function getTournamentCutoffAt() {
  return process.env.NEXT_PUBLIC_TOURNAMENT_CUTOFF_AT?.trim() || DEFAULT_TOURNAMENT_CUTOFF_AT;
}

export function getTournamentCutoffDate() {
  return new Date(getTournamentCutoffAt());
}

export function isTournamentPastCutoff(now = Date.now()) {
  return now >= getTournamentCutoffDate().getTime();
}

export function formatTournamentCutoffHkt() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Hong_Kong',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(getTournamentCutoffDate()) + ' GMT+8';
}

# World Cup 2026 betting game

## Score provider

The app can sync final scores from ESPN through the local adapter:

- Local adapter: `http://localhost:3000/api/providers/espn`
- ESPN scoreboard source: `https://www.espn.com/soccer/scoreboard/_/league/fifa.world`

The sync job stops at the tournament cutoff. By default that's:

- `2026-07-21 00:00 GMT+8`
- stored in code as `2026-07-20T16:00:00.000Z`

You can override it with `NEXT_PUBLIC_TOURNAMENT_CUTOFF_AT`.

## Env

Set:

- `SCORE_PROVIDER_URL=http://localhost:3000/api/providers/espn`

or point it to your deployed `/api/providers/espn` route.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

type Health = { ok: boolean; service: string };
type LeaderboardEntry = { id: string; nickname: string; currentTokens: number; rank: number };
type Me = {
  id: string;
  username: string;
  displayName: string | null;
  currentTokens: number;
  isAdmin?: boolean;
};

type FixtureStatus = 'UPCOMING' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
type BidType = 'RESULT' | 'SCORE';
type BidStatus = 'PENDING' | 'WON' | 'LOST' | 'VOID';
type ResultPrediction = 'HOME' | 'AWAY' | 'DRAW';

type Bid = {
  id: string;
  bidType: BidType;
  predictedResult: ResultPrediction | null;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  status: BidStatus;
  costTokens: number;
};

type Fixture = {
  id: string;
  competition: string;
  stage: string | null;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  status: FixtureStatus;
  homeScore: number | null;
  awayScore: number | null;
  winner: string | null;
  myBids?: Bid[];
};

type Draft = {
  bidType: BidType;
  predictedResult: ResultPrediction;
  predictedHomeScore: string;
  predictedAwayScore: string;
};

const emptyDraft = (): Draft => ({
  bidType: 'RESULT',
  predictedResult: 'HOME',
  predictedHomeScore: '',
  predictedAwayScore: '',
});

const TOURNAMENT_CUTOFF = new Date('2026-07-20T16:00:00.000Z'); // 2026-07-21 00:00 GMT+8

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data as T;
}

function money(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatHKT(dateString: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function bidLabel(bid: Bid) {
  if (bid.bidType === 'RESULT') return `Result: ${bid.predictedResult ?? '-'}`;
  return `Score: ${bid.predictedHomeScore ?? '-'}-${bid.predictedAwayScore ?? '-'}`;
}

export default function Page() {
  const [health, setHealth] = useState<Health | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ username: '', displayName: '', password: '' });
  const [bidDrafts, setBidDrafts] = useState<Record<string, Draft>>({});

  const refreshAll = useCallback(
    async (authToken?: string | null) => {
      const [healthData, fixturesData, leaderboardData] = await Promise.all([
        requestJson<Health>('/api/health'),
        requestJson<{ fixtures: Fixture[] }>('/api/fixtures'),
        requestJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard'),
      ]);

      setHealth(healthData);
      setLeaderboard(leaderboardData.leaderboard);
      setFixtures(fixturesData.fixtures);

      if (authToken) {
        const meData = await requestJson<{ user: Me }>('/api/me', {
          headers: { authorization: `Bearer ${authToken}` },
        });
        setMe(meData.user);

        const withBids = await Promise.all(
          fixturesData.fixtures.map(async (fixture) => {
            try {
              const bidsData = await requestJson<{ bids: Bid[] }>(`/api/fixtures/${fixture.id}/bids`, {
                headers: { authorization: `Bearer ${authToken}` },
              });
              return { ...fixture, myBids: bidsData.bids };
            } catch {
              return { ...fixture, myBids: [] };
            }
          }),
        );
        setFixtures(withBids);
      } else {
        setMe(null);
        setFixtures(fixturesData.fixtures.map((fixture) => ({ ...fixture, myBids: [] })));
      }
    },
    [],
  );

  useEffect(() => {
    const saved = window.localStorage.getItem('world-cup-token');
    if (saved) setToken(saved);
    void refreshAll(saved);
  }, [refreshAll]);

  const tournamentEnded = Date.now() >= TOURNAMENT_CUTOFF.getTime();
  const upcomingFixtures = useMemo(
    () => fixtures.filter((fixture) => fixture.status === 'UPCOMING' || new Date(fixture.kickoffAt).getTime() > Date.now()),
    [fixtures],
  );
  const finishedFixtures = useMemo(() => fixtures.filter((fixture) => fixture.status === 'FINISHED'), [fixtures]);
  const sortedLeaderboard = useMemo(() => [...leaderboard].sort((a, b) => a.rank - b.rank), [leaderboard]);

  async function submitAuth() {
    setBusy('auth');
    setMessage(null);
    try {
      if (authMode === 'register' && !authForm.displayName.trim()) {
        throw new Error('Please enter a display name');
      }

      const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
      const payload =
        authMode === 'login'
          ? { username: authForm.username.trim(), password: authForm.password }
          : { username: authForm.username.trim(), displayName: authForm.displayName.trim(), password: authForm.password };

      const data = await requestJson<{ token: string; user: Me }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      window.localStorage.setItem('world-cup-token', data.token);
      setToken(data.token);
      setMe(data.user);
      setMessage(`Signed in as ${data.user.displayName || data.user.username}`);
      await refreshAll(data.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setBusy(null);
    }
  }

  async function placeBid(fixtureId: string) {
    const draft = bidDrafts[fixtureId] ?? emptyDraft();
    setBusy(fixtureId);
    setMessage(null);

    try {
      const payload =
        draft.bidType === 'RESULT'
          ? { bidType: 'RESULT' as const, predictedResult: draft.predictedResult }
          : {
              bidType: 'SCORE' as const,
              predictedHomeScore: Number(draft.predictedHomeScore),
              predictedAwayScore: Number(draft.predictedAwayScore),
            };

      await requestJson<{ bid: Bid }>(`/api/fixtures/${fixtureId}/bids`, {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
        body: JSON.stringify(payload),
      });

      setMessage('Bid placed. Nice one.');
      await refreshAll(token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not place bid');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '32px 20px 60px',
        background: 'linear-gradient(180deg, #020617 0%, #0f172a 50%, #111827 100%)',
        color: '#e2e8f0',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 24 }}>
        <header
          style={{
            padding: 24,
            borderRadius: 24,
            background: 'rgba(15, 23, 42, 0.82)',
            border: '1px solid rgba(148, 163, 184, 0.16)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 14, color: '#94a3b8' }}>World Cup 2026 Bidding Game</div>
              <h1 style={{ margin: '8px 0 6px', fontSize: 34 }}>Build your picks, follow the leaderboard</h1>
              <p style={{ margin: 0, color: '#cbd5e1', maxWidth: 760 }}>
                Public demo app with login, register, fixture list, live bidding, and token leaderboard.
              </p>
            </div>
            <button
              onClick={() => void refreshAll(token)}
              style={{
                alignSelf: 'start',
                cursor: 'pointer',
                border: '1px solid rgba(148, 163, 184, 0.24)',
                borderRadius: 999,
                padding: '10px 16px',
                background: 'rgba(30, 41, 59, 0.95)',
                color: '#e2e8f0',
              }}
            >
              Refresh
            </button>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', color: '#cbd5e1', fontSize: 14 }}>
            <span>Service: {health?.service || 'loadingâ€¦'}</span>
            <span>â€¢</span>
            <span>Status: {health?.ok ? 'OK' : 'unknown'}</span>
            <span>â€¢</span>
            <span>Logged in: {me ? 'yes' : 'no'}</span>
          </div>
          {message && <div style={{ marginTop: 14, color: '#fcd34d' }}>{message}</div>}
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(0, 1.4fr)', gap: 20 }}>
          <section
            style={{
              padding: 24,
              borderRadius: 24,
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.16)',
              alignSelf: 'start',
            }}
          >
            <h2 style={{ marginTop: 0 }}>{me ? 'Your account' : 'Sign in / create account'}</h2>

            {me ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ padding: 16, borderRadius: 16, background: 'rgba(30, 41, 59, 0.9)' }}>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>Signed in as</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{me.displayName || me.username}</div>
                  <div style={{ marginTop: 4, color: '#cbd5e1' }}>Username: {me.username}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <StatCard label="Tokens" value={money(me.currentTokens)} />
                  <StatCard label="Role" value={me.isAdmin ? 'Admin' : 'Player'} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                <input
                  value={authForm.username}
                  onChange={(e) => setAuthForm((current) => ({ ...current, username: e.target.value }))}
                  placeholder="Username"
                  style={inputStyle}
                />
                {authMode === 'register' && (
                  <input
                    value={authForm.displayName}
                    onChange={(e) => setAuthForm((current) => ({ ...current, displayName: e.target.value }))}
                    placeholder="Display name"
                    style={inputStyle}
                  />
                )}
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm((current) => ({ ...current, password: e.target.value }))}
                  placeholder="Password"
                  style={inputStyle}
                />
                <button
                  onClick={() => void submitAuth()}
                  disabled={busy === 'auth'}
                  style={primaryButton}
                >
                  {busy === 'auth' ? 'Workingâ€¦' : authMode === 'login' ? 'Sign in' : 'Create account'}
                </button>
                <button
                  onClick={() => setAuthMode((m) => (m === 'login' ? 'register' : 'login'))}
                  style={secondaryButton}
                >
                  Switch to {authMode === 'login' ? 'register' : 'login'}
                </button>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  Demo seed password is often <code>password123</code> if the repo was seeded that way.
                </div>
              </div>
            )}
          </section>

          <section style={{ display: 'grid', gap: 20 }}>
            <section style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Leaderboard</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                {sortedLeaderboard.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{entry.rank}. {entry.nickname}</div>
                      <div style={{ fontSize: 13, color: '#94a3b8' }}>Shared rank for equal tokens</div>
                    </div>
                    <div style={{ fontWeight: 800 }}>{money(entry.currentTokens)}</div>
                  </div>
                ))}
                {sortedLeaderboard.length === 0 && <div style={{ color: '#94a3b8' }}>No leaderboard data yet.</div>}
              </div>
            </section>

            <section style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>How it works</h2>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#cbd5e1', lineHeight: 1.7 }}>
                <li>Every player starts with 1,000 tokens.</li>
                <li>Each bid costs 10 tokens.</li>
                <li>Correct result pays +20.</li>
                <li>Exact score pays +60.</li>
                <li>Bids close when kickoff time passes.</li>
              </ul>
            </section>
          </section>
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Fixtures and bids</h2>
          <div style={{ display: 'grid', gap: 16 }}>
            {fixtures.map((fixture) => {
              const draft = bidDrafts[fixture.id] ?? emptyDraft();
              const canBid = fixture.status === 'UPCOMING' && new Date(fixture.kickoffAt).getTime() > Date.now();

              return (
                <article
                  key={fixture.id}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid rgba(148, 163, 184, 0.14)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>
                        {fixture.homeTeam} vs {fixture.awayTeam}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: 13 }}>
                        {fixture.competition}{fixture.stage ? ` Â· ${fixture.stage}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', color: '#cbd5e1' }}>
                      <div>{fixture.status}</div>
                      <div style={{ fontSize: 13 }}>{formatHKT(fixture.kickoffAt)}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, color: '#e2e8f0' }}>
                    {fixture.homeScore != null && fixture.awayScore != null
                      ? `Final score: ${fixture.homeScore}-${fixture.awayScore}`
                      : 'Score not available yet'}
                  </div>

                  {fixture.myBids && fixture.myBids.length > 0 && (
                    <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: 'rgba(15, 23, 42, 0.85)' }}>
                      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>Your bids</div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {fixture.myBids.map((bid) => (
                          <div key={bid.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <span>{bidLabel(bid)}</span>
                            <span style={{ color: statusColor(bid.status) }}>{bid.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {me && canBid && (
                    <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {(['RESULT', 'SCORE'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() =>
                              setBidDrafts((current) => ({
                                ...current,
                                [fixture.id]: { ...(current[fixture.id] ?? emptyDraft()), bidType: mode },
                              }))
                            }
                            style={{
                              ...pillButton,
                              background: draft.bidType === mode ? '#f59e0b' : 'rgba(15, 23, 42, 0.95)',
                              color: draft.bidType === mode ? '#111827' : '#e2e8f0',
                            }}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>

                      {draft.bidType === 'RESULT' ? (
                        <select
                          value={draft.predictedResult}
                          onChange={(e) =>
                            setBidDrafts((current) => ({
                              ...current,
                              [fixture.id]: { ...(current[fixture.id] ?? emptyDraft()), predictedResult: e.target.value as ResultPrediction },
                            }))
                          }
                          style={inputStyle}
                        >
                          <option value="HOME">Home win</option>
                          <option value="DRAW">Draw</option>
                          <option value="AWAY">Away win</option>
                        </select>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                          <input
                            type="number"
                            min="0"
                            value={draft.predictedHomeScore}
                            onChange={(e) =>
                              setBidDrafts((current) => ({
                                ...current,
                                [fixture.id]: { ...(current[fixture.id] ?? emptyDraft()), predictedHomeScore: e.target.value },
                              }))
                            }
                            placeholder="Home score"
                            style={inputStyle}
                          />
                          <input
                            type="number"
                            min="0"
                            value={draft.predictedAwayScore}
                            onChange={(e) =>
                              setBidDrafts((current) => ({
                                ...current,
                                [fixture.id]: { ...(current[fixture.id] ?? emptyDraft()), predictedAwayScore: e.target.value },
                              }))
                            }
                            placeholder="Away score"
                            style={inputStyle}
                          />
                        </div>
                      )}

                      <button
                        onClick={() => void placeBid(fixture.id)}
                        disabled={busy === fixture.id}
                        style={{ ...primaryButton, opacity: busy === fixture.id ? 0.75 : 1 }}
                      >
                        {busy === fixture.id ? 'Placingâ€¦' : 'Place 10-token bid'}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}

            {fixtures.length === 0 && <div style={{ color: '#94a3b8' }}>No fixtures yet.</div>}
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>{tournamentEnded ? 'Tournament ended' : 'Upcoming fixtures'}</h2>
            {tournamentEnded ? (
              <div style={{ color: '#cbd5e1', lineHeight: 1.7 }}>
                World Cup 2026 finished on 20 Jul 2026, so there are no more upcoming fixtures to show.
                <div style={{ marginTop: 10, color: '#94a3b8', fontSize: 13 }}>
                  Scores are now final and token settlement is handled by the sync/settle flow.
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {upcomingFixtures.slice(0, 8).map((fixture) => (
                  <div key={fixture.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{fixture.homeTeam} vs {fixture.awayTeam}</div>
                      <div style={{ fontSize: 13, color: '#94a3b8' }}>{fixture.stage || fixture.competition}</div>
                    </div>
                    <div style={{ fontSize: 13, color: '#cbd5e1' }}>{formatHKT(fixture.kickoffAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Finished fixtures</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {finishedFixtures.slice(0, 8).map((fixture) => (
                <div key={fixture.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{fixture.homeTeam} vs {fixture.awayTeam}</div>
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>{fixture.stage || fixture.competition}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#cbd5e1' }}>
                    {fixture.homeScore ?? '-'}-{fixture.awayScore ?? '-'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 16, background: 'rgba(30, 41, 59, 0.9)' }}>
      <div style={{ fontSize: 13, color: '#94a3b8' }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function statusColor(status: BidStatus) {
  if (status === 'WON') return '#4ade80';
  if (status === 'LOST') return '#f87171';
  if (status === 'VOID') return '#f59e0b';
  return '#cbd5e1';
}

const cardStyle: CSSProperties = {
  padding: 24,
  borderRadius: 24,
  background: 'rgba(15, 23, 42, 0.8)',
  border: '1px solid rgba(148, 163, 184, 0.16)',
};

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: 14,
  border: '1px solid rgba(148, 163, 184, 0.2)',
  background: 'rgba(15, 23, 42, 0.95)',
  color: '#e2e8f0',
  padding: '12px 14px',
  fontSize: 15,
};

const primaryButton: CSSProperties = {
  cursor: 'pointer',
  border: 'none',
  borderRadius: 14,
  padding: '14px 16px',
  fontWeight: 800,
  background: '#22c55e',
  color: '#052e16',
};

const secondaryButton: CSSProperties = {
  cursor: 'pointer',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: 14,
  padding: '12px 14px',
  background: 'rgba(30, 41, 59, 0.85)',
  color: '#e2e8f0',
};

const pillButton: CSSProperties = {
  cursor: 'pointer',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: 999,
  padding: '10px 14px',
  fontWeight: 700,
};

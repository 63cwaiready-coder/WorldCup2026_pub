const [healthData, fixturesData, leaderboardData] = await Promise.all([
  requestJson<Health>(API.health),
  requestJson<{ fixtures: Fixture[] }>(API.fixtures),
  requestJson<{ leaderboard: LeaderboardEntry[] }>(API.leaderboard),
]);

setHealth(healthData);
setLeaderboard(leaderboardData.leaderboard);const fixturesWithBids = await Promise.all(
  fixturesData.fixtures.map(async (fixture) => {
    const bidsData = await requestJson<{ bids: Bid[] }>(`/api/fixtures/${fixture.id}/bids`, {
      headers: { authorization: `Bearer ${authToken}` },
    });
    return { ...fixture, myBids: bidsData.bids };
  }),
);

setMe(meData.user);
setFixtures(fixturesWithBids);  if (authMode === 'register' && !authForm.displayName.trim()) {
    setMessage('Please choose a nickname before registering. It cannot be changed later.');
    return;
  }

  const data = await requestJson<{ token: string; user: Me }>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  window.localStorage.setItem('world-cup-token', data.token);
  setToken(data.token);
  setMe(data.user);
  setMessage(`Signed in as ${data.user.displayName || 'Player'}`);
  await refreshAll(data.token);
} catch (error) {
  setMessage(error instanceof Error ? error.message : 'Authentication failed');
} finally {
  setBusy(null);setBusy(fixtureId);
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
  setBusy(null);setHealth(healthData);
setLeaderboard(leaderboardData.leaderboard);
setFixtures(fixturesData.fixtures.map((fixture) => ({ ...fixture, myBids: [] })));
}const fixturesWithBids = await Promise.all(
  fixturesData.fixtures.map(async (fixture) => {
    const bidsData = await requestJson<{ bids: Bid[] }>(`/api/fixtures/${fixture.id}/bids`, {
      headers: { authorization: `Bearer ${authToken}` },
    });
    return { ...fixture, myBids: bidsData.bids };
  }),
);

setMe(meData.user);
setFixtures(fixturesWithBids);  if (authMode === 'register' && !authForm.displayName.trim()) {
    setMessage('Please choose a nickname before registering. It cannot be changed later.');
    return;
  }

  const data = await requestJson<{ token: string; user: Me }>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  window.localStorage.setItem('world-cup-token', data.token);
  setToken(data.token);
  setMe(data.user);
  setMessage(`Signed in as ${data.user.displayName || 'Player'}`);
  await refreshAll(data.token);
} catch (error) {
  setMessage(error instanceof Error ? error.message : 'Authentication failed');
} finally {
  setBusy(null);setBusy(fixtureId);
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
}  await requestJson<{ bid: Bid }>(`/api/fixtures/${fixtureId}/bids`, {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    body: JSON.stringify(payload),
  });

  setMessage('Bid placed. Nice one.');
  await refreshAll(token);
} catch (error) {      <div
        style={{
          padding: 28,
          borderRadius: 24,
          background: 'rgba(15, 23, 42, 0.78)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 24 }}>{me ? 'Your account' : 'Sign in / create account'}</h2>
        {me ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: 16, borderRadius: 16, background: 'rgba(30, 41, 59, 0.9)' }}>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>Signed in as</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{me.displayName || 'Player'}</div>
              <div style={{ color: '#cbd5e1', marginTop: 4 }}>Nickname only — your login email stays private in the game.</div>
            </div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <div style={{ padding: 16, borderRadius: 16, background: 'rgba(30, 41, 59, 0.9)' }}>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>Tokens</div>
                <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700 }}>{money(me.currentTokens)}</div>
              </div>              <div style={{ padding: 16, borderRadius: 16, background: 'rgba(30, 41, 59, 0.9)' }}>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>Role</div>
                <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700 }}>{me.isAdmin ? 'Admin' : 'Player'}</div>
              </div>    <section style={{ marginTop: 28, display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)' }}>
      <div>
        <section style={{ ...cardStyle, marginBottom: 20 }}>
          <h2 style={{ marginTop: 0 }}>Quick views</h2>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <button
              onClick={() => document.getElementById('fixtures-and-bids')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              style={{
                cursor: 'pointer',
                border: '1px solid rgba(148, 163, 184, 0.18)',
                borderRadius: 18,
                padding: '16px 14px',
                background: 'rgba(30, 41, 59, 0.9)',
                color: '#e2e8f0',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 28 }}>⚽</div>
              <div style={{ fontWeight: 700, marginTop: 8 }}>Place bids</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Jump to the bidding board</div>
            </button>
            <button
              onClick={() => setActiveModal('fixture-times')}
              style={{
                cursor: 'pointer',
                border: '1px solid rgba(148, 163, 184, 0.18)',
                borderRadius: 18,
                padding: '16px 14px',
                background: 'rgba(30, 41, 59, 0.9)',
                color: '#e2e8f0',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 28 }}>⚽</div>
              <div style={{ fontWeight: 700, marginTop: 8 }}>Fixture times</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Open the fixture schedule in HKT</div>
            </button>
            <button
              onClick={() => setActiveModal('final-scores')}
              style={{
                cursor: 'pointer',
                border: '1px solid rgba(148, 163, 184, 0.18)',
                borderRadius: 18,
                padding: '16px 14px',
                background: 'rgba(30, 41, 59, 0.9)',
                color: '#e2e8f0',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 28 }}>⚽</div>
              <div style={{ fontWeight: 700, marginTop: 8 }}>Final scores</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Open the finished games modal</div>
            </button>
          </div>                <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
                  {activeModal === 'fixture-times' ? (
                    sortedFixtures.slice(0, 12).map((fixture) => (
                      <div key={fixture.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{fixture.homeTeam} vs {fixture.awayTeam}</div>
                          <div style={{ color: '#94a3b8', fontSize: 13 }}>{fixture.competition}{fixture.stage ? ` · ${fixture.stage}` : ''}</div>
                        </div>
                        <div style={{ textAlign: 'right', color: '#cbd5e1' }}>{formatHongKongDateTime(fixture.kickoffAt)}</div>
                      </div>
                    ))
                  ) : finishedFixtures.length === 0 ? (
                    <div style={{ color: '#94a3b8' }}>No final scores yet.</div>
                  ) : (
                    finishedFixtures.slice(0, 12).map((fixture) => (
}                      <div key={fixture.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}>
                        <div>
                          <div style={{ fontWeigh          <div style={{ marginTop: 14, color: '#94a3b8', fontSize: 13 }}>
            Today’s hint: tap the football icons above for HKT fixture times or finished scores.
          </div>
        </section>

        <div id="fixtures-and-bids" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 28 }}>Fixtures and bids</h2>
          <button
            onClick={() => void refreshAll(token ?? undefined)}
            style={{
              cursor: 'pointer',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: 999,
              padding: '10px 14px',
              background: 'rgba(30, 41, 59, 0.9)',
              color: '#e2e8f0',
            }}
          >
            Refresh
          </button>
        </div>                  {fixture.myBids.length > 0 && (
                    <div style={{ marginTop: 16, padding: 14, borderRadius: 16, background: 'rgba(30, 41, 59, 0.85)' }}>
                      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>Your bids</div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {fixture.myBids.map((bid) => (
                          <div key={bid.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <span>{describeBid(bid)}</span>
                            <span style={{ color: bid.status === 'WON' ? '#4ade80' : bid.status === 'LOST' ? '#f87171' : '#cbd5e1' }}>{bid.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {me && fixture.status === 'UPCOMING' && new Date(fixture.kickoffAt).getTime() > Date.now() && (
                    <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {(['RESULT', 'SCORE'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() =>
                              setBidDrafts((current) => ({
                                ...current,
                                [fixture.id]: {
                                  ...draft,
                                  bidType: mode,
                                },
                              }))
                            }                            style={{
                              cursor: 'pointer',
                              border: 'none',
                              borderRadius: 999,
                              padding: '10px 14px',
                              fontWeight: 700,
                              background: draft.bidType === mo                      {draft.bidType === 'RESULT' ? (
                        <select
                          value={draft.predictedResult}
                          onChange={(event) =>
                            setBidDrafts((current) => ({
                              ...current,
                              [fixture.id]: { ...draft, predictedResult: event.target.value as 'HOME' | 'AWAY' | 'DRAW' },
                            }))
                          }
                          style={inputStyle}
                        >
                          <option value="HOME">Home win</option>
                          <option value="DRAW">Draw</option>
                          <option value="AWAY">Away win</option>
                        </select>
                      ) : (
                        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                          <input
                            type="number"
                            min="0"
                            value={draft.predictedHomeScore}
                            onChange={(event) =>
                              setBidDrafts((current) => ({
                                ...current,
                                [fixture.id]: { ...draft, predictedHomeScore: event.target.value },
                              }))
                            }
                            placeholder="Home score"
                            style={inputStyle}
                          />
                          <input
                            type="number"
                            min="0"
                            value={draft.predictedAwayScore}
                            onChange={(event) =>
                              setBidDrafts((current) => ({
                                ...current,
                                [fixture.id]: { ...draft, predictedAwayScore: event.target.value },
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
                        style={{
                          cursor: 'pointer',
                          border: 'none',
                          borderRadius: 14,
                          padding: '14px 16px',
                          fontWeight: 700,
                          background: '#22c55e',
                          color: '#052e16',
                          opacity: busy === fixture.id ? 0.75 : 1,
                        }}
                      >
                        Place 10-token bid
                      </button>
                    </div>
                  )}      <aside style={{ display: 'grid', gap: 20, alignSelf: 'start' }}>
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Players leaderboard</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {sortedLeaderboard.slice(0, 10).map((entry, index) => (
              <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: index === 9 ? 'none' : '1px solid rgba(148, 163, 184, 0.14)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{entry.rank}. {entry.nickname}</div>
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>Shared rank for equal tokens</div>
                </div>
                <div style={{ fontWeight: 800 }}>{money(entry.currentTokens)}</div>
              </div>
            ))}
            {leaderboard.length === 0 && <div style={{ color: '#94a3b8' }}>No leaderboard data yet.</div>}
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>How it works</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#cbd5e1', lineHeight: 1.7 }}>
            <li>Every player starts with 1,000 tokens.</li>
            <li>Each bid costs 10 tokens.</li>
            <li>Correct result pays +20.</li>
            <li>Exact score pays +60.</li>
            <li>Admin users can settle finished fixtures.</li>
          </ul>
        </section>
      </aside>
    </section>
  </div>
</main>FINISHED: { bg: 'rgba(148,163,184,0.16)', fg: '#cbd5e1' },
POSTPONED: { bg: 'rgba(245,158,11,0.16)', fg: '#fcd34d' },
CANCELLED: { bg: 'rgba(239,68,68,0.16)', fg: '#fca5a5' },

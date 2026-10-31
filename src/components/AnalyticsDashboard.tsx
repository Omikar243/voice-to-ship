import { useCallback, useEffect, useState } from 'react';
import './analytics.css';

type Source = 'live' | 'preview';
type Metrics = { pageViews: number; impressions: number; clicks: number; ctr: number };
type ControlMetric = { targetId: string; impressions: number; clicks: number; ctr: number };
type Summary = { authenticated: true; periodDays: number; source: Source; totals: Metrics; controls: ControlMetric[] };

function labelFor(targetId: string) {
  return targetId
    .replace(/^auto-/, '')
    .replace(/[-_:]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AnalyticsDashboard() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [source, setSource] = useState<Source>('live');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/analytics/summary?days=${days}&source=${source}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (response.status === 401) {
        setSignedOut(true);
        setSummary(null);
        return;
      }
      if (response.status === 403) {
        setSignedOut(true);
        setSummary(null);
        setError('This Manus account is not authorized to view the owner dashboard.');
        return;
      }
      if (!response.ok) throw new Error('The analytics summary is temporarily unavailable.');
      const next = await response.json() as Summary;
      setSummary(next);
      setSignedOut(false);
    } catch {
      setError('Could not load the analytics summary. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, [days, source]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const signIn = async () => {
    setAuthBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ origin: window.location.origin, returnTo: '/insights' }),
      });
      if (!response.ok) throw new Error('The sign-in request could not be started.');
      const result = await response.json() as { authorizationUrl?: string };
      if (!result.authorizationUrl) throw new Error('The sign-in service did not return an authorization URL.');
      window.location.assign(result.authorizationUrl);
    } catch {
      setError('Could not start Manus sign-in. Try again in a moment.');
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      setSummary(null);
      setSignedOut(true);
      setError('');
    }
  };

  const percent = (value: number) => `${(Math.max(0, value) * 100).toFixed(1)}%`;

  return (
    <main className="insights-page">
      <header className="insights-topbar">
        <a className="insights-wordmark" href="/" aria-label="VOICE TO SHIP, back to portfolio">VOICE <span>TO</span> SHIP</a>
        <span className="insights-topbar__status">OWNER VIEW / PRIVATE</span>
        {summary && <button className="insights-signout" type="button" onClick={signOut}>Sign out</button>}
      </header>

      <section className="insights-content" aria-labelledby="insights-title">
        <p className="insights-kicker">VOICE TO SHIP / FIELD NOTES</p>
        <h1 id="insights-title">A signal, <em>counted.</em></h1>
        <p className="insights-intro">Anonymous traffic and per-control click-through. No unique visitors, personal content or visitor identity is stored in these event records.</p>

        {signedOut ? (
          <div className="insights-auth-panel">
            <span className="insights-auth-panel__mark">PRIVATE / OWNER ONLY</span>
            <h2>Sign in to read the signal.</h2>
            <p>This view is restricted to the owner’s Manus account. Public visitors can’t read traffic or click summaries.</p>
            <button className="insights-primary" type="button" onClick={signIn} disabled={authBusy}>{authBusy ? 'Opening sign-in…' : 'Sign in with Manus'} <span aria-hidden="true">↗</span></button>
            {error && <p className="insights-error" role="alert">{error}</p>}
            {new URLSearchParams(window.location.search).get('auth') === 'denied' && <p className="insights-error" role="alert">This account is not authorized for the owner dashboard.</p>}
            <a className="insights-back" href="/">Back to the portfolio</a>
          </div>
        ) : (
          <>
            <div className="insights-toolbar">
              <fieldset className="insights-switcher">
                <legend>Traffic source</legend>
                {(['live', 'preview'] as const).map((value) => <button key={value} type="button" className={source === value ? 'is-selected' : ''} aria-pressed={source === value} onClick={() => setSource(value)}>{value === 'live' ? 'Live' : 'Preview'}</button>)}
              </fieldset>
              <fieldset className="insights-switcher">
                <legend>Reporting window</legend>
                {([7, 30, 90] as const).map((value) => <button key={value} type="button" className={days === value ? 'is-selected' : ''} aria-pressed={days === value} onClick={() => setDays(value)}>{value} days</button>)}
              </fieldset>
            </div>

            {loading ? <p className="insights-loading" role="status">Reading the latest counts…</p> : error ? <p className="insights-error" role="alert">{error} <button type="button" onClick={() => void loadSummary()}>Retry</button></p> : summary && (
              <>
                <div className="insights-metrics" aria-label="Traffic summary">
                  <article><span>PAGE VIEWS</span><strong>{summary.totals.pageViews.toLocaleString('en-IN')}</strong><small>Not unique visitors</small></article>
                  <article><span>CONTROL IMPRESSIONS</span><strong>{summary.totals.impressions.toLocaleString('en-IN')}</strong><small>Visible for at least 0.7 seconds</small></article>
                  <article><span>CONTROL CLICKS</span><strong>{summary.totals.clicks.toLocaleString('en-IN')}</strong><small>Named links, buttons and options</small></article>
                  <article><span>OVERALL CTR</span><strong>{percent(summary.totals.ctr)}</strong><small>Clicks ÷ impressions</small></article>
                </div>

                <section className="insights-controls" aria-labelledby="controls-title">
                  <div className="insights-controls__heading"><div><span className="insights-kicker">WHAT PEOPLE OPENED</span><h2 id="controls-title">Control performance</h2></div><span className="insights-source-tag">{source.toUpperCase()} / LAST {days} DAYS</span></div>
                  {summary.controls.length === 0 ? <p className="insights-empty">No counts yet for this source and window. Opt-outs are not included.</p> : (
                    <div className="insights-table-wrap">
                      <table>
                        <thead><tr><th scope="col">CONTROL</th><th scope="col">SEEN</th><th scope="col">CLICKS</th><th scope="col">CTR</th></tr></thead>
                        <tbody>{summary.controls.map((control) => <tr key={control.targetId}><th scope="row">{labelFor(control.targetId)}</th><td>{control.impressions.toLocaleString('en-IN')}</td><td>{control.clicks.toLocaleString('en-IN')}</td><td><div className="insights-rate"><span><i style={{ width: `${Math.min(100, Math.max(0, control.ctr * 100))}%` }} /></span><b>{percent(control.ctr)}</b></div></td></tr>)}</tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
            <p className="insights-retention">Raw anonymous events are removed after 30 days; daily aggregate counts remain. Preview and live traffic are reported separately. Activity from visitors who opt out is not counted.</p>
          </>
        )}
      </section>
    </main>
  );
}

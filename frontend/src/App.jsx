import { useState, useEffect } from 'react';
import SearchForm from './components/SearchForm';
import ResultsList from './components/ResultsList';
import styles from './App.module.css';

const LOADING_STEPS = [
  'Resolving Steam profiles…',
  'Fetching game libraries…',
  'Fetching game metadata…',
  'Analysing preferences…',
  'Building recommendations…',
];

export default function App() {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Cycle through loading messages while request is in-flight
  useEffect(() => {
    if (!loading) { setStepIdx(0); return; }
    const t = setInterval(
      () => setStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1)),
      1800
    );
    return () => clearInterval(t);
  }, [loading]);

  // overrides contain pre-resolved Steam64 IDs from the PlayerInput components.
  // If available they're used directly; otherwise raw text is sent to the backend.
  async function handleSubmit(e, overrides = {}) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);

    const player1 = overrides.p1Override ?? p1;
    const player2 = overrides.p2Override ?? p2;

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player1, player2 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data);
      } else {
        setResults(data);
      }
    } catch {
      setError({ error: 'Could not reach the server. Is the backend running?' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 12a4 4 0 1 0 8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 8v1M12 3v1M3 12h1M20 12h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Steam Co-play
          </div>
          <p className={styles.tagline}>
            Find multiplayer games you'll both actually enjoy
          </p>
        </div>
      </header>

      <main className={styles.main}>
        <SearchForm
          p1={p1} setP1={setP1}
          p2={p2} setP2={setP2}
          onSubmit={handleSubmit}
          loading={loading}
        />

        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p className={styles.loadingMsg}>{LOADING_STEPS[stepIdx]}</p>
          </div>
        )}

        {error && !loading && (
          <div className={styles.errorCard}>
            <span className={styles.errorIcon}>⚠</span>
            <div>
              <p className={styles.errorText}>{error.error}</p>
              {error.code === 'PRIVATE_PROFILE' && (
                <p className={styles.errorHint}>
                  Go to Steam → Edit Profile → Privacy Settings → Game details → Public
                </p>
              )}
            </div>
          </div>
        )}

        {results && !loading && (
          <ResultsList results={results} />
        )}
      </main>

      <footer className={styles.footer}>
        Powered by{' '}
        <a href="https://store.steampowered.com/openid/" rel="noreferrer" target="_blank">
          Steam Web API
        </a>{' '}
        &amp;{' '}
        <a href="https://gamalytic.com" rel="noreferrer" target="_blank">
          Gamalytic
        </a>
      </footer>
    </div>
  );
}

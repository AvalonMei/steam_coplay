import { useState, useRef, useEffect } from 'react';
import styles from './PlayerInput.module.css';

const DEBOUNCE_MS = 500;

export default function PlayerInput({ label, disabled, onResolve, onRawChange, rawValue }) {
  const [raw, setRaw] = useState(rawValue ?? '');
  const [status, setStatus] = useState('idle'); // idle | searching | confirmed | candidates | notfound
  const [confirmed, setConfirmed] = useState(null);  // { steamId, personaname, avatar, profileUrl }
  const [candidates, setCandidates] = useState([]);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close candidate dropdown on outside click
  useEffect(() => {
    if (status !== 'candidates') return;
    function handleClick(e) {
      if (!dropdownRef.current?.contains(e.target)) setCandidates([]);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [status]);

  function handleChange(e) {
    const v = e.target.value;
    setRaw(v);
    setStatus('idle');
    setConfirmed(null);
    setCandidates([]);
    onResolve(null);
    onRawChange?.(v);

    clearTimeout(debounceRef.current);
    if (!v.trim()) return;

    debounceRef.current = setTimeout(() => doSearch(v.trim()), DEBOUNCE_MS);
  }

  async function doSearch(query) {
    setStatus('searching');
    try {
      const res = await fetch(`/api/search-player?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const list = data.candidates ?? [];

      if (list.length === 0) {
        setStatus('notfound');
      } else if (list.length === 1) {
        confirm(list[0]);
      } else {
        setCandidates(list);
        setStatus('candidates');
      }
    } catch {
      setStatus('idle'); // silently fall back — user can still submit raw input
    }
  }

  function confirm(profile) {
    setConfirmed(profile);
    setStatus('confirmed');
    setCandidates([]);
    onResolve(profile.steamId);
  }

  function clear() {
    setRaw('');
    setStatus('idle');
    setConfirmed(null);
    setCandidates([]);
    onResolve(null);
    onRawChange?.('');
    clearTimeout(debounceRef.current);
  }

  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>

      <div className={styles.inputRow}>
        <div className={styles.inputWrap}>
          <input
            className={`${styles.input} ${status === 'confirmed' ? styles.inputConfirmed : ''}`}
            type="text"
            value={raw}
            onChange={handleChange}
            placeholder="URL, Steam ID, vanity name, or display name"
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
          />

          {/* Right-side indicator */}
          {status === 'searching' && (
            <span className={styles.spinner} aria-label="Searching…" />
          )}
          {status === 'confirmed' && (
            <button
              className={styles.clearBtn}
              onClick={clear}
              aria-label="Clear"
              type="button"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Confirmed profile chip */}
      {status === 'confirmed' && confirmed && (
        <div className={styles.chip}>
          <img className={styles.chipAvatar} src={confirmed.avatar} alt="" />
          <span className={styles.chipName}>{confirmed.personaname}</span>
          <span className={styles.chipUrl}>
            {confirmed.profileUrl.replace('https://steamcommunity.com/', '')}
          </span>
          <span className={styles.chipCheck}>✓</span>
        </div>
      )}

      {/* Candidate dropdown */}
      {status === 'candidates' && candidates.length > 0 && (
        <div className={styles.dropdown} ref={dropdownRef}>
          <p className={styles.dropdownHint}>Multiple profiles found — pick one:</p>
          {candidates.map((c) => (
            <button
              key={c.steamId}
              className={styles.candidate}
              type="button"
              onClick={() => confirm(c)}
            >
              <img className={styles.candidateAvatar} src={c.avatar} alt="" />
              <div className={styles.candidateInfo}>
                <span className={styles.candidateName}>{c.personaname}</span>
                <span className={styles.candidateUrl}>
                  {c.profileUrl.replace('https://steamcommunity.com/', '')}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Not found */}
      {status === 'notfound' && (
        <p className={styles.notFound}>No Steam profiles found for "{raw}"</p>
      )}
    </div>
  );
}

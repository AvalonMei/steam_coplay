import { useRef } from 'react';
import PlayerInput from './PlayerInput';
import styles from './SearchForm.module.css';

export default function SearchForm({ p1, setP1, p2, setP2, onSubmit, loading }) {
  // Resolved Steam64 IDs — set when a player is auto-confirmed, cleared on edit.
  // If null, the backend resolves the raw input string as before.
  const p1SteamId = useRef(null);
  const p2SteamId = useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(e, {
      p1Override: p1SteamId.current,
      p2Override: p2SteamId.current,
    });
  }

  const canSubmit = !loading && p1.trim() && p2.trim();

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.inputs}>
        <PlayerInput
          label="Player 1"
          disabled={loading}
          onResolve={(id) => {
            p1SteamId.current = id;
            // Keep the raw value in sync so the parent still has something
            if (id && !p1) setP1(id);
          }}
          onRawChange={setP1}
          rawValue={p1}
        />

        <div className={styles.vs}>VS</div>

        <PlayerInput
          label="Player 2"
          disabled={loading}
          onResolve={(id) => {
            p2SteamId.current = id;
            if (id && !p2) setP2(id);
          }}
          onRawChange={setP2}
          rawValue={p2}
        />
      </div>

      <button
        className={styles.button}
        type="submit"
        disabled={!canSubmit}
      >
        {loading ? 'Finding games…' : 'Find Games'}
      </button>
    </form>
  );
}

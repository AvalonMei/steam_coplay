import { useState } from 'react';
import styles from './GameCard.module.css';

const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="230" height="107" viewBox="0 0 230 107"><rect width="230" height="107" fill="%231b2838"/><text x="115" y="58" text-anchor="middle" fill="%237a8fa6" font-family="system-ui" font-size="13">No image</text></svg>';

function formatPlaytime(minutes) {
  if (minutes === 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  if (hours >= 1000) return `${(hours / 1000).toFixed(1)}k hrs`;
  if (hours >= 10) return `${Math.round(hours)} hrs`;
  return `${hours.toFixed(1)} hrs`;
}

function rankStyle(rank) {
  if (rank === 1) return styles.rankGold;
  if (rank === 2) return styles.rankSilver;
  if (rank === 3) return styles.rankBronze;
  return styles.rankDefault;
}

export default function GameCard({ game, rank, p1Label, p2Label }) {
  const { appid, name, normalizedScore, p1Playtime, p2Playtime, topTags, imageUrl } = game;
  const [imgSrc, setImgSrc] = useState(imageUrl);

  const scoreColor =
    normalizedScore >= 75 ? '#4db35c' :
    normalizedScore >= 40 ? '#66c0f4' :
    '#7a8fa6';

  return (
    <article className={styles.card}>
      <div className={`${styles.rank} ${rankStyle(rank)}`}>#{rank}</div>

      <img
        className={styles.image}
        src={imgSrc}
        alt={name}
        loading="lazy"
        onError={() => setImgSrc(FALLBACK_IMAGE)}
      />

      <div className={styles.info}>
        <h3 className={styles.name}>{name}</h3>

        <div className={styles.scoreRow}>
          <div className={styles.scoreBar}>
            <div
              className={styles.scoreFill}
              style={{ width: `${normalizedScore}%`, background: scoreColor }}
            />
          </div>
          <span className={styles.scoreLabel} style={{ color: scoreColor }}>
            {normalizedScore}%
          </span>
        </div>

        <div className={styles.playtime}>
          <div className={styles.playtimeItem}>
            <span className={styles.playtimeLabel}>
              {shortenLabel(p1Label)}
            </span>
            <span className={styles.playtimeValue}>{formatPlaytime(p1Playtime)}</span>
          </div>
          <div className={styles.playtimeDivider} />
          <div className={styles.playtimeItem}>
            <span className={styles.playtimeLabel}>
              {shortenLabel(p2Label)}
            </span>
            <span className={styles.playtimeValue}>{formatPlaytime(p2Playtime)}</span>
          </div>
        </div>

        {topTags.length > 0 && (
          <div className={styles.tags}>
            {topTags.map((tag) => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      <a
        className={styles.storeLink}
        href={`https://store.steampowered.com/app/${appid}/`}
        target="_blank"
        rel="noreferrer"
        aria-label={`View ${name} on Steam`}
      >
        View on Steam →
      </a>
    </article>
  );
}

// Shorten a Steam URL or long ID to a readable label
function shortenLabel(input) {
  if (!input) return 'Player';
  const vanityMatch = input.match(/\/id\/([^/?#/]+)/);
  if (vanityMatch) return vanityMatch[1];
  const profileMatch = input.match(/\/profiles\/(\d+)/);
  if (profileMatch) return profileMatch[1].slice(-6) + '…';
  // Raw ID or vanity name — truncate if very long
  return input.length > 20 ? input.slice(0, 18) + '…' : input;
}

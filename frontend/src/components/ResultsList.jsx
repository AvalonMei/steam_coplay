import GameCard from './GameCard';
import styles from './ResultsList.module.css';

export default function ResultsList({ results }) {
  const { recommendations, player1, player2 } = results;

  if (recommendations.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No shared multiplayer games found</p>
        <p className={styles.emptyHint}>
          Both players need to own at least one online multiplayer game in common
          with 30+ minutes of playtime each.
        </p>
      </div>
    );
  }

  return (
    <section className={styles.section} aria-label="Game recommendations">
      <header className={styles.header}>
        <h2 className={styles.count}>
          {recommendations.length} shared{' '}
          {recommendations.length === 1 ? 'game' : 'games'} found
        </h2>
        <p className={styles.subtitle}>Ranked by how well each game fits both players</p>
      </header>

      <ol className={styles.list}>
        {recommendations.map((game, idx) => (
          <li key={game.appid}>
            <GameCard
              game={game}
              rank={idx + 1}
              p1Label={player1.input}
              p2Label={player2.input}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

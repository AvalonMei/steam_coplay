const ONLINE_MULTIPLAYER_TAGS = new Set([
  'Multiplayer',
  'Online Co-Op',
  'Co-op',
  'Online PvP',
  'PvP',
  'MMO',
  'MMORPG',
]);

// Builds a tag → weight map from a player's game library.
// Each game's playtime is normalised as a fraction of total playtime, then
// distributed evenly across its tags. This keeps a 5000-hr player and a
// 200-hr player on equal footing.
function buildTagProfile(games, metadataMap) {
  const profile = new Map();
  const totalPlaytime = games.reduce((sum, g) => sum + g.playtime_forever, 0);
  if (totalPlaytime === 0) return profile;

  for (const game of games) {
    const meta = metadataMap.get(game.appid);
    if (!meta || !meta.tags || meta.tags.length === 0) continue;

    const normalizedPlaytime = game.playtime_forever / totalPlaytime;
    const tagWeight = normalizedPlaytime / meta.tags.length;

    for (const tag of meta.tags) {
      profile.set(tag, (profile.get(tag) || 0) + tagWeight);
    }
  }

  return profile;
}

// Returns the subset of appids that have at least one recognised online-
// multiplayer tag. Games whose only multiplayer signal is local-only
// (Local Co-Op / Local Multiplayer / Split Screen) are excluded.
function filterMultiplayerGames(sharedAppids, metadataMap) {
  return sharedAppids.filter((appid) => {
    const meta = metadataMap.get(appid);
    if (!meta || !meta.tags) return false;
    const tagSet = new Set(meta.tags);
    return [...ONLINE_MULTIPLAYER_TAGS].some((t) => tagSet.has(t));
  });
}

// Scores and ranks shared multiplayer games using the geometric mean of each
// player's per-game tag score. This ensures both players must have affinity —
// a game one player loves but the other has zero history with scores low.
function scoreAndRank(
  sharedMultiplayerAppids,
  metadataMap,
  p1Profile,
  p2Profile,
  p1Games,
  p2Games
) {
  const p1PlaytimeMap = new Map(p1Games.map((g) => [g.appid, g.playtime_forever]));
  const p2PlaytimeMap = new Map(p2Games.map((g) => [g.appid, g.playtime_forever]));

  return sharedMultiplayerAppids
    .map((appid) => {
      const meta = metadataMap.get(appid);
      if (!meta) return null;

      const tags = meta.tags || [];
      const p1Score = tags.reduce((sum, t) => sum + (p1Profile.get(t) || 0), 0);
      const p2Score = tags.reduce((sum, t) => sum + (p2Profile.get(t) || 0), 0);
      const score = Math.sqrt(p1Score * p2Score);

      // Top shared-affinity tags: tags where both players have non-zero weight,
      // sorted by geometric mean of their individual weights (most mutual first).
      const topTags = tags
        .map((tag) => ({
          tag,
          weight: Math.sqrt((p1Profile.get(tag) || 0) * (p2Profile.get(tag) || 0)),
        }))
        .filter((t) => t.weight > 0)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 6)
        .map((t) => t.tag);

      return {
        appid,
        name: meta.name,
        score,
        p1Playtime: p1PlaytimeMap.get(appid) || 0,
        p2Playtime: p2PlaytimeMap.get(appid) || 0,
        topTags,
        tags,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

module.exports = { buildTagProfile, filterMultiplayerGames, scoreAndRank };

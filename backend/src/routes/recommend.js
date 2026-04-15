const express = require('express');
const { resolveUser, getOwnedGames } = require('../services/steamService');
const { fetchGameMetadata } = require('../services/gamalyticService');
const { buildTagProfile, filterMultiplayerGames, scoreAndRank } = require('../services/scoringService');

const router = express.Router();

router.post('/recommend', async (req, res) => {
  const { player1, player2 } = req.body;

  if (!player1?.trim() || !player2?.trim()) {
    return res.status(400).json({ error: 'Both player1 and player2 are required.' });
  }

  try {
    // Step 1: Resolve both inputs to Steam64 IDs in parallel
    const [id1Result, id2Result] = await Promise.allSettled([
      resolveUser(player1),
      resolveUser(player2),
    ]);

    if (id1Result.status === 'rejected') {
      return res.status(404).json({
        error: id1Result.reason.message,
        code: id1Result.reason.code || 'USER_NOT_FOUND',
        player: 1,
      });
    }
    if (id2Result.status === 'rejected') {
      return res.status(404).json({
        error: id2Result.reason.message,
        code: id2Result.reason.code || 'USER_NOT_FOUND',
        player: 2,
      });
    }

    const p1SteamId = id1Result.value;
    const p2SteamId = id2Result.value;

    // Step 2: Fetch both libraries in parallel
    const [lib1Result, lib2Result] = await Promise.allSettled([
      getOwnedGames(p1SteamId),
      getOwnedGames(p2SteamId),
    ]);

    if (lib1Result.status === 'rejected') {
      return res.status(422).json({
        error: lib1Result.reason.message,
        code: lib1Result.reason.code || 'FETCH_ERROR',
        player: 1,
      });
    }
    if (lib2Result.status === 'rejected') {
      return res.status(422).json({
        error: lib2Result.reason.message,
        code: lib2Result.reason.code || 'FETCH_ERROR',
        player: 2,
      });
    }

    const p1Games = lib1Result.value;
    const p2Games = lib2Result.value;

    // Step 3: Batch-fetch metadata for the union of both libraries
    const allAppids = [...new Set([...p1Games, ...p2Games].map((g) => g.appid))];
    const metadataMap = await fetchGameMetadata(allAppids);

    // Step 4: Build preference profiles from each player's full library
    const p1Profile = buildTagProfile(p1Games, metadataMap);
    const p2Profile = buildTagProfile(p2Games, metadataMap);

    // Step 5: Find shared games, filter to online multiplayer, score and rank
    const p1Ids = new Set(p1Games.map((g) => g.appid));
    const p2Ids = new Set(p2Games.map((g) => g.appid));
    const sharedIds = [...p1Ids].filter((id) => p2Ids.has(id));
    const sharedMultiplayer = filterMultiplayerGames(sharedIds, metadataMap);

    const ranked = scoreAndRank(
      sharedMultiplayer,
      metadataMap,
      p1Profile,
      p2Profile,
      p1Games,
      p2Games
    );

    // Normalise scores to 0–100 relative to the top result
    const maxScore = ranked[0]?.score || 1;
    const recommendations = ranked.map((r) => ({
      appid: r.appid,
      name: r.name,
      score: r.score,
      normalizedScore: Math.round((r.score / maxScore) * 100),
      p1Playtime: r.p1Playtime,
      p2Playtime: r.p2Playtime,
      topTags: r.topTags,
      imageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${r.appid}/header.jpg`,
    }));

    return res.json({
      player1: { steamId: p1SteamId, input: player1 },
      player2: { steamId: p2SteamId, input: player2 },
      recommendations,
    });
  } catch (err) {
    console.error('Unexpected error in /recommend:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

module.exports = router;

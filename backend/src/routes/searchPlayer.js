const express = require('express');
const { resolveUser, getPlayerSummary } = require('../services/steamService');
const { searchUsers } = require('../services/steamSearch');

const router = express.Router();

// GET /api/search-player?q=<query>
//
// Resolution order:
//   1. If input looks like a Steam64 ID or steamcommunity URL → resolve directly,
//      fetch profile, return single candidate immediately (no community search).
//   2. Otherwise → Steam community search (handles both vanity slugs and display names).
//
// Response: { candidates: [{ steamId, personaname, avatar, profileUrl }] }
router.get('/search-player', async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.status(400).json({ error: 'Query is required' });

  try {
    // Fast path: looks like a direct ID or URL — skip community search
    const looksLikeDirect =
      /^\d{17}$/.test(q) ||
      q.includes('steamcommunity.com/profiles/') ||
      q.includes('steamcommunity.com/id/');

    if (looksLikeDirect) {
      try {
        const steamId = await resolveUser(q);
        const profile = await getPlayerSummary(steamId);
        return res.json({ candidates: [profile] });
      } catch (err) {
        if (err.code !== 'USER_NOT_FOUND') throw err;
        return res.json({ candidates: [] });
      }
    }

    // Community search — handles vanity slugs, display names, and anything else
    const candidates = await searchUsers(q);
    return res.json({ candidates });
  } catch (err) {
    console.error('search-player error:', err.message);
    return res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

module.exports = router;

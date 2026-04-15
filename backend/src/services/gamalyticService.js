const axios = require('axios');

const BASE_URL = 'https://api.gamalytic.com/steam-games/list';

function getApiKey() {
  const key = process.env.GAMALYTIC_API_KEY;
  if (!key) throw new Error('GAMALYTIC_API_KEY is not set');
  return key;
}

// Returns a Map<steamId (number), { steamId, name, tags, genres, features }>
// Appids not indexed in Gamalytic are silently absent from the result.
// Paginates automatically when the union exceeds 1000 games.
async function fetchGameMetadata(appids) {
  const result = new Map();
  if (appids.length === 0) return result;

  const headers = { 'api-key': getApiKey(), accept: 'application/json' };
  const baseParams = {
    appids: appids.join(','),
    fields: 'steamId,name,tags,genres,features',
    limit: 1000,
    page: 0,
  };

  const firstRes = await axios.get(BASE_URL, { params: baseParams, headers, timeout: 20000 });
  const { pages, result: firstBatch } = firstRes.data;
  for (const game of firstBatch) result.set(game.steamId, game);

  for (let page = 1; page < pages; page++) {
    const res = await axios.get(BASE_URL, {
      params: { ...baseParams, page },
      headers,
      timeout: 20000,
    });
    for (const game of res.data.result) result.set(game.steamId, game);
  }

  return result;
}

module.exports = { fetchGameMetadata };

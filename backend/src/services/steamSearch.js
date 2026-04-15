// Steam community user search.
// Steam's SearchCommunityAjax endpoint requires a sessionid cookie but NOT a
// logged-in account — any anonymous session obtained from the search page works.

const axios = require('axios');

const SEARCH_URL = 'https://steamcommunity.com/search/SearchCommunityAjax';
const SESSION_URL = 'https://steamcommunity.com/search/users/';

// Cached anonymous session cookie. Long-lived (weeks), refreshed on failure.
let cachedCookie = null;

async function getCommunitySession() {
  if (cachedCookie) return cachedCookie;

  const res = await axios.get(SESSION_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 10000,
  });

  const setCookie = res.headers['set-cookie'] || [];
  const sessionEntry = setCookie.find((c) => c.startsWith('sessionid='));
  if (!sessionEntry) throw new Error('Could not obtain Steam community session');

  cachedCookie = sessionEntry.split(';')[0]; // "sessionid=VALUE"
  return cachedCookie;
}

// Searches Steam community by display name or vanity URL.
// Returns up to 5 candidates: { steamId, personaname, avatar, profileUrl }
async function searchUsers(query, { retry = true } = {}) {
  const cookie = await getCommunitySession();
  const sessionid = cookie.split('=')[1];

  let res;
  try {
    res = await axios.post(
      SEARCH_URL,
      new URLSearchParams({ text: query, filter: 'users', sessionid, steamid: '0', page: '1' }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: SESSION_URL,
          Cookie: cookie,
          'User-Agent': 'Mozilla/5.0',
        },
        timeout: 10000,
      }
    );
  } catch (err) {
    if (retry) {
      cachedCookie = null;
      return searchUsers(query, { retry: false });
    }
    throw err;
  }

  const { success, html } = res.data;

  // Empty array response means the session expired — refresh and retry once
  if (!success || !html) {
    if (retry) {
      cachedCookie = null;
      return searchUsers(query, { retry: false });
    }
    return [];
  }

  // Extract miniprofile IDs from the HTML.
  // Steam64 = 76561197960265728 + accountId (lower 32 bits)
  const miniprofileIds = [...html.matchAll(/data-miniprofile="(\d+)"/g)].map((m) => m[1]);
  if (miniprofileIds.length === 0) return [];

  const steamIds = miniprofileIds
    .slice(0, 5)
    .map((id) => String(76561197960265728n + BigInt(id)));

  // Fetch full profile data (name + avatar) from the Steam Web API
  const summaryRes = await axios.get(
    'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/',
    {
      params: { key: process.env.STEAM_API_KEY, steamids: steamIds.join(',') },
      timeout: 10000,
    }
  );

  // Preserve the search-result order (summaries come back in arbitrary order)
  const byId = Object.fromEntries(
    summaryRes.data.response.players.map((p) => [p.steamid, p])
  );
  return steamIds
    .map((id) => byId[id])
    .filter(Boolean)
    .map((p) => ({
      steamId: p.steamid,
      personaname: p.personaname,
      avatar: p.avatarmedium,
      profileUrl: p.profileurl,
    }));
}

module.exports = { searchUsers };

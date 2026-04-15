const axios = require('axios');

const BASE_URL = 'https://api.steampowered.com';

function getApiKey() {
  const key = process.env.STEAM_API_KEY;
  if (!key) throw new Error('STEAM_API_KEY is not set');
  return key;
}

// Accepts any of:
//   https://steamcommunity.com/profiles/76561198368877318
//   https://steamcommunity.com/id/PhaNtazM1337/
//   /profiles/76561198368877318
//   /id/504316002
//   76561198368877318   (bare Steam64 ID — 17 digits starting with 765611)
//   PhaNtazM1337        (bare vanity name)
function parseInput(input) {
  const trimmed = input.trim().replace(/\/+$/, '');

  const profilesMatch = trimmed.match(/\/profiles\/(\d{17})/);
  if (profilesMatch) return { type: 'steamId', value: profilesMatch[1] };

  const idMatch = trimmed.match(/\/id\/([^/?#]+)/);
  if (idMatch) return { type: 'vanity', value: idMatch[1] };

  if (/^\d{17}$/.test(trimmed)) return { type: 'steamId', value: trimmed };

  return { type: 'vanity', value: trimmed };
}

async function resolveVanityURL(vanityUrl) {
  const response = await axios.get(`${BASE_URL}/ISteamUser/ResolveVanityURL/v1/`, {
    params: { key: getApiKey(), vanityurl: vanityUrl },
    timeout: 10000,
  });
  const { success, steamid } = response.data.response;
  if (success !== 1) {
    const err = new Error(`Steam user not found: "${vanityUrl}"`);
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
  return steamid;
}

async function getOwnedGames(steamId) {
  const response = await axios.get(`${BASE_URL}/IPlayerService/GetOwnedGames/v1/`, {
    params: { key: getApiKey(), steamid: steamId, include_appinfo: 1, include_played_free_games: 1 },
    timeout: 15000,
  });
  const { games } = response.data.response;
  if (!games) {
    const err = new Error(
      'This Steam profile is private. The player needs to set their game details to Public in Steam Privacy Settings.'
    );
    err.code = 'PRIVATE_PROFILE';
    throw err;
  }
  return games.filter((g) => g.playtime_forever >= 30);
}

async function resolveUser(input) {
  const { type, value } = parseInput(input);
  if (type === 'steamId') return value;
  return resolveVanityURL(value);
}

async function getPlayerSummary(steamId) {
  const response = await axios.get(
    'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/',
    { params: { key: getApiKey(), steamids: steamId }, timeout: 10000 }
  );
  const player = response.data.response.players[0];
  if (!player) {
    const err = new Error(`No profile found for Steam ID ${steamId}`);
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
  return {
    steamId: player.steamid,
    personaname: player.personaname,
    avatar: player.avatarmedium,
    profileUrl: player.profileurl,
  };
}

module.exports = { resolveVanityURL, getOwnedGames, resolveUser, getPlayerSummary };

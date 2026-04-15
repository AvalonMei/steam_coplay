const axios = require('axios');
jest.mock('axios');

const {
  resolveVanityURL,
  getOwnedGames,
  resolveUser,
} = require('../../src/services/steamService');

const {
  P1_VANITY,
  P1_STEAM_ID,
  P2_VANITY,
  P2_STEAM_ID,
  RESOLVE_VANITY_SUCCESS,
  RESOLVE_VANITY_NOT_FOUND,
  GET_OWNED_GAMES_P1,
  GET_OWNED_GAMES_PRIVATE,
} = require('../fixtures/steamFixtures');

// ─── resolveVanityURL ────────────────────────────────────────────────────────

describe('resolveVanityURL', () => {
  it('returns the Steam64 ID string on success', async () => {
    axios.get.mockResolvedValueOnce({ data: RESOLVE_VANITY_SUCCESS });
    const result = await resolveVanityURL(P1_VANITY);
    expect(result).toBe(P1_STEAM_ID);
  });

  it('calls the correct Steam endpoint', async () => {
    axios.get.mockResolvedValueOnce({ data: RESOLVE_VANITY_SUCCESS });
    await resolveVanityURL(P1_VANITY);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('ResolveVanityURL'),
      expect.objectContaining({
        params: expect.objectContaining({ vanityurl: P1_VANITY }),
      })
    );
  });

  it('throws a descriptive error when the vanity name is not found (success: 42)', async () => {
    axios.get.mockResolvedValueOnce({ data: RESOLVE_VANITY_NOT_FOUND });
    await expect(resolveVanityURL('nonexistent_user_xyz')).rejects.toThrow(
      /not found|no match/i
    );
  });

  it('propagates network errors', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network Error'));
    await expect(resolveVanityURL(P1_VANITY)).rejects.toThrow('Network Error');
  });
});

// ─── getOwnedGames ───────────────────────────────────────────────────────────

describe('getOwnedGames', () => {
  it('returns an array of games for a public profile', async () => {
    axios.get.mockResolvedValueOnce({ data: GET_OWNED_GAMES_P1 });
    const games = await getOwnedGames(P1_STEAM_ID);
    expect(Array.isArray(games)).toBe(true);
    expect(games.length).toBeGreaterThan(0);
  });

  it('includes required fields: appid, name, playtime_forever', async () => {
    axios.get.mockResolvedValueOnce({ data: GET_OWNED_GAMES_P1 });
    const games = await getOwnedGames(P1_STEAM_ID);
    for (const game of games) {
      expect(game).toHaveProperty('appid');
      expect(game).toHaveProperty('name');
      expect(game).toHaveProperty('playtime_forever');
    }
  });

  it('filters out games with fewer than 30 minutes of playtime', async () => {
    axios.get.mockResolvedValueOnce({ data: GET_OWNED_GAMES_P1 });
    const games = await getOwnedGames(P1_STEAM_ID);
    for (const game of games) {
      expect(game.playtime_forever).toBeGreaterThanOrEqual(30);
    }
  });

  it('includes appid=730 (Counter-Strike 2) which has 9578 min of playtime', async () => {
    axios.get.mockResolvedValueOnce({ data: GET_OWNED_GAMES_P1 });
    const games = await getOwnedGames(P1_STEAM_ID);
    const cs2 = games.find((g) => g.appid === 730);
    expect(cs2).toBeDefined();
    expect(cs2.playtime_forever).toBe(9578);
  });

  it('excludes appid=999992 which has only 15 minutes of playtime', async () => {
    axios.get.mockResolvedValueOnce({ data: GET_OWNED_GAMES_P1 });
    const games = await getOwnedGames(P1_STEAM_ID);
    expect(games.find((g) => g.appid === 999992)).toBeUndefined();
  });

  it('calls the correct endpoint with include_appinfo=1 and include_played_free_games=1', async () => {
    axios.get.mockResolvedValueOnce({ data: GET_OWNED_GAMES_P1 });
    await getOwnedGames(P1_STEAM_ID);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('GetOwnedGames'),
      expect.objectContaining({
        params: expect.objectContaining({
          steamid: P1_STEAM_ID,
          include_appinfo: 1,
          include_played_free_games: 1,
        }),
      })
    );
  });

  it('throws a private-profile error when response.games is absent', async () => {
    axios.get.mockResolvedValueOnce({ data: GET_OWNED_GAMES_PRIVATE });
    await expect(getOwnedGames('76561198871256866')).rejects.toThrow(/private/i);
  });
});

// ─── resolveUser ────────────────────────────────────────────────────────────
// resolveUser(input) accepts any of:
//   - Full URL:  https://steamcommunity.com/id/PhaNtazM1337/
//   - Full URL:  https://steamcommunity.com/profiles/76561198954620186
//   - Path only: /id/PhaNtazM1337
//   - Path only: /profiles/76561198954620186
//   - Raw Steam64 ID: 76561198954620186
//   - Raw vanity name: PhaNtazM1337 or 504316002
// It returns the Steam64 ID string, resolving via the API when necessary.

describe('resolveUser', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('extracts Steam64 ID from a /profiles/ URL without an API call', async () => {
    const result = await resolveUser(
      `https://steamcommunity.com/profiles/${P2_STEAM_ID}`
    );
    expect(result).toBe(P2_STEAM_ID);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('extracts Steam64 ID from a /profiles/ path without an API call', async () => {
    const result = await resolveUser(`/profiles/${P1_STEAM_ID}`);
    expect(result).toBe(P1_STEAM_ID);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('recognises a bare 17-digit Steam64 ID without an API call', async () => {
    const result = await resolveUser(P1_STEAM_ID);
    expect(result).toBe(P1_STEAM_ID);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('resolves a vanity name from a full /id/ URL', async () => {
    axios.get.mockResolvedValueOnce({
      data: { response: { steamid: P2_STEAM_ID, success: 1 } },
    });
    const result = await resolveUser(
      `https://steamcommunity.com/id/${P2_VANITY}/`
    );
    expect(result).toBe(P2_STEAM_ID);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('ResolveVanityURL'),
      expect.objectContaining({
        params: expect.objectContaining({ vanityurl: P2_VANITY }),
      })
    );
  });

  it('resolves a bare vanity name string', async () => {
    axios.get.mockResolvedValueOnce({
      data: { response: { steamid: P1_STEAM_ID, success: 1 } },
    });
    const result = await resolveUser(P1_VANITY);
    expect(result).toBe(P1_STEAM_ID);
  });

  it('strips trailing slashes before resolving a vanity name', async () => {
    axios.get.mockResolvedValueOnce({
      data: { response: { steamid: P2_STEAM_ID, success: 1 } },
    });
    await resolveUser(`https://steamcommunity.com/id/${P2_VANITY}/`);
    expect(axios.get).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        params: expect.objectContaining({ vanityurl: P2_VANITY }),
      })
    );
  });

  it('throws when vanity name cannot be resolved', async () => {
    axios.get.mockResolvedValueOnce({
      data: { response: { success: 42, message: 'No match' } },
    });
    await expect(resolveUser('definitely_not_a_real_user')).rejects.toThrow(
      /not found|no match/i
    );
  });
});

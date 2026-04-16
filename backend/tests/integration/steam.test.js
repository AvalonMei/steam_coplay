/**
 * Integration tests — Steam Web API
 *
 * These tests make real HTTP calls. Run with:
 *   npm run test:integration
 *
 * Requires STEAM_API_KEY in ../../.env (relative to backend/).
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const {
  resolveVanityURL,
  getOwnedGames,
  resolveUser,
} = require('../../src/services/steamService');

const {
  P1_VANITY, P1_STEAM_ID,
  P2_VANITY, P2_STEAM_ID,
  PRIVATE_VANITY, PRIVATE_STEAM_ID,
  SHARED_APPIDS,
} = require('../fixtures/steamFixtures');

// ─── ResolveVanityURL ────────────────────────────────────────────────────────

describe('[integration] resolveVanityURL', () => {
  it('resolves P1 vanity → P1 Steam64 ID', async () => {
    const id = await resolveVanityURL(P1_VANITY);
    expect(id).toBe(P1_STEAM_ID);
  });

  it('resolves P2 vanity → P2 Steam64 ID', async () => {
    const id = await resolveVanityURL(P2_VANITY);
    expect(id).toBe(P2_STEAM_ID);
  });

  it('throws for a vanity name that does not exist', async () => {
    await expect(
      resolveVanityURL('this_vanity_name_should_not_exist_xyzxyz')
    ).rejects.toThrow(/not found|no match/i);
  });
});

// ─── GetOwnedGames ───────────────────────────────────────────────────────────

describe('[integration] getOwnedGames', () => {
  it('returns games for P1 (public profile)', async () => {
    const games = await getOwnedGames(P1_STEAM_ID);
    expect(games.length).toBeGreaterThan(0);
    // All returned games must meet the >=30 min threshold
    for (const g of games) {
      expect(g.playtime_forever).toBeGreaterThanOrEqual(30);
    }
  });

  it('P1 has at least 65 games with >=30 min playtime (including F2P)', async () => {
    const games = await getOwnedGames(P1_STEAM_ID);
    expect(games.length).toBeGreaterThanOrEqual(65);
  });

  it('P1 library includes Counter-Strike 2 (appid 730)', async () => {
    const games = await getOwnedGames(P1_STEAM_ID);
    expect(games.find((g) => g.appid === 730)).toBeDefined();
  });

  it('returns games for P2 (public profile)', async () => {
    const games = await getOwnedGames(P2_STEAM_ID);
    expect(games.length).toBeGreaterThan(0);
  });

  it('P2 has CS2 (appid 730) with very high playtime (>100k minutes)', async () => {
    const games = await getOwnedGames(P2_STEAM_ID);
    const cs2 = games.find((g) => g.appid === 730);
    expect(cs2).toBeDefined();
    expect(cs2.playtime_forever).toBeGreaterThan(100000);
  });

  it('every returned game has appid, name, and playtime_forever', async () => {
    const games = await getOwnedGames(P2_STEAM_ID);
    for (const g of games) {
      expect(typeof g.appid).toBe('number');
      expect(typeof g.name).toBe('string');
      expect(typeof g.playtime_forever).toBe('number');
    }
  });

  it('throws a private-profile error for a private profile', async () => {
    await expect(getOwnedGames(PRIVATE_STEAM_ID)).rejects.toThrow(/private/i);
  });
});

// ─── resolveUser (URL parsing + resolution) ──────────────────────────────────

describe('[integration] resolveUser', () => {
  it('resolves full /id/ URL for P1', async () => {
    const id = await resolveUser(`https://steamcommunity.com/id/${P1_VANITY}/`);
    expect(id).toBe(P1_STEAM_ID);
  });

  it('resolves full /id/ URL for P2', async () => {
    const id = await resolveUser(`https://steamcommunity.com/id/${P2_VANITY}/`);
    expect(id).toBe(P2_STEAM_ID);
  });

  it('extracts ID from /profiles/ URL without an API call', async () => {
    const id = await resolveUser(
      `https://steamcommunity.com/profiles/${P1_STEAM_ID}`
    );
    expect(id).toBe(P1_STEAM_ID);
  });

  it('handles a bare Steam64 ID string', async () => {
    const id = await resolveUser(P2_STEAM_ID);
    expect(id).toBe(P2_STEAM_ID);
  });

  it('handles a bare vanity name string', async () => {
    const id = await resolveUser(P1_VANITY);
    expect(id).toBe(P1_STEAM_ID);
  });
});

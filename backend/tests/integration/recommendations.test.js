/**
 * Integration tests — full recommendation pipeline
 *
 * Tests the end-to-end flow: resolve users → fetch libraries → fetch metadata
 * → build profiles → filter multiplayer → score and rank.
 *
 * These tests make real HTTP calls to both Steam and Gamalytic.
 * Run with:
 *   npm run test:integration
 *
 * Profiles:
 *   P1: steamcommunity.com/id/504316002  (public)
 *   P2: steamcommunity.com/id/PhaNtazM1337 (public)
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { resolveUser, getOwnedGames } = require('../../src/services/steamService');
const { fetchGameMetadata }           = require('../../src/services/gamalyticService');
const { buildTagProfile, filterMultiplayerGames, scoreAndRank } =
  require('../../src/services/scoringService');

const {
  P1_VANITY, P1_STEAM_ID,
  P2_VANITY, P2_STEAM_ID,
  SHARED_MULTIPLAYER_APPIDS,
} = require('../fixtures/steamFixtures');

// Shared state populated once per suite to avoid redundant API calls
let p1Games, p2Games, metadataMap, sharedMultiplayer, results;

beforeAll(async () => {
  // Step 1: fetch both libraries in parallel
  [p1Games, p2Games] = await Promise.all([
    getOwnedGames(P1_STEAM_ID),
    getOwnedGames(P2_STEAM_ID),
  ]);

  // Step 2: union of all appids → Gamalytic batch
  const allAppids = [...new Set([...p1Games, ...p2Games].map((g) => g.appid))];
  metadataMap = await fetchGameMetadata(allAppids);

  // Step 3: build profiles
  const p1Profile = buildTagProfile(p1Games, metadataMap);
  const p2Profile = buildTagProfile(p2Games, metadataMap);

  // Step 4: find shared games → filter multiplayer
  const p1Ids = new Set(p1Games.map((g) => g.appid));
  const p2Ids = new Set(p2Games.map((g) => g.appid));
  const sharedIds = [...p1Ids].filter((id) => p2Ids.has(id));
  sharedMultiplayer = filterMultiplayerGames(sharedIds, metadataMap);

  // Step 5: score and rank
  results = scoreAndRank(sharedMultiplayer, metadataMap, p1Profile, p2Profile, p1Games, p2Games);
}, 30000);

// ─── Library fetching ────────────────────────────────────────────────────────

describe('[integration] library fetch', () => {
  it('P1 has at least 60 games with >=30 min playtime', () => {
    expect(p1Games.length).toBeGreaterThanOrEqual(60);
  });

  it('P2 has at least 25 games with >=30 min playtime', () => {
    expect(p2Games.length).toBeGreaterThanOrEqual(25);
  });

  it('both libraries contain Counter-Strike 2 (appid 730)', () => {
    expect(p1Games.find((g) => g.appid === 730)).toBeDefined();
    expect(p2Games.find((g) => g.appid === 730)).toBeDefined();
  });
});

// ─── Metadata fetch ──────────────────────────────────────────────────────────

describe('[integration] metadata fetch', () => {
  it('returns a non-empty metadata map', () => {
    expect(metadataMap.size).toBeGreaterThan(0);
  });

  it('covers the known shared multiplayer games', () => {
    for (const appid of SHARED_MULTIPLAYER_APPIDS) {
      expect(metadataMap.has(appid)).toBe(true);
    }
  });

  it('does NOT include Wallpaper Engine (431960) — not indexed in Gamalytic', () => {
    expect(metadataMap.has(431960)).toBe(false);
  });
});

// ─── Multiplayer filtering ───────────────────────────────────────────────────

describe('[integration] multiplayer filtering', () => {
  it('produces at least 5 shared multiplayer games', () => {
    expect(sharedMultiplayer.length).toBeGreaterThanOrEqual(5);
  });

  it('includes Counter-Strike 2 (appid 730)', () => {
    expect(sharedMultiplayer).toContain(730);
  });

  it('includes Terraria (appid 105600)', () => {
    expect(sharedMultiplayer).toContain(105600);
  });

  it('includes Rust (appid 252490)', () => {
    expect(sharedMultiplayer).toContain(252490);
  });

  it('includes Elden Ring (appid 1245620)', () => {
    expect(sharedMultiplayer).toContain(1245620);
  });

  it('includes It Takes Two (appid 1426210)', () => {
    expect(sharedMultiplayer).toContain(1426210);
  });

  it('does NOT include Wallpaper Engine (not a game / not in Gamalytic)', () => {
    expect(sharedMultiplayer).not.toContain(431960);
  });
});

// ─── Scoring and ranking ─────────────────────────────────────────────────────

describe('[integration] scoring and ranking', () => {
  it('returns a non-empty ranked list', () => {
    expect(results.length).toBeGreaterThan(0);
  });

  it('every result has appid, name, score, p1Playtime, p2Playtime', () => {
    for (const r of results) {
      expect(typeof r.appid).toBe('number');
      expect(typeof r.name).toBe('string');
      expect(typeof r.score).toBe('number');
      expect(typeof r.p1Playtime).toBe('number');
      expect(typeof r.p2Playtime).toBe('number');
    }
  });

  it('results are sorted descending by score', () => {
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
    }
  });

  it('all scores are non-negative', () => {
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
    }
  });

  it('Counter-Strike 2 appears in the results (both players have high playtime)', () => {
    const cs2 = results.find((r) => r.appid === 730);
    expect(cs2).toBeDefined();
  });

  it('CS2 has P2 playtime > 100,000 minutes', () => {
    const cs2 = results.find((r) => r.appid === 730);
    expect(cs2.p2Playtime).toBeGreaterThan(100000);
  });

  it('p1Playtime and p2Playtime match what was in the fetched libraries', () => {
    for (const r of results) {
      const p1Game = p1Games.find((g) => g.appid === r.appid);
      const p2Game = p2Games.find((g) => g.appid === r.appid);
      expect(r.p1Playtime).toBe(p1Game?.playtime_forever ?? 0);
      expect(r.p2Playtime).toBe(p2Game?.playtime_forever ?? 0);
    }
  });
});

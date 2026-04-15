/**
 * Integration tests — Gamalytic API
 *
 * These tests make real HTTP calls. Run with:
 *   npm run test:integration
 *
 * Requires GAMALYTIC_API_KEY in ../../.env (relative to backend/).
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { fetchGameMetadata } = require('../../src/services/gamalyticService');

const { SHARED_APPIDS } = require('../fixtures/steamFixtures');

// ─── fetchGameMetadata ───────────────────────────────────────────────────────

describe('[integration] fetchGameMetadata', () => {
  it('returns a Map for a known batch of appids', async () => {
    const result = await fetchGameMetadata(SHARED_APPIDS);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBeGreaterThan(0);
  });

  it('includes Counter-Strike 2 (appid 730)', async () => {
    const result = await fetchGameMetadata([730]);
    expect(result.has(730)).toBe(true);
    expect(result.get(730).name).toBe('Counter-Strike 2');
  });

  it('CS2 has FPS, Shooter, and Multiplayer in its tags', async () => {
    const result = await fetchGameMetadata([730]);
    const cs2 = result.get(730);
    expect(cs2.tags).toContain('FPS');
    expect(cs2.tags).toContain('Shooter');
    expect(cs2.tags).toContain('Multiplayer');
  });

  it('CS2 tags and features arrays are non-empty (api-key header is working)', async () => {
    const result = await fetchGameMetadata([730]);
    const cs2 = result.get(730);
    expect(cs2.tags.length).toBeGreaterThan(0);
    expect(cs2.features.length).toBeGreaterThan(0);
  });

  it('includes Terraria (appid 105600) with Co-op and Online Co-Op tags', async () => {
    const result = await fetchGameMetadata([105600]);
    const terraria = result.get(105600);
    expect(terraria).toBeDefined();
    expect(terraria.tags).toContain('Co-op');
    expect(terraria.tags).toContain('Online Co-Op');
  });

  it('includes Rust (appid 252490) with PvP and Survival tags', async () => {
    const result = await fetchGameMetadata([252490]);
    const rust = result.get(252490);
    expect(rust).toBeDefined();
    expect(rust.tags).toContain('PvP');
    expect(rust.tags).toContain('Survival');
  });

  it('silently excludes Wallpaper Engine (appid 431960) — not indexed in Gamalytic', async () => {
    const result = await fetchGameMetadata([730, 431960]);
    expect(result.has(430)).toBe(false); // not present
    expect(result.has(730)).toBe(true);  // CS2 still returned
  });

  it('returns all 6 known shared games (Wallpaper Engine excluded)', async () => {
    // SHARED_APPIDS = [730, 105600, 252490, 431960, 477160, 1245620, 1426210]
    // Wallpaper Engine (431960) is not in Gamalytic → expect 6 results
    const result = await fetchGameMetadata(SHARED_APPIDS);
    expect(result.has(730)).toBe(true);
    expect(result.has(105600)).toBe(true);
    expect(result.has(252490)).toBe(true);
    expect(result.has(477160)).toBe(true);
    expect(result.has(1245620)).toBe(true);
    expect(result.has(1426210)).toBe(true);
    expect(result.has(431960)).toBe(false);
  });

  it('each returned entry has steamId, name, tags, genres, features', async () => {
    const result = await fetchGameMetadata([730, 105600]);
    for (const [, meta] of result) {
      expect(typeof meta.steamId).toBe('number');
      expect(typeof meta.name).toBe('string');
      expect(Array.isArray(meta.tags)).toBe(true);
      expect(Array.isArray(meta.genres)).toBe(true);
      expect(Array.isArray(meta.features)).toBe(true);
    }
  });

  it('handles a completely unknown appid gracefully (empty result)', async () => {
    const result = await fetchGameMetadata([999999999]);
    expect(result.size).toBe(0);
  });
});

const {
  buildTagProfile,
  filterMultiplayerGames,
  scoreAndRank,
} = require('../../src/services/scoringService');

// ─── Fixtures ────────────────────────────────────────────────────────────────

// Minimal metadata map used across scoring tests
const makeMetadataMap = (entries) => new Map(entries.map((e) => [e.steamId, e]));

// Two-game library with clean numbers:
//   Game A: playtime=1000, tags=['FPS','Shooter']  → each tag weight: (1000/2000)/2 = 0.25
//   Game B: playtime=1000, tags=['RPG']             → tag weight:       (1000/2000)/1 = 0.50
const P1_GAMES = [
  { appid: 1, playtime_forever: 1000 },
  { appid: 2, playtime_forever: 1000 },
];
const P1_METADATA = makeMetadataMap([
  { steamId: 1, name: 'Game A', tags: ['FPS', 'Shooter'], genres: [], features: [] },
  { steamId: 2, name: 'Game B', tags: ['RPG'],            genres: [], features: [] },
]);
// Expected P1 profile: { FPS: 0.25, Shooter: 0.25, RPG: 0.50 }

// Single-game library:
//   Game C: playtime=3000, tags=['FPS','Multiplayer','PvP']  → each tag: 1.0/3 ≈ 0.3333
const P2_GAMES = [
  { appid: 3, playtime_forever: 3000 },
];
const P2_METADATA = makeMetadataMap([
  { steamId: 3, name: 'Game C', tags: ['FPS', 'Multiplayer', 'PvP'], genres: [], features: [] },
]);
// Expected P2 profile: { FPS: 1/3, Multiplayer: 1/3, PvP: 1/3 }

// Shared multiplayer game for scoring:
//   Game D: tags=['FPS','Shooter','Multiplayer','Co-op']
//   P1 score: FPS(0.25) + Shooter(0.25) = 0.50
//   P2 score: FPS(1/3) + Multiplayer(1/3) = 2/3 ≈ 0.6667
//   Combined: sqrt(0.50 * 0.6667) ≈ 0.5774
const SHARED_GAME_D = { steamId: 4, name: 'Game D', tags: ['FPS', 'Shooter', 'Multiplayer', 'Co-op'], genres: [], features: [] };

// ─── buildTagProfile ─────────────────────────────────────────────────────────

describe('buildTagProfile', () => {
  it('returns a Map of tag → weight', () => {
    const profile = buildTagProfile(P1_GAMES, P1_METADATA);
    expect(profile).toBeInstanceOf(Map);
    expect(profile.has('FPS')).toBe(true);
    expect(profile.has('RPG')).toBe(true);
  });

  it('normalises by total playtime so players with different totals are comparable', () => {
    // Doubling all playtimes should produce identical weights
    const doubledGames = P1_GAMES.map((g) => ({
      ...g,
      playtime_forever: g.playtime_forever * 2,
    }));
    const profile1 = buildTagProfile(P1_GAMES, P1_METADATA);
    const profile2 = buildTagProfile(doubledGames, P1_METADATA);
    for (const [tag, weight] of profile1) {
      expect(profile2.get(tag)).toBeCloseTo(weight, 10);
    }
  });

  it('divides each game\'s playtime share equally among its tags', () => {
    // Game A (50% of playtime, 2 tags) → FPS = 0.25, Shooter = 0.25
    const profile = buildTagProfile(P1_GAMES, P1_METADATA);
    expect(profile.get('FPS')).toBeCloseTo(0.25, 10);
    expect(profile.get('Shooter')).toBeCloseTo(0.25, 10);
  });

  it('gives more weight per tag to games with fewer tags', () => {
    // Game B (50% of playtime, 1 tag) → RPG = 0.50 (> FPS or Shooter at 0.25)
    const profile = buildTagProfile(P1_GAMES, P1_METADATA);
    expect(profile.get('RPG')).toBeGreaterThan(profile.get('FPS'));
  });

  it('sums contributions from multiple games that share a tag', () => {
    const games = [
      { appid: 10, playtime_forever: 1000 },
      { appid: 11, playtime_forever: 1000 },
    ];
    const metadata = makeMetadataMap([
      { steamId: 10, name: 'X', tags: ['FPS'], genres: [], features: [] },
      { steamId: 11, name: 'Y', tags: ['FPS', 'Shooter'], genres: [], features: [] },
    ]);
    const profile = buildTagProfile(games, metadata);
    // Game 10: FPS = 0.5/1 = 0.5
    // Game 11: FPS = 0.5/2 = 0.25, Shooter = 0.25
    // Total FPS: 0.5 + 0.25 = 0.75
    expect(profile.get('FPS')).toBeCloseTo(0.75, 10);
    expect(profile.get('Shooter')).toBeCloseTo(0.25, 10);
  });

  it('skips games that are missing from the metadata map', () => {
    const gamesWithUnknown = [...P1_GAMES, { appid: 9999, playtime_forever: 9999 }];
    // Should not throw; unknown appid is silently ignored
    expect(() => buildTagProfile(gamesWithUnknown, P1_METADATA)).not.toThrow();
    const profile = buildTagProfile(gamesWithUnknown, P1_METADATA);
    // Still has expected tags from known games
    expect(profile.has('FPS')).toBe(true);
  });

  it('returns an empty Map for an empty game list', () => {
    const profile = buildTagProfile([], P1_METADATA);
    expect(profile.size).toBe(0);
  });
});

// ─── filterMultiplayerGames ──────────────────────────────────────────────────
// Returns the subset of appids that have at least one recognised online-multiplayer
// tag ('Multiplayer', 'Online Co-Op', 'Co-op', 'Online PvP', 'PvP', 'MMO', 'MMORPG').
// Games whose ONLY multiplayer signal is a local-only tag ('Local Co-Op',
// 'Local Multiplayer', 'Split Screen') are excluded.

describe('filterMultiplayerGames', () => {
  const multiplayerGame = {
    steamId: 100,
    name: 'Online Shooter',
    tags: ['FPS', 'Multiplayer', 'PvP', 'Competitive'],
    genres: [], features: [],
  };
  const coopGame = {
    steamId: 101,
    name: 'Co-op Adventure',
    tags: ['Adventure', 'Co-op', 'Online Co-Op'],
    genres: [], features: [],
  };
  const localOnlyGame = {
    steamId: 102,
    name: 'Couch Co-Op Party',
    tags: ['Local Co-Op', 'Local Multiplayer', 'Split Screen', 'Party Game'],
    genres: [], features: [],
  };
  const soloGame = {
    steamId: 103,
    name: 'Solo RPG',
    tags: ['RPG', 'Singleplayer', 'Story Rich'],
    genres: [], features: [],
  };
  // Has both online and local tags — should be included (it has online play)
  const mixedGame = {
    steamId: 104,
    name: 'It Takes Two',
    tags: ['Co-op', 'Online Co-Op', 'Local Co-Op', 'Local Multiplayer', 'Split Screen'],
    genres: [], features: [],
  };

  const metadata = makeMetadataMap([
    multiplayerGame, coopGame, localOnlyGame, soloGame, mixedGame,
  ]);
  const sharedAppids = [100, 101, 102, 103, 104];

  it('includes games with a Multiplayer tag', () => {
    const result = filterMultiplayerGames(sharedAppids, metadata);
    expect(result).toContain(100);
  });

  it('includes games with a Co-op or Online Co-Op tag', () => {
    const result = filterMultiplayerGames(sharedAppids, metadata);
    expect(result).toContain(101);
  });

  it('excludes games whose only multiplayer tags are local-only', () => {
    const result = filterMultiplayerGames(sharedAppids, metadata);
    expect(result).not.toContain(102);
  });

  it('excludes single-player games with no multiplayer tags', () => {
    const result = filterMultiplayerGames(sharedAppids, metadata);
    expect(result).not.toContain(103);
  });

  it('includes games that have both online and local tags', () => {
    const result = filterMultiplayerGames(sharedAppids, metadata);
    expect(result).toContain(104);
  });

  it('silently skips appids absent from metadata', () => {
    expect(() => filterMultiplayerGames([999], metadata)).not.toThrow();
    const result = filterMultiplayerGames([999], metadata);
    expect(result).not.toContain(999);
  });

  it('returns an empty array when no shared games are multiplayer', () => {
    const result = filterMultiplayerGames([103], metadata);
    expect(result).toHaveLength(0);
  });

  it('recognises the full set of online-multiplayer tags', () => {
    const tagVariants = [
      { steamId: 200, tags: ['Multiplayer'],   name: 'M', genres: [], features: [] },
      { steamId: 201, tags: ['Online Co-Op'],  name: 'OC', genres: [], features: [] },
      { steamId: 202, tags: ['Co-op'],         name: 'C', genres: [], features: [] },
      { steamId: 203, tags: ['Online PvP'],    name: 'OP', genres: [], features: [] },
      { steamId: 204, tags: ['PvP'],           name: 'P', genres: [], features: [] },
      { steamId: 205, tags: ['MMO'],           name: 'MMO', genres: [], features: [] },
      { steamId: 206, tags: ['MMORPG'],        name: 'MMORPG', genres: [], features: [] },
    ];
    const m = makeMetadataMap(tagVariants);
    const result = filterMultiplayerGames([200, 201, 202, 203, 204, 205, 206], m);
    expect(result).toEqual(expect.arrayContaining([200, 201, 202, 203, 204, 205, 206]));
  });
});

// ─── scoreAndRank ────────────────────────────────────────────────────────────
// scoreAndRank(sharedMultiplayerAppids, metadataMap, p1Profile, p2Profile, p1Games, p2Games)
// Returns a sorted array of result objects:
//   { appid, name, score, p1Playtime, p2Playtime, topTags }
// Sorted descending by score (geometric mean of per-player tag scores).

describe('scoreAndRank', () => {
  // Build real profiles from fixtures
  let p1Profile, p2Profile;

  beforeAll(() => {
    const combinedMeta = new Map([...P1_METADATA, ...P2_METADATA]);
    p1Profile = buildTagProfile(P1_GAMES, combinedMeta);
    p2Profile = buildTagProfile(P2_GAMES, combinedMeta);
  });

  const sharedMeta = makeMetadataMap([SHARED_GAME_D]);

  // P1 games include appid=1,2 only; appid=4 is in their shared library
  const p1GamesWithShared = [...P1_GAMES, { appid: 4, playtime_forever: 200 }];
  const p2GamesWithShared = [...P2_GAMES, { appid: 4, playtime_forever: 350 }];

  it('returns an array of result objects', () => {
    const results = scoreAndRank([4], sharedMeta, p1Profile, p2Profile, p1GamesWithShared, p2GamesWithShared);
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(1);
  });

  it('each result has appid, name, score, p1Playtime, p2Playtime', () => {
    const results = scoreAndRank([4], sharedMeta, p1Profile, p2Profile, p1GamesWithShared, p2GamesWithShared);
    const r = results[0];
    expect(r).toHaveProperty('appid', 4);
    expect(r).toHaveProperty('name', 'Game D');
    expect(r).toHaveProperty('score');
    expect(r).toHaveProperty('p1Playtime');
    expect(r).toHaveProperty('p2Playtime');
  });

  it('uses the geometric mean of per-player scores', () => {
    // P1 profile: FPS=0.25, Shooter=0.25, RPG=0.50
    // P2 profile: FPS=1/3, Multiplayer=1/3, PvP=1/3
    // Game D tags: ['FPS','Shooter','Multiplayer','Co-op']
    // P1 score: 0.25 + 0.25 = 0.50
    // P2 score: 1/3 + 1/3 = 2/3
    // Combined: sqrt(0.50 * 2/3) = sqrt(1/3) ≈ 0.5774
    const results = scoreAndRank([4], sharedMeta, p1Profile, p2Profile, p1GamesWithShared, p2GamesWithShared);
    expect(results[0].score).toBeCloseTo(Math.sqrt(0.5 * (2 / 3)), 4);
  });

  it('attaches correct playtime values from each player\'s game list', () => {
    const results = scoreAndRank([4], sharedMeta, p1Profile, p2Profile, p1GamesWithShared, p2GamesWithShared);
    expect(results[0].p1Playtime).toBe(200);
    expect(results[0].p2Playtime).toBe(350);
  });

  it('sorts descending by score', () => {
    const metaTwo = makeMetadataMap([
      SHARED_GAME_D,
      // Game E: only has RPG — strong for P1, zero for P2 → lower geometric mean
      { steamId: 5, name: 'Game E', tags: ['RPG', 'Singleplayer'], genres: [], features: [] },
    ]);
    const p1WithTwo = [...p1GamesWithShared, { appid: 5, playtime_forever: 100 }];
    const p2WithTwo = [...p2GamesWithShared, { appid: 5, playtime_forever: 100 }];
    const results = scoreAndRank([4, 5], metaTwo, p1Profile, p2Profile, p1WithTwo, p2WithTwo);
    expect(results.length).toBe(2);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });

  it('scores near zero when one player has no tag overlap with the game', () => {
    // Game F: only has 'Horror','Atmospheric' — neither profile has those tags
    const metaF = makeMetadataMap([
      { steamId: 6, name: 'Game F', tags: ['Horror', 'Atmospheric'], genres: [], features: [] },
    ]);
    const p1WithF = [...P1_GAMES, { appid: 6, playtime_forever: 0 }];
    const p2WithF = [...P2_GAMES, { appid: 6, playtime_forever: 0 }];
    const results = scoreAndRank([6], metaF, p1Profile, p2Profile, p1WithF, p2WithF);
    expect(results[0].score).toBe(0);
  });

  it('geometric mean penalises games one player loves but the other has no history with', () => {
    // P2 has zero RPG affinity; even though P1 loves RPG, combined score should be low
    const rpgGame = { steamId: 7, name: 'RPG Game', tags: ['RPG', 'Singleplayer'], genres: [], features: [] };
    const metaRPG = makeMetadataMap([rpgGame]);
    // P2 profile has no RPG → P2 score = 0 → geometric mean = 0
    const results = scoreAndRank([7], metaRPG, p1Profile, p2Profile,
      [...P1_GAMES, { appid: 7, playtime_forever: 500 }],
      [...P2_GAMES, { appid: 7, playtime_forever: 200 }]
    );
    expect(results[0].score).toBe(0);
  });

  it('returns an empty array when given no appids', () => {
    const results = scoreAndRank([], sharedMeta, p1Profile, p2Profile, P1_GAMES, P2_GAMES);
    expect(results).toHaveLength(0);
  });
});

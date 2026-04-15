// Real Gamalytic API response shapes confirmed against live API.
// Field name for app ID is `steamId` (NOT `appid`).
// `tags` and `features` require the `api-key` header — silently omitted without it.

// Metadata for the 6 shared multiplayer games between P1 and P2.
// Wallpaper Engine (431960) is NOT indexed in Gamalytic — it's silently absent.
const SHARED_GAMES_METADATA = [
  {
    steamId: 730,
    name: 'Counter-Strike 2',
    tags: [
      'FPS', 'Shooter', 'Multiplayer', 'Competitive', 'Action',
      'Team-Based', 'eSports', 'Tactical', 'First-Person', 'PvP',
      'Online Co-Op', 'Co-op', 'Strategy', 'Military', 'War',
      'Difficult', 'Trading', 'Realistic', 'Fast-Paced', 'Moddable',
    ],
    genres: ['Action', 'Free To Play'],
    features: [
      'Cross-Platform Multiplayer', 'Steam Trading Cards', 'Steam Workshop',
      'In-App Purchases', 'Stats',
    ],
  },
  {
    steamId: 105600,
    name: 'Terraria',
    tags: [
      'Open World Survival Craft', 'Sandbox', 'Survival', '2D', 'Multiplayer',
      'Pixel Graphics', 'Adventure', 'Crafting', 'Building', 'Exploration',
      'Co-op', 'Open World', 'Indie', 'Online Co-Op', 'Action', 'RPG',
      'Singleplayer', 'Replay Value', 'Platformer', 'Atmospheric',
    ],
    genres: ['Action', 'Adventure', 'RPG'],
    features: [
      'Single-player', 'Online PvP', 'Online Co-op', 'Steam Achievements',
      'Steam Trading Cards', 'Steam Cloud',
    ],
  },
  {
    steamId: 252490,
    name: 'Rust',
    tags: [
      'Survival', 'Crafting', 'Multiplayer', 'Open World', 'Open World Survival Craft',
      'Building', 'PvP', 'Sandbox', 'Adventure', 'First-Person', 'Action', 'Nudity',
      'FPS', 'Shooter', 'Co-op', 'Online Co-Op', 'Indie', 'Post-apocalyptic',
      'Early Access', 'Simulation',
    ],
    genres: ['Action', 'Adventure', 'Massively Multiplayer'],
    features: [
      'MMO', 'Online PvP', 'Online Co-op', 'Cross-Platform Multiplayer',
      'Steam Achievements', 'Steam Trading Cards', 'Steam Workshop', 'In-App Purchases',
    ],
  },
  {
    steamId: 477160,
    name: 'Human Fall Flat',
    tags: [
      'Co-op', 'Funny', 'Puzzle', 'Adventure', 'Multiplayer', 'Physics', 'Sandbox',
      'Puzzle Platformer', 'Action', 'Open World', 'Local Co-Op', 'Indie',
      'Local Multiplayer', 'Comedy', 'Parkour', 'Casual', 'Split Screen',
      'Singleplayer', '3D Platformer', 'Simulation',
    ],
    genres: ['Adventure', 'Casual', 'Indie'],
    features: [
      'Single-player', 'Online PvP', 'Shared/Split Screen Co-op', 'Steam Achievements',
      'Remote Play Together',
    ],
  },
  {
    steamId: 1245620,
    name: 'ELDEN RING',
    tags: [
      'Souls-like', 'Open World', 'Dark Fantasy', 'RPG', 'Difficult', 'Action RPG',
      'Multiplayer', 'Third Person', 'Fantasy', 'Singleplayer', 'Online Co-Op',
      'Action', 'Co-op', 'Atmospheric', 'Great Soundtrack', 'PvP', 'Violent',
      '3D', 'Character Customization', 'Family Friendly',
    ],
    genres: ['Action', 'RPG'],
    features: [
      'Single-player', 'Online PvP', 'Online Co-op', 'Steam Achievements',
      'Steam Trading Cards', 'Steam Cloud', 'Family Sharing',
    ],
  },
  {
    steamId: 1426210,
    name: 'It Takes Two',
    tags: [
      'Co-op', 'Multiplayer', 'Split Screen', 'Local Co-Op', 'Online Co-Op', 'Puzzle',
      'Adventure', 'Story Rich', 'Co-op Campaign', 'Local Multiplayer', 'Puzzle Platformer',
      'Action-Adventure', '3D Platformer', 'Emotional', 'Platformer', 'Action',
      'Exploration', 'Atmospheric', 'Minigames', 'Female Protagonist',
    ],
    genres: ['Action', 'Adventure'],
    features: [
      'Online Co-op', 'Shared/Split Screen Co-op', 'Steam Achievements',
      'Steam Trading Cards', 'Steam Cloud', 'Remote Play Together',
    ],
  },
];

// Single-page response wrapping the shared games metadata
const GAMALYTIC_RESPONSE_SINGLE_PAGE = {
  pages: 1,
  total: 6,
  result: SHARED_GAMES_METADATA,
};

// Multi-page response used for pagination tests
const GAMALYTIC_RESPONSE_PAGE_0 = {
  pages: 2,
  total: 8,
  result: SHARED_GAMES_METADATA.slice(0, 4),
};

const GAMALYTIC_RESPONSE_PAGE_1 = {
  pages: 2,
  total: 8,
  result: SHARED_GAMES_METADATA.slice(4),
};

// A game with only local-only multiplayer tags — should be excluded from recommendations
const LOCAL_ONLY_GAME = {
  steamId: 888888,
  name: 'Couch Party Game',
  tags: ['Local Co-Op', 'Local Multiplayer', 'Split Screen', 'Casual', 'Party Game'],
  genres: ['Casual'],
  features: ['Shared/Split Screen Co-op'],
};

// A completely single-player game — should be excluded
const SINGLEPLAYER_GAME = {
  steamId: 777777,
  name: 'Solo Adventure',
  tags: ['Singleplayer', 'RPG', 'Story Rich', 'Open World'],
  genres: ['RPG'],
  features: ['Single-player', 'Steam Achievements'],
};

module.exports = {
  SHARED_GAMES_METADATA,
  GAMALYTIC_RESPONSE_SINGLE_PAGE,
  GAMALYTIC_RESPONSE_PAGE_0,
  GAMALYTIC_RESPONSE_PAGE_1,
  LOCAL_ONLY_GAME,
  SINGLEPLAYER_GAME,
};

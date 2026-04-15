// Real API response shapes confirmed against the Steam Web API.
// include_played_free_games=1 is required — without it free-to-play games
// (e.g. PUBG, CS2) are silently omitted even when the player has hundreds of hours.
// Profiles used for integration testing:
//   P1: steamcommunity.com/id/504316002  → Steam64 76561198368877318  (public, 117 games incl. F2P)
//   P2: steamcommunity.com/id/PhaNtazM1337 → Steam64 76561198954620186 (public, 45 games incl. F2P)

const P1_VANITY = '504316002';
const P1_STEAM_ID = '76561198368877318';

const P2_VANITY = 'PhaNtazM1337';
const P2_STEAM_ID = '76561198954620186';

// steamcommunity.com/id/mikuchankawaii — private profile, cannot fetch library
const PRIVATE_VANITY = 'mikuchankawaii';
const PRIVATE_STEAM_ID = '76561198871256866';

// --- ResolveVanityURL response shapes ---

const RESOLVE_VANITY_SUCCESS = {
  response: { steamid: P1_STEAM_ID, success: 1 },
};

const RESOLVE_VANITY_P2_SUCCESS = {
  response: { steamid: P2_STEAM_ID, success: 1 },
};

const RESOLVE_VANITY_NOT_FOUND = {
  response: { success: 42, message: 'No match' },
};

// --- GetOwnedGames response shapes ---

// Abbreviated subset of P1's real library (top games by playtime).
// Full library has 117 games incl. F2P; most have >=30 min playtime.
const GET_OWNED_GAMES_P1 = {
  response: {
    game_count: 117,
    games: [
      { appid: 359550, name: "Tom Clancy's Rainbow Six Siege", playtime_forever: 114987 },
      { appid: 730,    name: 'Counter-Strike 2',               playtime_forever: 9578   },
      { appid: 1245620,name: 'ELDEN RING',                     playtime_forever: 21834  },
      { appid: 578080, name: 'PUBG: BATTLEGROUNDS',            playtime_forever: 19955  },
      { appid: 105600, name: 'Terraria',                       playtime_forever: 1132   },
      { appid: 252490, name: 'Rust',                           playtime_forever: 137    },
      { appid: 431960, name: 'Wallpaper Engine',               playtime_forever: 5552   },
      { appid: 477160, name: 'Human Fall Flat',                playtime_forever: 212    },
      { appid: 1426210,name: 'It Takes Two',                   playtime_forever: 546    },
      { appid: 289070, name: "Sid Meier's Civilization VI",    playtime_forever: 16793  },
      // Below 30-minute threshold — should be excluded
      { appid: 999991, name: 'Unplayed Bundle Game A',         playtime_forever: 0      },
      { appid: 999992, name: 'Unplayed Bundle Game B',         playtime_forever: 15     },
    ],
  },
};

// Abbreviated subset of P2's real library (top games by playtime).
// Full library has 45 games incl. F2P; most have >=30 min playtime.
const GET_OWNED_GAMES_P2 = {
  response: {
    game_count: 45,
    games: [
      { appid: 730,    name: 'Counter-Strike 2',               playtime_forever: 106568 },
      { appid: 252490, name: 'Rust',                           playtime_forever: 6400   },
      { appid: 105600, name: 'Terraria',                       playtime_forever: 4211   },
      { appid: 1174180,name: 'Red Dead Redemption 2',          playtime_forever: 3039   },
      { appid: 1621690,name: 'Core Keeper',                    playtime_forever: 1400   },
      { appid: 431960, name: 'Wallpaper Engine',               playtime_forever: 427    },
      { appid: 477160, name: 'Human Fall Flat',                playtime_forever: 93     },
      { appid: 1245620,name: 'ELDEN RING',                     playtime_forever: 86     },
      { appid: 1426210,name: 'It Takes Two',                   playtime_forever: 259    },
      { appid: 1435790,name: 'Escape Simulator',               playtime_forever: 662    },
      // Below threshold
      { appid: 999993, name: 'Unplayed Bundle Game C',         playtime_forever: 5      },
    ],
  },
};

// Private profile — GetOwnedGames returns empty response object
const GET_OWNED_GAMES_PRIVATE = {
  response: {},
};

// Shared appids between P1 and P2 (both with >=30 min playtime):
//   730 (CS2), 105600 (Terraria), 252490 (Rust),
//   431960 (Wallpaper Engine), 477160 (Human Fall Flat),
//   1245620 (Elden Ring), 1426210 (It Takes Two)
const SHARED_APPIDS = [730, 105600, 252490, 431960, 477160, 1245620, 1426210];

// Shared appids that are actual online multiplayer games (Wallpaper Engine excluded —
// not indexed in Gamalytic; not a game):
const SHARED_MULTIPLAYER_APPIDS = [730, 105600, 252490, 477160, 1245620, 1426210];

module.exports = {
  P1_VANITY,
  P1_STEAM_ID,
  P2_VANITY,
  P2_STEAM_ID,
  PRIVATE_VANITY,
  PRIVATE_STEAM_ID,
  RESOLVE_VANITY_SUCCESS,
  RESOLVE_VANITY_P2_SUCCESS,
  RESOLVE_VANITY_NOT_FOUND,
  GET_OWNED_GAMES_P1,
  GET_OWNED_GAMES_P2,
  GET_OWNED_GAMES_PRIVATE,
  SHARED_APPIDS,
  SHARED_MULTIPLAYER_APPIDS,
};

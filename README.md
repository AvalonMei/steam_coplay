# Steam Co-play Recommender

Find multiplayer games two Steam players will both actually enjoy — ranked by how well each game fits both players' preferences, not just "games you both own."

## How it works

1. Enter any two Steam profiles (URL, ID, vanity name, or display name)
2. The app fetches both libraries and builds a **tag preference profile** for each player from their playtime history
3. Shared multiplayer games are scored using the **geometric mean** of each player's affinity score — so a game one person loves but the other has never touched ranks low
4. Results are sorted by that combined score and displayed with playtime, match percentage, and the tags driving the ranking

## Features

- **Flexible player input** — accepts any of:
  - Full profile URL (`steamcommunity.com/id/your_vanity_name`)
  - Steam64 ID (`76561198XXXXXXXXX`)
  - Vanity URL slug (`your_vanity_name`)
  - Display name (`SomeGamer123`) — searches Steam community and shows a candidate picker
- **Auto-resolution** — profiles are looked up as you type (500 ms debounce) with avatar confirmation before you submit
- **Free-to-play games included** — uses `include_played_free_games=1` so games like PUBG, CS2, and Apex don't go missing
- **Private profile detection** — clear error message with instructions if either profile is hidden
- **Gamalytic metadata** — tags, genres, and Steam features fetched in one batch call; paginated automatically for large combined libraries

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite, CSS Modules |
| Backend | Node.js + Express |
| Game metadata | [Gamalytic API](https://gamalytic.com) |
| Player data | [Steam Web API](https://steamcommunity.com/dev) |
| Player search | Steam community search (anonymous session) |

## Getting started

### Prerequisites

- Node.js 18+
- A [Steam Web API key](https://steamcommunity.com/dev/apikey)
- A [Gamalytic API key](https://gamalytic.com)

### Setup

```bash
git clone <repo>
cd steam_coplay

# Install all dependencies
npm run install:all
```

Create a `.env` file in the project root:

```
STEAM_API_KEY=your_steam_key_here
GAMALYTIC_API_KEY=your_gamalytic_key_here
```

### Running

```bash
# Start both backend (port 3001) and frontend (port 5173) together
npm run dev
```

Or run them separately:

```bash
# Backend only
npm run backend

# Frontend only
npm run frontend
```

Open `http://localhost:5173`.

## Project structure

```
steam_coplay/
├── backend/
│   ├── src/
│   │   ├── index.js                  Express entry point (port 3001)
│   │   ├── routes/
│   │   │   ├── recommend.js          POST /api/recommend
│   │   │   └── searchPlayer.js       GET  /api/search-player
│   │   └── services/
│   │       ├── steamService.js       ResolveVanityURL, GetOwnedGames, GetPlayerSummaries
│   │       ├── gamalyticService.js   Batch metadata fetch with pagination
│   │       ├── scoringService.js     Tag profiles, multiplayer filter, geometric mean scoring
│   │       └── steamSearch.js        Community search with session + result cache
│   └── tests/
│       ├── unit/                     Jest unit tests (mocked axios) — 51 tests
│       ├── integration/              Real API integration tests
│       └── fixtures/                 Recorded API response shapes
└── frontend/
    └── src/
        ├── App.jsx                   Top-level state and layout
        └── components/
            ├── PlayerInput.jsx       Input with live search, profile chip, candidate dropdown
            ├── SearchForm.jsx        Two-player form
            ├── ResultsList.jsx       Ranked results
            └── GameCard.jsx          Game image, score bar, playtimes, tag badges
```

## API endpoints

### `POST /api/recommend`

```json
{ "player1": "<any supported input>", "player2": "<any supported input>" }
```

Returns ranked recommendations or an error with `code` and `player` (1 or 2) fields so the UI can highlight which input failed.

### `GET /api/search-player?q=<query>`

Returns up to ~18 candidate profiles from Steam community search. Results are cached for 2 minutes to avoid rate limits.

## Tests

```bash
cd backend

# Unit tests (no API calls, fast)
npm test

# Integration tests (real API calls, ~30s)
npm run test:integration
```

## Scoring algorithm

For each player, a tag weight map is built from their full library:

```
weight(tag) = Σ  (game_playtime / total_playtime) / num_tags_on_game
```

Each shared multiplayer game is then scored:

```
combined = √(score_p1 × score_p2)
```

The geometric mean ensures both players must have affinity. A game one player has 500 hours in but the other has never touched scores close to zero.

Multiplayer games are identified by the presence of any of these Gamalytic tags: `Multiplayer`, `Online Co-Op`, `Co-op`, `Online PvP`, `PvP`, `MMO`, `MMORPG`. Local-only tags (`Local Co-Op`, `Local Multiplayer`, `Split Screen`) don't qualify on their own.

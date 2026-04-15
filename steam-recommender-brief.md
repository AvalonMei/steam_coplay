# Steam Shared Game Recommender

## What This App Does

A web app where two users enter their Steam profile URLs or Steam IDs. The app finds multiplayer games they both own and ranks them by how well each game matches both players' gaming preferences — not just "games you both have" but "games you'd both actually enjoy playing together."

## Tech Stack

- React frontend, Node/Express backend
- Backend is required because API keys (Steam, Gamalytic) cannot be exposed client-side

## APIs Used

### Steam Web API (free, key from steamcommunity.com/dev/apikey)

**Resolve vanity URLs:**
```
GET https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=KEY&vanityurl=NAME
```
Needed because users may paste `steamcommunity.com/id/customname` (vanity) instead of `steamcommunity.com/profiles/76561198012345678` (Steam64 ID). The app should handle both formats, plus raw IDs/names.

**Fetch owned games:**
```
GET https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=KEY&steamid=ID&include_appinfo=1
```
Returns list of owned games with `appid`, `name`, and `playtime_forever` (minutes). Returns empty if the profile is private — detect and surface this clearly.

### Gamalytic API (key required, check gamalytic.com for access)

**Batch fetch game metadata:**
```
GET https://api.gamalytic.com/steam-games/list
  ?appids=730,570,440,...          // comma-separated appid filter
  &fields=appid,name,tags,genres   // comma-separated list of fields to return
  &limit=1000                      // IMPORTANT: default is 100, max is 1000
  &page=0                          // zero-indexed pagination
```
- `appids`: comma-separated filter to return only specific games
- `fields`: comma-separated list of fields to include in the response
- `limit`: number of results per page — **defaults to 100**, must explicitly set to 1000
- `page`: zero-indexed page number — if results exceed the limit, paginate with page=0, page=1, etc.
- Rate limits: 240 requests/min when sorting by id or revenue, 30 requests/min for other sort keys
- Returns tags and genres per game, which we use for multiplayer filtering and preference profiling
- If the union of both libraries exceeds 1000 games, paginate across multiple requests

### Steam CDN (no key needed)

Game header images: `https://cdn.akamai.steamstatic.com/steam/apps/{appid}/header.jpg`

## Core Algorithm

### Step 1: Fetch both libraries
Fetch owned games for both players in parallel. Filter out games with less than 30 minutes playtime (removes noise from free games, untouched bundles, etc.).

### Step 2: Batch fetch metadata
Send the **union** of all appids from both libraries to Gamalytic in one call (set `limit=1000` explicitly — the default is only 100). We need metadata for every game (not just shared ones) because we build preference profiles from each player's full library. If the union exceeds 1000, paginate with `page=0`, `page=1`, etc.

### Step 3: Build player tag profiles
For each player, build a weighted tag preference vector from their entire library:

- Normalize each game's playtime as a fraction of the player's total playtime (so a 5000-hour player and a 200-hour player are on equal footing)
- Each game distributes its normalized playtime across its tags, divided by the number of tags on that game (so a game with 3 tags contributes more per-tag than one with 15)
- Result: a dictionary of `tag → weight` representing what each player actually enjoys

### Step 4: Filter shared multiplayer games
From games both players own, keep only those with at least one online multiplayer tag.

Multiplayer tags to include: `Multiplayer`, `Online Co-op`, `Co-op`, `Online PvP`, `PvP`, `MMO`, `MMORPG`

Exclude local-only tags: `Local Co-op`, `Local Multiplayer`, `Split Screen`

### Step 5: Score and rank
For each shared multiplayer game:
- Score it against player 1's tag profile (sum of tag weights for that game's tags)
- Score it against player 2's tag profile (same)
- Combine using geometric mean: `sqrt(score_p1 * score_p2)`

Geometric mean ensures both players must have affinity. A game one player loves but the other has zero history with scores low.

Sort descending by combined score.

## Important Edge Cases

- **Private profiles:** `GetOwnedGames` returns empty for private profiles. Detect this and tell the user clearly, mentioning they need to change their Steam privacy settings.
- **No shared multiplayer games:** Show a fallback — top multiplayer games from either library as "one of you should try this" suggestions.
- **Zero playtime games:** Filtered out at 30-minute threshold. Don't let them contribute to tag profiles.
- **Union exceeds 1000 games:** Paginate Gamalytic requests (page=0, page=1, etc. with limit=1000). This is rare but possible for two large libraries.
- **Games missing from Gamalytic:** Some very obscure/delisted games may not have metadata. Skip them gracefully.

## What the UI Should Show

**Input:** Two text fields for Steam URLs/IDs, a submit button.

**Results:** A ranked list of game cards, each showing:
- Game name and header image
- A compatibility/match score
- Both players' playtime in that game
- Tag badges showing why it ranked high (highlight tags both players share affinity for)

**Error states:** Private profile, user not found, no shared games — each with a clear, helpful message.

## Environment Variables

```
STEAM_API_KEY=...
GAMALYTIC_API_KEY=...
```

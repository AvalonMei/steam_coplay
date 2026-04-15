# API Reference

Verified endpoints and response shapes for the Steam Co-play Recommender.

---

## Gamalytic — `/steam-games/list`

**Base URL:** `https://api.gamalytic.com/steam-games/list`  
**Auth:** `api-key: <GAMALYTIC_API_KEY>` header (NOT `Authorization: Bearer`)  
**Rate limit:** 240 req/min when sorting by `id` or `revenue`; 30 req/min otherwise

### Request

```bash
curl -X GET \
  'https://api.gamalytic.com/steam-games/list?limit=1000&page=0&fields=steamId,name,tags,genres&appids=730,570,440' \
  -H 'accept: application/json' \
  -H 'api-key: YOUR_KEY'
```

| Param | Type | Notes |
|---|---|---|
| `appids` | string | Comma-separated Steam app IDs to filter by |
| `fields` | string | Comma-separated fields to return (see below) |
| `limit` | number | Max results per page. Default 100, **max 1000** — always set explicitly |
| `page` | number | Zero-indexed page number |
| `release_status` | string | `released` \| `unreleased` \| `early_access` \| `all` |

### Available fields (confirmed with key)

| Field | Type | Notes |
|---|---|---|
| `steamId` | number | Steam app ID — **this is what we use as the game identifier** |
| `id` | number | Same as `steamId` |
| `name` | string | Game title |
| `tags` | string[] | Community Steam tags — **requires `api-key` header** |
| `genres` | string[] | Steam genres — available without key too |
| `features` | string[] | Steam store features (e.g. "Cross-Platform Multiplayer") — with key |
| `price` | number | Current price in USD |
| `reviewScore` | number | Metacritic-style review score |
| `copiesSold` | number | Estimated copies sold |
| `revenue` | number | Estimated revenue |
| `developers` | string[] | Developer names |
| `publishers` | string[] | Publisher names |
| `publisherClass` | string | e.g. `"AAA"`, `"Indie"` |
| `earlyAccess` | boolean | Currently in Early Access |
| `unreleased` | boolean | Not yet released |
| `firstReleaseDate` | number | Unix epoch ms |
| `releaseDate` | number | Unix epoch ms |
| `earlyAccessExitDate` | number | Unix epoch ms |
| `followers` | number | Steam followers |
| `wishlists` | number | Steam wishlists |
| `avgPlaytime` | number | Average playtime (hours) |

### Response shape

```json
{
  "pages": 1,
  "total": 1,
  "result": [
    {
      "steamId": 730,
      "id": 730,
      "name": "Counter-Strike 2",
      "copiesSold": 343456914,
      "revenue": 11171295214,
      "unreleased": false,
      "earlyAccess": false,
      "firstReleaseDate": 1335830400000,
      "releaseDate": 1345521600000,
      "earlyAccessExitDate": 1345521600000,
      "price": 0,
      "developers": ["Valve"],
      "publishers": ["Valve"],
      "publisherClass": "AAA",
      "reviewScore": 86,
      "followers": 4771534,
      "wishlists": 199100,
      "avgPlaytime": 203.66,
      "genres": ["Action", "Free To Play"],
      "tags": [
        "FPS", "Shooter", "Multiplayer", "Competitive", "Action",
        "Team-Based", "eSports", "Tactical", "First-Person", "PvP",
        "Online Co-Op", "Co-op", "Strategy", "Military", "War",
        "Difficult", "Trading", "Realistic", "Fast-Paced", "Moddable"
      ],
      "features": [
        "Cross-Platform Multiplayer",
        "Steam Trading Cards",
        "Steam Workshop",
        "In-App Purchases",
        "Stats",
        "Remote Play on Phone",
        "Remote Play on Tablet",
        "Remote Play on TV",
        "Steam Timeline"
      ],
      "aiContent": false
    }
  ],
  "cacheTimestamp": 1776261630592
}
```

### Pagination

- `total`: total number of matching games
- `pages`: total number of pages at current `limit`
- When results span multiple pages: loop `page=0, 1, 2, ...` until all collected
- `next` / `prev` objects appear in response when adjacent pages exist

### Gotchas

- Field name for the app ID is `steamId`, **not** `appid`
- `tags` is silently omitted without the `api-key` header — no error, just missing
- Appids not in the Gamalytic database are silently dropped from results (no error)
- GTA V (`appid: 271590`) is not indexed in Gamalytic

---

## Steam Web API — ResolveVanityURL

```bash
GET https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/
  ?key=STEAM_API_KEY
  &vanityurl=mikuchankawaii
```

### Success response

```json
{
  "response": {
    "steamid": "76561198871256866",
    "success": 1
  }
}
```

### Not found response

```json
{
  "response": {
    "success": 42,
    "message": "No match"
  }
}
```

### Notes

- `success: 1` = resolved OK; `success: 42` = vanity name not found
- `steamid` is returned as a **string** (64-bit int too large for JSON number)
- Numeric vanity URLs like `504316002` (from `/id/504316002/`) resolve fine
- `/profiles/76561198368877318` URLs already contain the Steam64 ID — no API call needed

### Test profiles (confirmed)

| Vanity URL | Steam64 ID | Notes |
|---|---|---|
| `504316002` | `76561198368877318` | Public library, 111 games, 62 with ≥30 min |
| `mikuchankawaii` | `76561198871256866` | **Private profile** — library hidden |

---

## Steam Web API — GetOwnedGames

```bash
GET https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/
  ?key=STEAM_API_KEY
  &steamid=76561198368877318
  &include_appinfo=1
```

### Response (public profile)

```json
{
  "response": {
    "game_count": 111,
    "games": [
      {
        "appid": 400,
        "name": "Portal",
        "playtime_forever": 180,
        "img_icon_url": "cfa928ab4119dd137e50d728e8fe703e4e970aff",
        "has_community_visible_stats": true,
        "playtime_windows_forever": 180,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0,
        "rtime_last_played": 1612889753,
        "playtime_disconnected": 0
      }
    ]
  }
}
```

### Response (private profile)

```json
{
  "response": {}
}
```

### Notes

- `playtime_forever` is in **minutes**
- Empty `response` object (no `games` key) means the profile is private
- We filter to games with `playtime_forever >= 30` to remove untouched bundle games
- `include_appinfo=1` is required to get `name` alongside `appid`
- **`include_played_free_games=1` is required** — without it, F2P games (PUBG, CS2, Apex, THE FINALS, etc.) are silently omitted even when the player has hundreds of hours

---

## Steam CDN — Game Header Images

No key required.

```
https://cdn.akamai.steamstatic.com/steam/apps/{appid}/header.jpg
```

Example: `https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg`

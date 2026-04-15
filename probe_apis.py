#!/usr/bin/env python3
"""
API probe script — verifies real endpoint shapes before implementation.

Reads STEAM_API_KEY from .env in the project root.
Gamalytic free tier requires no key.
"""

import json
import os
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("Missing 'requests'. Run:  pip install requests")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Load .env (spaces around = are fine, quoted values are fine)
# ---------------------------------------------------------------------------
def load_env_file(path: Path):
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key.strip(), value)

load_env_file(Path(__file__).parent / ".env")
load_env_file(Path(__file__).parent / "backend" / ".env")

STEAM_KEY     = os.environ.get("STEAM_API_KEY", "")
GAMALYTIC_KEY = os.environ.get("GAMALYTIC_API_KEY", "")
print(f"STEAM_KEY loaded:     {'YES (len=' + str(len(STEAM_KEY)) + ')' if STEAM_KEY else 'NO'}")
print(f"GAMALYTIC_KEY loaded: {'YES (len=' + str(len(GAMALYTIC_KEY)) + ')' if GAMALYTIC_KEY else 'NO'}")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
SEP = "─" * 70

def section(title: str):
    print(f"\n{SEP}\n  {title}\n{SEP}")

def show(label: str, data):
    print(f"\n▶ {label}")
    print(json.dumps(data, indent=2)[:4000])

def get(url: str, params: dict = None, headers: dict = None, timeout: int = 15) -> dict:
    resp = requests.get(url, params=params, headers=headers or {}, timeout=timeout)
    resp.raise_for_status()
    return resp.json()

def gamalytic_get(params: dict, auth_style: str = "bearer") -> dict:
    """GET from Gamalytic, attaching the API key if available."""
    url = "https://api.gamalytic.com/steam-games/list"
    headers = {}
    query_params = dict(params)

    if GAMALYTIC_KEY:
        if auth_style == "bearer":
            headers["Authorization"] = f"Bearer {GAMALYTIC_KEY}"
        elif auth_style == "api-key-header":
            headers["api-key"] = GAMALYTIC_KEY
        elif auth_style == "x-api-key":
            headers["X-API-Key"] = GAMALYTIC_KEY
        elif auth_style == "query":
            query_params["api_key"] = GAMALYTIC_KEY
        elif auth_style == "query-key":
            query_params["key"] = GAMALYTIC_KEY

    # Print the actual prepared request URL + headers for debugging
    req = requests.Request("GET", url, params=query_params, headers=headers)
    prepared = req.prepare()
    print(f"  [debug] URL:     {prepared.url}")
    print(f"  [debug] Headers: { {k: (v[:10]+'...' if k=='Authorization' or k.lower().endswith('key') else v) for k, v in prepared.headers.items()} }")

    resp = requests.get(url, params=query_params, headers=headers, timeout=15)
    print(f"  [debug] Status:  {resp.status_code}")
    resp.raise_for_status()
    return resp.json()

VANITY_1 = "504316002"
VANITY_2 = "mikuchankawaii"
KNOWN_APPIDS = [730, 570, 440, 252490, 4000, 578080, 271590]  # CS2, Dota2, TF2, Rust, GMod, PUBG, GTA5

# ---------------------------------------------------------------------------
# 1. Steam — ResolveVanityURL
# ---------------------------------------------------------------------------
section("1. Steam: ResolveVanityURL")

if not STEAM_KEY:
    print("  ⚠  STEAM_API_KEY not set — skipping Steam tests")
else:
    RESOLVE_URL = "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/"

    steam_ids = {}
    for vanity in (VANITY_1, VANITY_2):
        print(f"\n--- vanityurl = '{vanity}' ---")
        data = get(RESOLVE_URL, {"key": STEAM_KEY, "vanityurl": vanity})
        show("raw response", data)
        r = data.get("response", {})
        if r.get("success") == 1:
            steam_ids[vanity] = r["steamid"]
            print(f"  ✓  steamid = {r['steamid']}")
        else:
            print(f"  ✗  success={r.get('success')}  message={r.get('message')}")

    print(f"\n--- bad vanity (expect failure shape) ---")
    data = get(RESOLVE_URL, {"key": STEAM_KEY, "vanityurl": "__bad_xyz__"})
    show("failure response", data)

# ---------------------------------------------------------------------------
# 2. Steam — GetOwnedGames
# ---------------------------------------------------------------------------
section("2. Steam: GetOwnedGames")

if not STEAM_KEY:
    print("  ⚠  STEAM_API_KEY not set — skipping")
else:
    OWNED_URL = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/"

    for vanity, sid in steam_ids.items():
        print(f"\n--- {vanity} ({sid}) ---")
        data = get(OWNED_URL, {"key": STEAM_KEY, "steamid": sid, "include_appinfo": 1})
        r = data.get("response", {})

        if not r:
            print("  ✗  Empty response — profile is PRIVATE")
            continue

        games = r.get("games", [])
        count = r.get("game_count", 0)
        print(f"  ✓  game_count = {count}")
        if games:
            show("games[0] — full entry shape", games[0])
            playtimes = sorted([g["playtime_forever"] for g in games], reverse=True)
            above_30 = sum(1 for p in playtimes if p >= 30)
            print(f"\n  Playtime distribution:")
            print(f"    Total:          {count}")
            print(f"    >= 30 min:      {above_30}")
            print(f"    <  30 min:      {count - above_30}")
            print(f"    Max:            {playtimes[0]} min ({playtimes[0]//60}h)")
            print(f"    Top 10:         {playtimes[:10]}")

# ---------------------------------------------------------------------------
# 3. Gamalytic — what fields are actually available (free tier)?
# ---------------------------------------------------------------------------
section("3. Gamalytic: free-tier field discovery")

GAMALYTIC_URL = "https://api.gamalytic.com/steam-games/list"

print("\n--- No fields filter on CS2 — all keys the API returns (with key if set) ---")
data = gamalytic_get({"appids": "730", "limit": 1, "page": 0})
rl = data.get("result", [])
if rl and rl[0]:
    entry = rl[0]
    print(f"  All returned keys: {sorted(entry.keys())}")
    show("full CS2 entry", entry)
else:
    show("unexpected response", data)

print("\n--- fields=steamId,name,tags,genres — do tags come back with key? ---")
data = gamalytic_get({"appids": "730", "fields": "steamId,name,tags,genres", "limit": 1, "page": 0})
rl = data.get("result", [])
if rl and rl[0]:
    print(f"  Returned keys: {sorted(rl[0].keys())}")
    show("result[0]", rl[0])
else:
    show("unexpected response", data)

print("\n--- fields=steamId,name,tags,genres on 7 known appids ---")
data = gamalytic_get({
    "appids": ",".join(str(a) for a in KNOWN_APPIDS),
    "fields": "steamId,name,tags,genres",
    "limit": 1000,
    "page": 0,
})
rl = data.get("result", [])
print(f"  total={data.get('total')}  pages={data.get('pages')}  returned={len(rl)}")
for e in rl:
    if e:
        print(f"  steamId={e.get('steamId')}  name={e.get('name')}")
        print(f"    tags={e.get('tags', '(missing)')}")
        print(f"    genres={e.get('genres', '(missing)')}")

# ---------------------------------------------------------------------------
# 4. Gamalytic — tags as a returnable field
# ---------------------------------------------------------------------------
section("4. Gamalytic: tags field — trying every auth style")

if not GAMALYTIC_KEY:
    print("  (GAMALYTIC_KEY not set — skipping)")
else:
    params = {"appids": "730", "fields": "steamId,name,tags,genres", "limit": 1, "page": 0}

    for style in ("bearer", "api-key-header", "x-api-key", "query", "query-key"):
        print(f"\n--- auth_style='{style}' ---")
        data = gamalytic_get(params, auth_style=style)
        rl = data.get("result", [])
        entry = rl[0] if rl else {}
        keys = sorted(entry.keys()) if entry else []
        print(f"  Returned keys: {keys}")
        print(f"  tags:   {entry.get('tags', '(missing)')}")
        print(f"  genres: {entry.get('genres', '(missing)')}")

    # Also try without the appids filter — in case that's suppressing tags
    print(f"\n--- bearer, NO appids filter (first result) ---")
    data = gamalytic_get({"fields": "steamId,name,tags,genres", "limit": 1, "page": 0})
    rl = data.get("result", [])
    entry = rl[0] if rl else {}
    print(f"  Returned keys: {sorted(entry.keys())}")
    print(f"  steamId={entry.get('steamId')}  name={entry.get('name')}")
    print(f"  tags:   {entry.get('tags', '(missing)')}")
    print(f"  genres: {entry.get('genres', '(missing)')}")

# ---------------------------------------------------------------------------
# 5. Steam Store appdetails — categories for multiplayer detection
# ---------------------------------------------------------------------------
section("5. Steam Store: appdetails categories (alternative for multiplayer detection)")

STORE_URL = "https://store.steampowered.com/api/appdetails"

for appid, label in [(730, "CS2"), (570, "Dota 2"), (292030, "Witcher 3 (single-player)")]:
    print(f"\n--- {label} (appid {appid}) ---")
    data = get(STORE_URL, {"appids": appid, "filters": "categories,genres"})
    app_data = data.get(str(appid), {})
    if not app_data.get("success"):
        print(f"  ✗  success=False")
        continue
    d = app_data.get("data", {})
    cats = [c["description"] for c in d.get("categories", [])]
    genres = [g["description"] for g in d.get("genres", [])]
    print(f"  categories: {cats}")
    print(f"  genres:     {genres}")
    time.sleep(0.5)  # be polite to Steam's store API

# ---------------------------------------------------------------------------
# 6. SteamSpy — user-defined tags (completely free, no key)
# ---------------------------------------------------------------------------
section("6. SteamSpy: user tags (free, no key)")

STEAMSPY_URL = "https://steamspy.com/api.php"

for appid, label in [(730, "CS2"), (570, "Dota 2"), (292030, "Witcher 3")]:
    print(f"\n--- {label} (appid {appid}) ---")
    try:
        data = get(STEAMSPY_URL, {"request": "appdetails", "appid": appid})
        tags = data.get("tags", {})
        print(f"  name: {data.get('name')}")
        # tags is a dict of {tag_name: vote_count}, sorted by votes
        top_tags = sorted(tags.items(), key=lambda x: x[1], reverse=True)[:15]
        print(f"  top tags: {[t[0] for t in top_tags]}")
    except Exception as e:
        print(f"  ✗  Error: {e}")
    time.sleep(1)  # SteamSpy rate limit

# ---------------------------------------------------------------------------
# 7. Gamalytic pagination — confirm page/total math with real data
# ---------------------------------------------------------------------------
section("7. Gamalytic: pagination with limit=2")

for pg in (0, 1, 2):
    d = gamalytic_get({
        "appids": ",".join(str(a) for a in KNOWN_APPIDS),
        "limit": 2,
        "page": pg,
    })
    rl = d.get("result", [])
    names = [e.get("name") for e in rl if e]
    print(f"  page={pg}: total={d.get('total')}  pages={d.get('pages')}  names={names}")

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
section("Done — Key findings to note")
print("""
  Steam API:
    ResolveVanityURL → response.steamid (string), response.success (1=ok, 42=not found)
    GetOwnedGames   → response.games[].{appid, name, playtime_forever}
                       empty response = private profile

  Gamalytic (free tier):
    appid field name: 'steamId' (NOT 'appid')
    Returnable free fields: steamId, name, genres (tags NOT available as a return field)
    tags param is a FILTER only (AND logic for multiple values)
    Non-existent appids are silently dropped
    GTA V (271590) not in Gamalytic

  Alternatives for tags:
    Steam Store appdetails → categories[] (includes Multi-player, Co-op, etc.) — free, 1 game at a time
    SteamSpy              → tags{} dict with vote counts — free, no key, 1 game at a time
""")

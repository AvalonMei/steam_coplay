const axios = require('axios');
jest.mock('axios');

const { fetchGameMetadata } = require('../../src/services/gamalyticService');

const {
  GAMALYTIC_RESPONSE_SINGLE_PAGE,
  GAMALYTIC_RESPONSE_PAGE_0,
  GAMALYTIC_RESPONSE_PAGE_1,
} = require('../fixtures/gamalyticFixtures');

// ─── fetchGameMetadata ───────────────────────────────────────────────────────
// fetchGameMetadata(appids: number[]) → Map<number, GameMetadata>
// where GameMetadata = { steamId, name, tags, genres, features }

describe('fetchGameMetadata', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns a Map keyed by steamId', async () => {
    axios.get.mockResolvedValueOnce({ data: GAMALYTIC_RESPONSE_SINGLE_PAGE });
    const result = await fetchGameMetadata([730, 105600, 252490]);
    expect(result).toBeInstanceOf(Map);
    expect(result.has(730)).toBe(true);
    expect(result.get(730).name).toBe('Counter-Strike 2');
  });

  it('includes tags, genres, and features on each entry', async () => {
    axios.get.mockResolvedValueOnce({ data: GAMALYTIC_RESPONSE_SINGLE_PAGE });
    const result = await fetchGameMetadata([730]);
    const cs2 = result.get(730);
    expect(Array.isArray(cs2.tags)).toBe(true);
    expect(Array.isArray(cs2.genres)).toBe(true);
    expect(Array.isArray(cs2.features)).toBe(true);
    expect(cs2.tags).toContain('FPS');
  });

  it('always sends limit=1000 regardless of how many appids are requested', async () => {
    axios.get.mockResolvedValueOnce({ data: GAMALYTIC_RESPONSE_SINGLE_PAGE });
    await fetchGameMetadata([730]);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('steam-games/list'),
      expect.objectContaining({
        params: expect.objectContaining({ limit: 1000 }),
      })
    );
  });

  it('passes appids as a comma-separated string in params', async () => {
    axios.get.mockResolvedValueOnce({ data: GAMALYTIC_RESPONSE_SINGLE_PAGE });
    await fetchGameMetadata([730, 105600, 252490]);
    expect(axios.get).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        params: expect.objectContaining({
          appids: expect.stringMatching(/730.*105600.*252490|252490.*105600.*730/),
        }),
      })
    );
  });

  it('sends the api-key header (required for tags and features)', async () => {
    axios.get.mockResolvedValueOnce({ data: GAMALYTIC_RESPONSE_SINGLE_PAGE });
    await fetchGameMetadata([730]);
    expect(axios.get).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          'api-key': expect.any(String),
        }),
      })
    );
  });

  it('requests steamId, name, tags, genres, and features fields', async () => {
    axios.get.mockResolvedValueOnce({ data: GAMALYTIC_RESPONSE_SINGLE_PAGE });
    await fetchGameMetadata([730]);
    const callArgs = axios.get.mock.calls[0][1];
    const fields = callArgs.params.fields;
    expect(fields).toMatch(/steamId/);
    expect(fields).toMatch(/tags/);
    expect(fields).toMatch(/features/);
  });

  it('silently omits appids that are absent from Gamalytic (e.g. Wallpaper Engine)', async () => {
    // Wallpaper Engine (431960) is not indexed — Gamalytic simply excludes it
    const responseWithoutWallpaper = {
      pages: 1,
      total: 1,
      result: [GAMALYTIC_RESPONSE_SINGLE_PAGE.result[0]], // only CS2
    };
    axios.get.mockResolvedValueOnce({ data: responseWithoutWallpaper });
    const result = await fetchGameMetadata([730, 431960]);
    expect(result.has(730)).toBe(true);
    expect(result.has(431960)).toBe(false);
  });

  it('returns an empty Map when no appids match', async () => {
    axios.get.mockResolvedValueOnce({ data: { pages: 1, total: 0, result: [] } });
    const result = await fetchGameMetadata([999999]);
    expect(result.size).toBe(0);
  });

  it('paginates when total results span more than one page', async () => {
    axios.get
      .mockResolvedValueOnce({ data: GAMALYTIC_RESPONSE_PAGE_0 })
      .mockResolvedValueOnce({ data: GAMALYTIC_RESPONSE_PAGE_1 });

    const allAppids = GAMALYTIC_RESPONSE_PAGE_0.result
      .concat(GAMALYTIC_RESPONSE_PAGE_1.result)
      .map((g) => g.steamId);

    const result = await fetchGameMetadata(allAppids);

    // Should have made two calls: page=0 and page=1
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ params: expect.objectContaining({ page: 0 }) })
    );
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ params: expect.objectContaining({ page: 1 }) })
    );

    // All entries from both pages should be in the result
    expect(result.size).toBe(
      GAMALYTIC_RESPONSE_PAGE_0.result.length +
        GAMALYTIC_RESPONSE_PAGE_1.result.length
    );
  });

  it('starts pagination from page=0', async () => {
    axios.get.mockResolvedValueOnce({ data: GAMALYTIC_RESPONSE_SINGLE_PAGE });
    await fetchGameMetadata([730]);
    expect(axios.get).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        params: expect.objectContaining({ page: 0 }),
      })
    );
  });
});

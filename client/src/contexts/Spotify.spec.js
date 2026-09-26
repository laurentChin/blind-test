import React, { useContext } from "react";
import { render } from "@testing-library/react";

// Reads sessionStorage and builds URLs from env vars at import time, so
// every test needs a fresh module instance with its own sessionStorage state
// set up beforehand.
function loadSpotifyContext() {
  jest.resetModules();
  const { SpotifyContext } = require("./Spotify");

  let captured;
  function Capture() {
    captured = useContext(SpotifyContext);
    return null;
  }
  render(<Capture />);

  return captured;
}

describe("Spotify provider session validation", () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    sessionStorage.clear();
    // The redirect branch assigns window.location, which jsdom logs as an
    // unimplemented navigation — expected here, since we only care about the
    // synchronous side effects that happen before that assignment.
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = realFetch;
    console.error.mockRestore();
  });

  it("keeps the session authenticated and the token stored when validation succeeds", async () => {
    sessionStorage.setItem(
      "spotifyTokenList",
      JSON.stringify({
        accessToken: "good-token",
        refreshToken: "r",
        expiresAt: Date.now() + 3600000,
      })
    );
    global.fetch = jest.fn().mockResolvedValue({ status: 200, json: async () => ({}) });

    const spotify = loadSpotifyContext();
    const authenticated = await spotify.login();

    expect(authenticated).toBe(true);
    expect(sessionStorage.getItem("spotifyTokenList")).not.toBeNull();
  });

  it("clears the stored token when a previously-stored session no longer validates (e.g. a revoked token)", async () => {
    sessionStorage.setItem(
      "spotifyTokenList",
      JSON.stringify({
        accessToken: "stale-token",
        refreshToken: "r",
        expiresAt: Date.now() + 3600000,
      })
    );
    global.fetch = jest.fn().mockResolvedValue({ status: 401, json: async () => ({}) });

    const spotify = loadSpotifyContext();
    // login() redirects to Spotify on a failed validation and never resolves
    // - only its synchronous-enough side effects (clearing storage) matter here.
    spotify.login();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sessionStorage.getItem("spotifyTokenList")).toBeNull();
  });

  it("does not mark the session authenticated when a token exchange fails to return an access token", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 400,
      json: async () => ({ error: "invalid_grant" }),
    });

    const spotify = loadSpotifyContext();
    // No stored token and no ?code param -> straight to the redirect branch,
    // which never resolves - same pattern as above.
    spotify.login();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sessionStorage.getItem("spotifyTokenList")).toBeNull();
  });
});

describe("Spotify theme queries", () => {
  it("turns theme criteria into Spotify's field-filtered search syntax", () => {
    const { themeQueries } = loadSpotifyContext();

    expect(themeQueries({ years: [1980, 1989], terms: "80s hits" })).toEqual([
      "year:1980-1989",
    ]);
    expect(themeQueries({ years: [1985, 1985], terms: "1985 hits" })).toEqual([
      "year:1985",
    ]);
    expect(themeQueries({ genres: ["hip hop", "rap"], terms: "hip hop hits" })).toEqual([
      'genre:"hip hop"',
      "genre:rap",
    ]);
    expect(
      themeQueries({ keywords: ["disney"], soundtrack: true, terms: "disney" })
    ).toEqual(["album:disney", "disney soundtrack"]);
    expect(
      themeQueries({
        albumPhrases: ["series soundtrack", "television soundtrack"],
        terms: "original series soundtrack",
      })
    ).toEqual(['album:"series soundtrack"', 'album:"television soundtrack"']);
  });

  it("narrows free text with the other criteria of a custom theme", () => {
    const { themeQueries } = loadSpotifyContext();

    expect(themeQueries({ custom: true, text: "Céline Dion", terms: "Céline Dion" })).toEqual([
      "Céline Dion",
    ]);
    expect(
      themeQueries({
        custom: true,
        text: "Queen",
        years: [1980, 1989],
        genres: ["rock"],
        terms: "Queen 80s Rock",
      })
    ).toEqual(["Queen genre:rock year:1980-1989"]);
  });
});

describe("Spotify Web API calls (February 2026 endpoints)", () => {
  const realFetch = global.fetch;
  const api = process.env.REACT_APP_SPOTIFY_API_ENDPONT;

  function mockFetch(body = {}) {
    global.fetch = jest.fn().mockResolvedValue({ status: 200, json: async () => body });
    return global.fetch;
  }

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(
      "spotifyTokenList",
      JSON.stringify({ accessToken: "token", refreshToken: "r", expiresAt: Date.now() + 3600000 })
    );
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it("creates a playlist through POST /me/playlists in a single call", async () => {
    const fetch = mockFetch({ id: "new-playlist" });
    const spotify = loadSpotifyContext();

    await expect(spotify.createPlaylist("Session")).resolves.toEqual({ id: "new-playlist" });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, { method, body }] = fetch.mock.calls[0];
    expect(url).toBe(`${api}/me/playlists`);
    expect(method).toBe("POST");
    expect(JSON.parse(body)).toEqual({ name: "Session", public: false });
  });

  it("reads playlist tracks from items.items[].item, keeping each raw position", async () => {
    const fetch = mockFetch({
      items: {
        items: [
          { item: { id: "a", uri: "spotify:track:a" } },
          { item: { id: "b", uri: "spotify:track:b" } },
        ],
      },
    });
    const spotify = loadSpotifyContext();
    spotify.setCurrentPlaylist("pl");

    await expect(spotify.getTracks()).resolves.toEqual([
      { id: "a", uri: "spotify:track:a", rawIndex: 0 },
      { id: "b", uri: "spotify:track:b", rawIndex: 1 },
    ]);
    expect(fetch.mock.calls[0][0]).toBe(`${api}/playlists/pl`);
  });

  it("returns no tracks for a playlist Spotify only exposes metadata for", async () => {
    mockFetch({ id: "pl", name: "Not mine" });
    const spotify = loadSpotifyContext();
    spotify.setCurrentPlaylist("pl");

    await expect(spotify.getTracks()).resolves.toEqual([]);
  });

  it("adds, removes and reorders through /playlists/{id}/items", async () => {
    const fetch = mockFetch();
    const spotify = loadSpotifyContext();
    spotify.setCurrentPlaylist("pl");

    await spotify.addTrack("spotify:track:a");
    await spotify.removeTrack({ uri: "spotify:track:a", rawIndex: 2 });
    await spotify.reorderTrack(0, 3);

    const [add, remove, reorder] = fetch.mock.calls;
    [add, remove, reorder].forEach(([url]) => expect(url).toBe(`${api}/playlists/pl/items`));

    expect(add[1].method).toBe("POST");
    expect(JSON.parse(add[1].body)).toEqual({ uris: ["spotify:track:a"] });

    expect(remove[1].method).toBe("DELETE");
    expect(JSON.parse(remove[1].body)).toEqual({
      items: [{ uri: "spotify:track:a", positions: [2] }],
    });

    expect(reorder[1].method).toBe("PUT");
    expect(JSON.parse(reorder[1].body)).toEqual({
      range_start: 0,
      insert_before: 4,
      range_length: 1,
    });
  });

  it("clamps the search limit to Spotify's new maximum of 10", async () => {
    const fetch = mockFetch({ tracks: { items: [] } });
    const spotify = loadSpotifyContext();

    await spotify.search("abba", { limit: 50, offset: 20 });

    expect(fetch.mock.calls[0][0]).toBe(`${api}/search?q=abba&type=track&limit=10&offset=20`);
  });
});

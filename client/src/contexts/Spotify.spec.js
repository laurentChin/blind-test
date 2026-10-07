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

describe("Spotify OAuth redirect", () => {
  const realFetch = global.fetch;

  beforeEach(() => sessionStorage.clear());

  afterEach(() => {
    global.fetch = realFetch;
    window.history.pushState({}, "", "/");
  });

  // Spotify only accepts the redirect URIs registered on its dashboard —
  // the app's root — so a page first loaded on a deep link must not send
  // its own path.
  it("uses the app root as redirect URI when loaded on a deep link", async () => {
    window.history.pushState({}, "", "/create-session/everybody-plays?code=abc");
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ access_token: "token", expires_in: 3600 }),
    });

    await loadSpotifyContext().login();

    const [, { body }] = global.fetch.mock.calls[0];
    expect(JSON.parse(body)).toMatchObject({
      code: "abc",
      redirectUri: encodeURIComponent(`${window.location.origin}/`),
    });
    expect(window.location.pathname + window.location.search).toBe("/");
  });
});

describe("Spotify token refresh", () => {
  const realFetch = global.fetch;
  const realEnv = { ...process.env };
  const api = "https://api.test";
  const tokenEndpoint = "https://server.test/spotify/access-token";

  function storeToken(expiresIn) {
    sessionStorage.setItem(
      "spotifyTokenList",
      JSON.stringify({
        accessToken: "old-token",
        refreshToken: "refresh",
        expiresAt: Date.now() + expiresIn,
      })
    );
  }

  // Answers the token endpoint with a new token, and the Web API with 401
  // for a missing token or any token listed in `rejected`.
  function mockFetch({ rejected = [], refreshed = { access_token: "new-token", expires_in: 3600 } } = {}) {
    global.fetch = jest.fn(async (url, { headers } = {}) => {
      if (url === tokenEndpoint) {
        return { status: 200, json: async () => refreshed };
      }

      const token = headers.Authorization?.replace("Bearer ", "");
      return !token || rejected.includes(token)
        ? { status: 401, json: async () => ({}) }
        : { status: 200, json: async () => ({ items: [] }) };
    });
    return global.fetch;
  }

  const callsTo = (fetch, url) => fetch.mock.calls.filter(([called]) => called === url);

  beforeEach(() => {
    sessionStorage.clear();
    process.env.REACT_APP_SPOTIFY_API_ENDPONT = api;
    process.env.REACT_APP_SPOTIFY_TOKEN_ENDPOINT = tokenEndpoint;
  });

  afterEach(() => {
    global.fetch = realFetch;
    process.env = { ...realEnv };
    delete window.Spotify;
  });

  it("leaves a token that is still good alone", async () => {
    storeToken(3600000);
    const fetch = mockFetch();

    await loadSpotifyContext().getPlaylists();

    expect(callsTo(fetch, tokenEndpoint)).toHaveLength(0);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer old-token");
  });

  it("swaps a token about to expire before calling the API", async () => {
    storeToken(30000);
    const fetch = mockFetch();

    await loadSpotifyContext().getPlaylists();

    const [[, { body }]] = callsTo(fetch, tokenEndpoint);
    expect(JSON.parse(body)).toMatchObject({ refreshToken: "refresh" });
    const [[, { headers }]] = callsTo(fetch, `${api}/me/playlists`);
    expect(headers.Authorization).toBe("Bearer new-token");
    expect(JSON.parse(sessionStorage.getItem("spotifyTokenList"))).toMatchObject({
      accessToken: "new-token",
      refreshToken: "refresh",
    });
  });

  it("refreshes once for calls made at the same time", async () => {
    storeToken(-1000);
    const fetch = mockFetch();
    const spotify = loadSpotifyContext();

    await Promise.all([spotify.getPlaylists(), spotify.search("abba")]);

    expect(callsTo(fetch, tokenEndpoint)).toHaveLength(1);
  });

  it("refreshes and retries when Spotify rejects a token early", async () => {
    storeToken(3600000);
    const fetch = mockFetch({ rejected: ["old-token"] });

    await expect(loadSpotifyContext().getPlaylists()).resolves.toEqual([]);

    expect(callsTo(fetch, tokenEndpoint)).toHaveLength(1);
    expect(callsTo(fetch, `${api}/me/playlists`)).toHaveLength(2);
  });

  it("keeps an expired session logged in when it can be refreshed", async () => {
    storeToken(-1000);
    mockFetch({ rejected: ["old-token"] });

    await expect(loadSpotifyContext().login()).resolves.toBe(true);
  });

  it("gives up once the refresh token is dead too", async () => {
    storeToken(-1000);
    const fetch = mockFetch({ rejected: ["old-token"], refreshed: { error: "invalid_grant" } });
    jest.spyOn(console, "error").mockImplementation(() => {});

    loadSpotifyContext().login();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(callsTo(fetch, tokenEndpoint)).toHaveLength(1);
    expect(sessionStorage.getItem("spotifyTokenList")).toBeNull();
    console.error.mockRestore();
  });

  it("hands the player a fresh token", async () => {
    storeToken(-1000);
    mockFetch();
    let playerOptions;
    window.Spotify = {
      Player: jest.fn((options) => {
        playerOptions = options;
        return { addListener: jest.fn(), connect: jest.fn() };
      }),
    };
    const onToken = jest.fn();

    loadSpotifyContext().setupPlayer(jest.fn());
    playerOptions.getOAuthToken(onToken);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onToken).toHaveBeenCalledWith("new-token");
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

describe("Spotify quota handling (July 2026 429 body)", () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it("rejects with the QUOTA_EXCEEDED reason instead of resolving with an error body", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 429,
      json: async () => ({
        error: { status: 429, message: "Too many requests", reason: "QUOTA_EXCEEDED" },
      }),
    });
    const spotify = loadSpotifyContext();

    await expect(spotify.search("abba")).rejects.toMatchObject({
      message: "Too many requests",
      status: 429,
      reason: "QUOTA_EXCEEDED",
    });
  });

  it("still rejects on a 429 without a JSON body (plain rate limit)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 429,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });
    const spotify = loadSpotifyContext();

    await expect(spotify.getPlaylists()).rejects.toMatchObject({
      status: 429,
      reason: undefined,
    });
  });
});

describe("Spotify player setup", () => {
  let listeners;
  let connect;
  let disconnect;

  beforeEach(() => {
    sessionStorage.clear();
    listeners = {};
    connect = jest.fn().mockResolvedValue(true);
    disconnect = jest.fn();
    window.Spotify = {
      Player: jest.fn(() => ({
        addListener: (event, cb) => {
          listeners[event] = cb;
        },
        connect,
        disconnect,
      })),
    };
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    delete window.Spotify;
    console.error.mockRestore();
  });

  it("reports the device once the player is ready", () => {
    const onReady = jest.fn();
    const onError = jest.fn();

    loadSpotifyContext().setupPlayer(onReady, onError);
    listeners.ready({ device_id: "device-1" });

    expect(onReady).toHaveBeenCalledWith("device-1");
    expect(onError).not.toHaveBeenCalled();
  });

  // The SDK never reports a device to a second Spotify.Player of the same
  // page, so a host screen mounted again has to go through the first one.
  it("reconnects the same player when set up again", () => {
    const spotify = loadSpotifyContext();
    const onFirstReady = jest.fn();
    const onSecondReady = jest.fn();

    spotify.setupPlayer(onFirstReady);
    listeners.ready({ device_id: "device-1" });
    spotify.setupPlayer(onSecondReady);
    listeners.ready({ device_id: "device-1" });

    expect(window.Spotify.Player).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(2);
    expect(onFirstReady).toHaveBeenCalledTimes(1);
    expect(onSecondReady).toHaveBeenCalledWith("device-1");
  });

  it.each([
    ["initialization_error", "This browser can't run the Spotify player."],
    [
      "authentication_error",
      "Spotify rejected the player's connection — try connecting again.",
    ],
    ["account_error", "A Spotify Premium account is required to play tracks."],
  ])("reports a %s to the caller", (type, userMessage) => {
    const onError = jest.fn();

    loadSpotifyContext().setupPlayer(jest.fn(), onError);
    listeners[type]({ message: "raw sdk message" });

    expect(onError).toHaveBeenCalledWith(userMessage);
  });

  it("reports a failed connection to the caller", async () => {
    connect.mockResolvedValue(false);
    const onError = jest.fn();

    loadSpotifyContext().setupPlayer(jest.fn(), onError);
    await Promise.resolve();
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith(
      "The Spotify player couldn't connect."
    );
  });

  describe("when the player stays silent", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("reports a player that never becomes ready nor fails", () => {
      const onError = jest.fn();

      loadSpotifyContext().setupPlayer(jest.fn(), onError);
      jest.advanceTimersByTime(15000);

      expect(onError).toHaveBeenCalledWith(
        "The Spotify player isn't responding — reload the page to try again."
      );
    });

    it("doesn't report a timeout once the player is ready", () => {
      const onError = jest.fn();

      loadSpotifyContext().setupPlayer(jest.fn(), onError);
      listeners.ready({ device_id: "device-1" });
      jest.advanceTimersByTime(15000);

      expect(onError).not.toHaveBeenCalled();
    });
  });

  it("doesn't require an error callback", () => {
    loadSpotifyContext().setupPlayer(jest.fn());

    expect(() =>
      listeners.account_error({ message: "raw sdk message" })
    ).not.toThrow();
  });
});

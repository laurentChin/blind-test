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

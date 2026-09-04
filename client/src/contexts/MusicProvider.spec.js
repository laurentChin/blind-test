import { MUSIC_PROVIDERS, setSelectedProvider } from "./MusicProvider";

describe("setSelectedProvider", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("clears the other provider's stored token so only the selected one keeps its credentials", () => {
    sessionStorage.setItem("spotifyTokenList", JSON.stringify({ accessToken: "spotify-token" }));
    sessionStorage.setItem(
      "appleMusicDeveloperToken",
      JSON.stringify({ token: "apple-dev-token" })
    );

    setSelectedProvider(MUSIC_PROVIDERS.SPOTIFY);

    expect(sessionStorage.getItem("spotifyTokenList")).not.toBeNull();
    expect(sessionStorage.getItem("appleMusicDeveloperToken")).toBeNull();
  });

  it("clears Spotify's stored token when switching to Apple Music", () => {
    sessionStorage.setItem("spotifyTokenList", JSON.stringify({ accessToken: "spotify-token" }));
    sessionStorage.setItem(
      "appleMusicDeveloperToken",
      JSON.stringify({ token: "apple-dev-token" })
    );

    setSelectedProvider(MUSIC_PROVIDERS.APPLE_MUSIC);

    expect(sessionStorage.getItem("appleMusicDeveloperToken")).not.toBeNull();
    expect(sessionStorage.getItem("spotifyTokenList")).toBeNull();
  });
});

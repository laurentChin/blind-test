import React from "react";
import { render, fireEvent } from "@testing-library/react";

import { ProviderSelect } from "./ProviderSelect";
import { MUSIC_PROVIDERS, setSelectedProvider } from "../../../contexts/MusicProvider";

jest.mock("../../../contexts/MusicProvider", () => ({
  MUSIC_PROVIDERS: { SPOTIFY: "spotify", APPLE_MUSIC: "appleMusic" },
  setSelectedProvider: jest.fn(),
}));

describe("<ProviderSelect />", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should select Spotify on 'Continue with Spotify' click", () => {
    const setProvider = jest.fn();
    const { getByTestId } = render(<ProviderSelect setProvider={setProvider} />);

    fireEvent.click(getByTestId("select-spotify-btn"));

    expect(setSelectedProvider).toHaveBeenCalledWith(MUSIC_PROVIDERS.SPOTIFY);
    expect(setProvider).toHaveBeenCalledWith(MUSIC_PROVIDERS.SPOTIFY);
  });

  it("should select Apple Music on 'Continue with Apple Music' click", () => {
    const setProvider = jest.fn();
    const { getByTestId } = render(<ProviderSelect setProvider={setProvider} />);

    fireEvent.click(getByTestId("select-apple-music-btn"));

    expect(setSelectedProvider).toHaveBeenCalledWith(
      MUSIC_PROVIDERS.APPLE_MUSIC
    );
    expect(setProvider).toHaveBeenCalledWith(MUSIC_PROVIDERS.APPLE_MUSIC);
  });
});

import React from "react";
import { render, fireEvent } from "@testing-library/react";

import { ProviderSelect } from "./ProviderSelect";
import { MUSIC_PROVIDERS, setSelectedProvider } from "../../contexts/MusicProvider";

jest.mock("../../contexts/MusicProvider", () => ({
  MUSIC_PROVIDERS: { SPOTIFY: "spotify", APPLE_MUSIC: "appleMusic" },
  setSelectedProvider: jest.fn(),
}));

describe("<ProviderSelect />", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should select Spotify on click", () => {
    const setProvider = jest.fn();
    const { getByTestId } = render(
      <ProviderSelect provider="" setProvider={setProvider} isAuthenticated={false} />
    );

    fireEvent.click(getByTestId("select-spotify-btn"));

    expect(setSelectedProvider).toHaveBeenCalledWith(MUSIC_PROVIDERS.SPOTIFY);
    expect(setProvider).toHaveBeenCalledWith(MUSIC_PROVIDERS.SPOTIFY);
  });

  it("should select Apple Music on click", () => {
    const setProvider = jest.fn();
    const { getByTestId } = render(
      <ProviderSelect provider="" setProvider={setProvider} isAuthenticated={false} />
    );

    fireEvent.click(getByTestId("select-apple-music-btn"));

    expect(setSelectedProvider).toHaveBeenCalledWith(
      MUSIC_PROVIDERS.APPLE_MUSIC
    );
    expect(setProvider).toHaveBeenCalledWith(MUSIC_PROVIDERS.APPLE_MUSIC);
  });

  it("should deselect a selected, not-yet-authenticated provider on second click", () => {
    const setProvider = jest.fn();
    const { getByTestId } = render(
      <ProviderSelect
        provider={MUSIC_PROVIDERS.SPOTIFY}
        setProvider={setProvider}
        isAuthenticated={false}
      />
    );

    fireEvent.click(getByTestId("select-spotify-btn"));

    expect(setSelectedProvider).toHaveBeenCalledWith("");
    expect(setProvider).toHaveBeenCalledWith("");
  });

  it("should switch directly to the other provider when one is already selected", () => {
    const setProvider = jest.fn();
    const { getByTestId } = render(
      <ProviderSelect
        provider={MUSIC_PROVIDERS.SPOTIFY}
        setProvider={setProvider}
        isAuthenticated={false}
      />
    );

    fireEvent.click(getByTestId("select-apple-music-btn"));

    expect(setSelectedProvider).toHaveBeenCalledWith(
      MUSIC_PROVIDERS.APPLE_MUSIC
    );
    expect(setProvider).toHaveBeenCalledWith(MUSIC_PROVIDERS.APPLE_MUSIC);
  });

  it("should only disable the connected tile once authenticated", () => {
    const setProvider = jest.fn();
    const { getByTestId } = render(
      <ProviderSelect
        provider={MUSIC_PROVIDERS.SPOTIFY}
        setProvider={setProvider}
        isAuthenticated={true}
      />
    );

    expect(getByTestId("select-spotify-btn")).toBeDisabled();
    expect(getByTestId("select-apple-music-btn")).not.toBeDisabled();
  });

  it("should allow switching to the other provider once authenticated", () => {
    const setProvider = jest.fn();
    const { getByTestId } = render(
      <ProviderSelect
        provider={MUSIC_PROVIDERS.SPOTIFY}
        setProvider={setProvider}
        isAuthenticated={true}
      />
    );

    fireEvent.click(getByTestId("select-apple-music-btn"));

    expect(setSelectedProvider).toHaveBeenCalledWith(
      MUSIC_PROVIDERS.APPLE_MUSIC
    );
    expect(setProvider).toHaveBeenCalledWith(MUSIC_PROVIDERS.APPLE_MUSIC);
  });
});

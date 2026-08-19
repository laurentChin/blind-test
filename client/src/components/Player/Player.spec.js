import React from "react";

import { render, fireEvent } from "@testing-library/react";
import { Player } from "./Player";

import { useMusicProvider } from "../../contexts/MusicProvider";

jest.mock("../../contexts/MusicProvider");

describe("<Player />", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const state = {
    track_window: {
      current_track: { name: "currentTrack" },
      next_tracks: [{ name: "nextTrack" }],
    },
    paused: true,
  };

  it("should display the current track name", () => {
    const setPlayerStateChangeCb = (setState) => setState(state);
    const getPlayer = jest.fn(() => ({
      togglePlay: jest.fn(),
      nextTrack: jest.fn(),
    }));
    useMusicProvider.mockReturnValue({ setPlayerStateChangeCb, getPlayer });

    const { getByText } = render(<Player nextTrackCallback={() => {}} />);

    expect(getByText(/currentTrack/)).toBeTruthy();
  });

  it("should display the next track name", () => {
    const setPlayerStateChangeCb = (setState) => setState(state);
    const getPlayer = jest.fn(() => ({
      togglePlay: jest.fn(),
      nextTrack: jest.fn(),
    }));
    useMusicProvider.mockReturnValue({ setPlayerStateChangeCb, getPlayer });

    const { getByText } = render(<Player nextTrackCallback={() => {}} />);

    expect(getByText(/nextTrack/)).toBeTruthy();
  });

  it("should call togglePlay on play/pause button click", () => {
    const setPlayerStateChangeCb = (setState) => setState(state);
    const mockTogglePlay = jest.fn();
    const getPlayer = jest.fn(() => ({
      togglePlay: mockTogglePlay,
      nextTrack: jest.fn(),
    }));
    useMusicProvider.mockReturnValue({ setPlayerStateChangeCb, getPlayer });

    const { getByTestId } = render(<Player nextTrackCallback={() => {}} />);

    fireEvent.click(getByTestId("toggle-play-pause-btn"));

    expect(mockTogglePlay).toHaveBeenCalled();
  });

  it("should call nextTrack and nextTrackCallback on 'Play next track' button click", () => {
    const setPlayerStateChangeCb = (setState) => setState(state);
    const mockTogglePlay = jest.fn();
    const mockNextTrack = jest.fn();
    const mockNextTrackCallback = jest.fn();
    const getPlayer = jest.fn(() => ({
      togglePlay: mockTogglePlay,
      nextTrack: mockNextTrack,
    }));
    useMusicProvider.mockReturnValue({ setPlayerStateChangeCb, getPlayer });

    const { getByTestId } = render(
      <Player nextTrackCallback={mockNextTrackCallback} />
    );

    fireEvent.click(getByTestId("play-next-btn"));

    expect(mockNextTrack).toHaveBeenCalled();
    expect(mockNextTrackCallback).toHaveBeenCalled();
  });
});

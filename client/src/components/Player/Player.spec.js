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

  it("should seed the current/next track from the tracks prop before any player event fires", () => {
    const setPlayerStateChangeCb = jest.fn();
    const getPlayer = jest.fn(() => ({
      togglePlay: jest.fn(),
      nextTrack: jest.fn(),
    }));
    useMusicProvider.mockReturnValue({ setPlayerStateChangeCb, getPlayer });

    const tracks = [{ name: "track1" }, { name: "track2" }];
    const { getByText, getByLabelText } = render(
      <Player nextTrackCallback={() => {}} tracks={tracks} />
    );

    expect(getByText(/track1/)).toBeTruthy();
    expect(getByText(/track2/)).toBeTruthy();
    // Paused by default too, since the session opens without autoplaying.
    expect(getByLabelText("Play")).toBeTruthy();
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

  it("should ignore a null player state instead of crashing", () => {
    // The Spotify Web Playback SDK fires player_state_changed with null
    // right after connecting, before any track is loaded.
    let emit;
    const setPlayerStateChangeCb = (cb) => {
      emit = cb;
    };
    const getPlayer = jest.fn(() => ({
      togglePlay: jest.fn(),
      nextTrack: jest.fn(),
    }));
    useMusicProvider.mockReturnValue({ setPlayerStateChangeCb, getPlayer });

    const { getByLabelText } = render(<Player nextTrackCallback={() => {}} />);

    expect(() => emit(null)).not.toThrow();
    expect(getByLabelText("Play")).toBeTruthy();
  });

  it("should treat an empty next_tracks array as no next track instead of crashing", () => {
    // next_tracks is legitimately empty once the queue reaches its last track.
    const lastTrackState = {
      track_window: {
        current_track: { name: "currentTrack" },
        next_tracks: [],
      },
      paused: true,
    };
    const setPlayerStateChangeCb = (setState) => setState(lastTrackState);
    const getPlayer = jest.fn(() => ({
      togglePlay: jest.fn(),
      nextTrack: jest.fn(),
    }));
    useMusicProvider.mockReturnValue({ setPlayerStateChangeCb, getPlayer });

    const { getByText, queryByTestId } = render(
      <Player nextTrackCallback={() => {}} />
    );

    expect(getByText(/currentTrack/)).toBeTruthy();
    expect(queryByTestId("play-next-btn")).toBeNull();
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

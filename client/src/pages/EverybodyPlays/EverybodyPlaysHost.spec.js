import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { EverybodyPlaysHost } from "./EverybodyPlaysHost";
import { getSelectedProvider, useMusicProvider } from "../../contexts/MusicProvider";

// uuid ships ESM-only in node_modules, which Jest's default transform
// ignores — EverybodyPlaysHost only uses v4() to mint a session id, which
// doesn't need to be a real uuid for these tests.
jest.mock("uuid", () => ({ v4: () => "session-uuid-test" }));
jest.mock("qrcode");

jest.mock("../../contexts/MusicProvider", () => ({
  getSelectedProvider: jest.fn(),
  useMusicProvider: jest.fn(),
}));

jest.mock("./ConfigureEverybodyPlaysSession", () => ({
  // eslint-disable-next-line react/prop-types
  ConfigureEverybodyPlaysSession: ({ onLaunch }) => (
    <button
      data-testid="mock-launch-btn"
      onClick={() =>
        onLaunch({
          name: "Alice",
          color: { background: "1, 2, 3", text: "255, 255, 255" },
          trackUris: ["uri:track-0", "uri:track-1"],
        })
      }
    >
      launch
    </button>
  ),
}));

jest.mock("../Session/Play", () => ({
  // eslint-disable-next-line react/prop-types
  Play: ({ player }) => <div data-testid="mock-play">{player.uuid}</div>,
}));

let socketEmit;
let socketOn;
let socketListeners;

jest.mock("socket.io-client", () =>
  jest.fn(() => ({
    emit: (...args) => socketEmit(...args),
    on: (...args) => socketOn(...args),
  }))
);

describe("<EverybodyPlaysHost />", () => {
  beforeEach(() => {
    socketListeners = {};
    socketEmit = jest.fn((event, data, callback) => {
      if (event === "join" && callback) {
        callback({
          player: { uuid: "player-1", color: { background: "1, 2, 3", text: "255, 255, 255" } },
          challengers: [],
        });
      }
    });
    socketOn = jest.fn((event, callback) => {
      (socketListeners[event] = socketListeners[event] || []).push(callback);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should redirect to /create-session when no provider has been selected", () => {
    getSelectedProvider.mockReturnValue("");
    useMusicProvider.mockReturnValue({
      isAuthenticated: false,
      login: jest.fn().mockResolvedValue(),
    });

    const { container } = render(
      <MemoryRouter initialEntries={["/create-session/everybody-plays"]}>
        <EverybodyPlaysHost />
      </MemoryRouter>
    );

    expect(container.querySelector("h1")).toBeFalsy();
  });

  it("should set up the player and join as soon as the creation form launches", async () => {
    getSelectedProvider.mockReturnValue("spotify");
    useMusicProvider.mockReturnValue({
      isAuthenticated: true,
      login: jest.fn().mockResolvedValue(),
      setupPlayer: jest.fn((cb) => cb("device-1")),
      getPlayer: jest.fn().mockReturnValue({}),
      setPlayerStateChangeCb: jest.fn(),
      startPlayer: jest.fn().mockResolvedValue(),
    });

    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/create-session/everybody-plays"]}>
        <EverybodyPlaysHost />
      </MemoryRouter>
    );

    fireEvent.click(getByTestId("mock-launch-btn"));

    await waitFor(() => expect(getByTestId("mock-play")).toBeInTheDocument());

    expect(getByTestId("mock-play")).toHaveTextContent("player-1");
    expect(socketEmit).toHaveBeenCalledWith(
      "join",
      {
        sessionUuid: expect.any(String),
        player: { name: "Alice", color: { background: "1, 2, 3", text: "255, 255, 255" }, teamUuid: "" },
      },
      expect.any(Function)
    );
  });

  it("should pause the player as soon as a challenger buzzes in", async () => {
    getSelectedProvider.mockReturnValue("spotify");
    const pause = jest.fn();
    useMusicProvider.mockReturnValue({
      isAuthenticated: true,
      login: jest.fn().mockResolvedValue(),
      setupPlayer: jest.fn((cb) => cb("device-1")),
      getPlayer: jest.fn().mockReturnValue({ pause }),
      setPlayerStateChangeCb: jest.fn(),
      startPlayer: jest.fn().mockResolvedValue(),
    });

    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/create-session/everybody-plays"]}>
        <EverybodyPlaysHost />
      </MemoryRouter>
    );

    fireEvent.click(getByTestId("mock-launch-btn"));

    await waitFor(() => expect(getByTestId("mock-play")).toBeInTheDocument());

    (socketListeners["lockChallenge"] || []).forEach((listener) => listener("player-1"));

    expect(pause).toHaveBeenCalled();
  });

  it("should resume playback as soon as the challenger's answer is submitted (validated or invalidated)", async () => {
    getSelectedProvider.mockReturnValue("spotify");
    const resume = jest.fn();
    useMusicProvider.mockReturnValue({
      isAuthenticated: true,
      login: jest.fn().mockResolvedValue(),
      setupPlayer: jest.fn((cb) => cb("device-1")),
      getPlayer: jest.fn().mockReturnValue({ resume }),
      setPlayerStateChangeCb: jest.fn(),
      startPlayer: jest.fn().mockResolvedValue(),
    });

    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/create-session/everybody-plays"]}>
        <EverybodyPlaysHost />
      </MemoryRouter>
    );

    fireEvent.click(getByTestId("mock-launch-btn"));

    await waitFor(() => expect(getByTestId("mock-play")).toBeInTheDocument());

    (socketListeners["challengerRelease"] || []).forEach((listener) => listener([]));

    expect(resume).toHaveBeenCalled();
  });

  it("should advance to the next track when startNewChallenge is received (playback stays paused through the timeout and the answer reveal, resuming only once a score is submitted)", async () => {
    getSelectedProvider.mockReturnValue("spotify");
    const nextTrack = jest.fn();
    useMusicProvider.mockReturnValue({
      isAuthenticated: true,
      login: jest.fn().mockResolvedValue(),
      setupPlayer: jest.fn((cb) => cb("device-1")),
      getPlayer: jest.fn().mockReturnValue({ nextTrack }),
      setPlayerStateChangeCb: jest.fn(),
      startPlayer: jest.fn().mockResolvedValue(),
    });

    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/create-session/everybody-plays"]}>
        <EverybodyPlaysHost />
      </MemoryRouter>
    );

    fireEvent.click(getByTestId("mock-launch-btn"));

    await waitFor(() => expect(getByTestId("mock-play")).toBeInTheDocument());

    (socketListeners["startNewChallenge"] || []).forEach((listener) => listener());

    expect(nextTrack).toHaveBeenCalled();
  });

  it("should start the player with the tracks picked during configuration, not a saved playlist, and start playing immediately", async () => {
    getSelectedProvider.mockReturnValue("spotify");
    const startPlayer = jest.fn().mockResolvedValue();
    const resume = jest.fn();
    useMusicProvider.mockReturnValue({
      isAuthenticated: true,
      login: jest.fn().mockResolvedValue(),
      setupPlayer: jest.fn((cb) => cb("device-1")),
      getPlayer: jest.fn().mockReturnValue({ resume, activateElement: jest.fn() }),
      setPlayerStateChangeCb: jest.fn(),
      startPlayer,
    });

    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/create-session/everybody-plays"]}>
        <EverybodyPlaysHost />
      </MemoryRouter>
    );

    fireEvent.click(getByTestId("mock-launch-btn"));

    await waitFor(() => expect(getByTestId("mock-play")).toBeInTheDocument());

    fireEvent.click(getByTestId("start-session-btn"));

    await waitFor(() =>
      expect(startPlayer).toHaveBeenCalledWith("device-1", ["uri:track-0", "uri:track-1"])
    );
    // Apple Music's setQueue() never starts playback on its own (unlike
    // Spotify's play endpoint, which does) — resume() is what makes
    // playback start right away on both providers instead of requiring a
    // separate manual play click.
    await waitFor(() => expect(resume).toHaveBeenCalled());
  });

  it("should hide the 'Skip' button once the last track is up, keeping the play/pause toggle", async () => {
    getSelectedProvider.mockReturnValue("spotify");
    socketEmit = jest.fn((event, data, callback) => {
      if (event === "join" && callback) {
        callback({
          player: { uuid: "player-1", color: { background: "1, 2, 3", text: "255, 255, 255" } },
          challengers: [],
          totalTracks: 2,
          playedCount: 1,
        });
      }
    });
    useMusicProvider.mockReturnValue({
      isAuthenticated: true,
      login: jest.fn().mockResolvedValue(),
      setupPlayer: jest.fn((cb) => cb("device-1")),
      getPlayer: jest.fn().mockReturnValue({ activateElement: jest.fn(), pause: jest.fn() }),
      setPlayerStateChangeCb: jest.fn(),
      startPlayer: jest.fn().mockResolvedValue(),
    });

    const { getByTestId, queryByTestId } = render(
      <MemoryRouter initialEntries={["/create-session/everybody-plays"]}>
        <EverybodyPlaysHost />
      </MemoryRouter>
    );

    fireEvent.click(getByTestId("mock-launch-btn"));

    await waitFor(() => expect(getByTestId("mock-play")).toBeInTheDocument());

    fireEvent.click(getByTestId("start-session-btn"));

    await waitFor(() => expect(getByTestId("skip-track-btn")).toBeInTheDocument());

    act(() => {
      (socketListeners["trackReady"] || []).forEach((listener) =>
        listener({ playedCount: 2, totalTracks: 2 })
      );
    });

    await waitFor(() => expect(queryByTestId("skip-track-btn")).toBeFalsy());
    expect(getByTestId("toggle-play-pause-btn")).toBeInTheDocument();
  });

  it("should ignore a stray player state change received before the session is started, and only announce the real track once it starts", async () => {
    getSelectedProvider.mockReturnValue("spotify");
    let playerStateChangeCb;
    useMusicProvider.mockReturnValue({
      isAuthenticated: true,
      login: jest.fn().mockResolvedValue(),
      setupPlayer: jest.fn((cb) => cb("device-1")),
      getPlayer: jest.fn().mockReturnValue({ activateElement: jest.fn(), pause: jest.fn() }),
      setPlayerStateChangeCb: jest.fn((cb) => {
        playerStateChangeCb = cb;
      }),
      startPlayer: jest.fn().mockResolvedValue(),
    });

    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/create-session/everybody-plays"]}>
        <EverybodyPlaysHost />
      </MemoryRouter>
    );

    fireEvent.click(getByTestId("mock-launch-btn"));

    await waitFor(() => expect(getByTestId("mock-play")).toBeInTheDocument());

    // A stray state change before "Start the session" is clicked (e.g. the
    // SDK's own connect handshake) must not be mistaken for track 1.
    act(() => {
      playerStateChangeCb({
        paused: true,
        track_window: { current_track: { name: "Stray pre-session state", artists: [] } },
      });
    });

    expect(socketEmit).not.toHaveBeenCalledWith(
      "trackReady",
      expect.anything()
    );

    fireEvent.click(getByTestId("start-session-btn"));

    await waitFor(() => expect(getByTestId("skip-track-btn")).toBeInTheDocument());

    act(() => {
      playerStateChangeCb({
        paused: false,
        track_window: { current_track: { name: "Real track 1", artists: [] } },
      });
    });

    expect(socketEmit).toHaveBeenCalledWith(
      "trackReady",
      expect.objectContaining({ track: expect.objectContaining({ name: "Real track 1" }) })
    );
    expect(socketEmit).not.toHaveBeenCalledWith(
      "trackReady",
      expect.objectContaining({ track: expect.objectContaining({ name: "Stray pre-session state" }) })
    );
  });

  it("should pause the player when closing the session", async () => {
    getSelectedProvider.mockReturnValue("spotify");
    const pause = jest.fn();
    useMusicProvider.mockReturnValue({
      isAuthenticated: true,
      login: jest.fn().mockResolvedValue(),
      setupPlayer: jest.fn((cb) => cb("device-1")),
      getPlayer: jest.fn().mockReturnValue({ pause }),
      setPlayerStateChangeCb: jest.fn(),
      startPlayer: jest.fn().mockResolvedValue(),
    });

    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/create-session/everybody-plays"]}>
        <EverybodyPlaysHost />
      </MemoryRouter>
    );

    fireEvent.click(getByTestId("mock-launch-btn"));

    await waitFor(() => expect(getByTestId("mock-play")).toBeInTheDocument());

    fireEvent.click(getByTestId("close-session-btn"));
    fireEvent.click(getByTestId("close-session-btn"));

    expect(pause).toHaveBeenCalled();
  });
});

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
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
      onClick={() => onLaunch({ name: "Alice", color: { background: "1, 2, 3", text: "255, 255, 255" } })}
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

  it("should resume playback when the challenge timer expires", async () => {
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

    (socketListeners["challengeTimedOut"] || []).forEach((listener) => listener());

    expect(resume).toHaveBeenCalled();
  });
});

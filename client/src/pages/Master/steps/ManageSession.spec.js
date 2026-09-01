import React from "react";
import { render, fireEvent, act } from "@testing-library/react";

import { useMusicProvider } from "../../../contexts/MusicProvider";
import { ManageSession } from "./ManageSession";

jest.mock("../../../contexts/MusicProvider");
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn()
}))

let mockListeners = {};
let mockSocket = {};

describe("<ManageSession />", () => {
  beforeEach(() => {
    mockSocket = {
      emit: jest.fn((event, data, callback) => {
        (mockListeners[event] || []).forEach((listener) => listener(data));
        if (callback) {
          callback();
        }
      }),
      on: jest.fn((event, callback) => {
        if (!mockListeners[event]) {
          mockListeners[event] = [];
        }
        mockListeners[event].push(callback);
      }),
    }
  });

  afterEach(() => {
    mockListeners = {};
    jest.clearAllMocks();
  });

  it("should start a session on 'Start the session' button click", async () => {
    const startPlayer = jest.fn().mockResolvedValue({});
    const getPlayer = jest.fn();
    const setPlayerStateChangeCb = jest.fn();
    useMusicProvider.mockReturnValue({
      startPlayer,
      getPlayer,
      setPlayerStateChangeCb,
    });
    const { getByTestId } = render(
      <ManageSession
        sessionUuid="1112345678"
        isPlayerReady={true}
        deviceId="122536"
        socket={mockSocket}
      />
    );

    fireEvent.click(getByTestId("start-session-btn"));

    await act(async () => {
      await process.nextTick(() => {});
      expect(startPlayer).toHaveBeenCalled();
    });
  });

  it("should pause the player right after starting the session, so it opens on track 1 without autoplaying", async () => {
    const startPlayer = jest.fn().mockResolvedValue({});
    const getPlayer = jest.fn();
    const setPlayerStateChangeCb = jest.fn();
    const player = { pause: jest.fn() };
    useMusicProvider.mockReturnValue({
      startPlayer,
      getPlayer,
      setPlayerStateChangeCb,
    });
    const { getByTestId } = render(
      <ManageSession
        sessionUuid="1112345678"
        isPlayerReady={true}
        deviceId="122536"
        player={player}
        socket={mockSocket}
      />
    );

    await act(async () => {
      fireEvent.click(getByTestId("start-session-btn"));
    });

    expect(player.pause).toHaveBeenCalled();
  });

  it("should arm the close-session button on first click without closing it", async () => {
    const startPlayer = jest.fn().mockResolvedValue({});
    const getPlayer = jest.fn();
    const setPlayerStateChangeCb = jest.fn();
    useMusicProvider.mockReturnValue({
      startPlayer,
      getPlayer,
      setPlayerStateChangeCb,
    });
    const { getByTestId, getByText } = render(
      <ManageSession
        sessionUuid="1112345678"
        isPlayerReady={true}
        deviceId="122536"
        socket={mockSocket}
      />
    );

    jest.resetAllMocks();

    fireEvent.click(getByTestId("close-session-btn"));

    expect(mockSocket.emit).not.toHaveBeenCalled();
    expect(getByText("Click again to confirm")).toBeTruthy();
  });

  it("should close the session on the confirming second click", async () => {
    const startPlayer = jest.fn().mockResolvedValue({});
    const getPlayer = jest.fn();
    const setPlayerStateChangeCb = jest.fn();
    useMusicProvider.mockReturnValue({
      startPlayer,
      getPlayer,
      setPlayerStateChangeCb,
    });
    const { getByTestId } = render(
      <ManageSession
        sessionUuid="1112345678"
        isPlayerReady={true}
        deviceId="122536"
        socket={mockSocket}
      />
    );

    jest.resetAllMocks();

    fireEvent.click(getByTestId("close-session-btn"));
    fireEvent.click(getByTestId("close-session-btn"));

    expect(mockSocket.emit).toHaveBeenCalledWith("closeSession", {
      sessionUuid: "1112345678",
    });
  });

  it("should display the challenger list", async () => {
    const startPlayer = jest.fn().mockResolvedValue({});
    const getPlayer = jest.fn();
    const setPlayerStateChangeCb = jest.fn();
    useMusicProvider.mockReturnValue({
      startPlayer,
      getPlayer,
      setPlayerStateChangeCb,
    });
    const { container } = render(
      <ManageSession
        sessionUuid="1112345678"
        isPlayerReady={true}
        deviceId="122536"
        socket={mockSocket}
      />
    );

    await act(async () => {
      mockSocket.emit("challengersUpdate", [
        { uuid: "qwewrw-1232553", name: "name1", score: 1 },
        { uuid: "wuefgeew-82687234", name: "name2", score: 3 },
      ]);
    });

    expect(container.querySelectorAll(".challenger-ranking li").length).toEqual(2);
  });

  it("should clear a stuck lock via the Clear button without touching any score", async () => {
    const startPlayer = jest.fn().mockResolvedValue({});
    const getPlayer = jest.fn();
    const player = { pause: jest.fn(), resume: jest.fn() };
    const setPlayerStateChangeCb = jest.fn();
    useMusicProvider.mockReturnValue({
      startPlayer,
      getPlayer,
      setPlayerStateChangeCb,
    });
    const emitSpy = jest.spyOn(mockSocket, "emit");
    const { container, getByText } = render(
      <ManageSession
        sessionUuid="1112345678"
        isPlayerReady={true}
        deviceId="122536"
        player={player}
        socket={mockSocket}
      />
    );

    await act(async () => {
      mockSocket.emit("challengersUpdate", [
        {
          uuid: "qwewrw-1232553",
          name: "name1",
          score: 1,
          color: { background: "1, 2, 3", text: "255, 255, 255" },
        },
      ]);
      mockSocket.emit("lockChallenge", "qwewrw-1232553");
    });

    expect(container.querySelector(".active-challenger-row")).toBeTruthy();

    await act(async () => {
      fireEvent.click(getByText("Clear"));
    });

    expect(emitSpy).toHaveBeenCalledWith("clearChallenge", {
      sessionUuid: "1112345678",
    });
    expect(player.resume).toHaveBeenCalled();
    expect(container.querySelector(".active-challenger-row")).toBeFalsy();
  });

  it("should resume playback and clear the lock when the challenge timer expires", async () => {
    const startPlayer = jest.fn().mockResolvedValue({});
    const getPlayer = jest.fn();
    const player = { pause: jest.fn(), resume: jest.fn() };
    const setPlayerStateChangeCb = jest.fn();
    useMusicProvider.mockReturnValue({
      startPlayer,
      getPlayer,
      setPlayerStateChangeCb,
    });
    const { container } = render(
      <ManageSession
        sessionUuid="1112345678"
        isPlayerReady={true}
        deviceId="122536"
        player={player}
        socket={mockSocket}
      />
    );

    await act(async () => {
      mockSocket.emit("challengersUpdate", [
        {
          uuid: "qwewrw-1232553",
          name: "name1",
          score: 1,
          color: { background: "1, 2, 3", text: "255, 255, 255" },
        },
      ]);
      mockSocket.emit("lockChallenge", "qwewrw-1232553");
    });

    expect(container.querySelector(".active-challenger-row")).toBeTruthy();

    await act(async () => {
      mockSocket.emit("challengeTimedOut", "qwewrw-1232553");
    });

    expect(player.resume).toHaveBeenCalled();
    expect(container.querySelector(".active-challenger-row")).toBeFalsy();
  });

  it("should display the challenge actions buttons when a user try to answer", async () => {
    const startPlayer = jest.fn().mockResolvedValue({});
    const getPlayer = jest.fn();
    const track = { artists: [{ name: "Jeff Buckley" }], name: "Hallelujah" };
    const player = {
      pause: jest.fn(),
      resume: jest.fn(),
      getCurrentState: jest.fn().mockResolvedValue({
        track_window: {
          current_track: track,
        },
      }),
    };

    const setPlayerStateChangeCb = jest.fn();
    useMusicProvider.mockReturnValue({
      startPlayer,
      getPlayer,
      setPlayerStateChangeCb,
    });
    const emitSpy = jest.spyOn(mockSocket, "emit");
    const { getAllByTestId, getByTestId } = render(
      <ManageSession
        sessionUuid="1112345678"
        isPlayerReady={true}
        deviceId="122536"
        player={player}
        socket={mockSocket}
      />
    );

    fireEvent.click(getByTestId("start-session-btn"));

    await act(async () => {
      mockSocket.emit("challengersUpdate", [
        {
          uuid: "qwewrw-1232553",
          name: "name1",
          score: 1,
          color: { background: "1, 2, 3", text: "255, 255, 255" },
        },
        { uuid: "wuefgeew-82687234", name: "name2", score: 3 },
      ]);

      mockSocket.emit("lockChallenge", "qwewrw-1232553");
    });

    expect(getAllByTestId("challenge-button").length).toEqual(3);

    await act(async () => {
      fireEvent.click(getAllByTestId("challenge-button")[0]);
    });

    expect(emitSpy.mock.calls[2][0]).toEqual("setScore");
    expect(emitSpy.mock.calls[2][1]).toEqual({
      sessionUuid: "1112345678",
      score: 0,
      track: {
        ...track,
        artists: "Jeff Buckley",
      },
    });

    await act(async () => {
      mockSocket.emit("lockChallenge", "qwewrw-1232553");
    });

    await act(async () => {
      fireEvent.click(getAllByTestId("challenge-button")[1]);
    });

    expect(emitSpy.mock.calls[4][0]).toEqual("setScore");
    expect(emitSpy.mock.calls[4][1]).toEqual({
      sessionUuid: "1112345678",
      score: 0.5,
      track: {
        ...track,
        artists: "Jeff Buckley",
      },
    });

    await act(async () => {
      mockSocket.emit("lockChallenge", "qwewrw-1232553");
    });

    await act(async () => {
      fireEvent.click(getAllByTestId("challenge-button")[2]);
    });

    expect(emitSpy.mock.calls[6][0]).toEqual("setScore");
    expect(emitSpy.mock.calls[6][1]).toEqual({
      sessionUuid: "1112345678",
      score: 1,
      track: {
        ...track,
        artists: "Jeff Buckley",
      },
    });
  });

  it("should not crash when releasing a challenger while the current track has no artists (e.g. Apple Music between tracks)", async () => {
    const startPlayer = jest.fn().mockResolvedValue({});
    const getPlayer = jest.fn();
    const player = {
      pause: jest.fn(),
      resume: jest.fn(),
      getCurrentState: jest.fn().mockResolvedValue({
        track_window: {
          current_track: { name: "Hallelujah" },
        },
      }),
    };

    const setPlayerStateChangeCb = jest.fn();
    useMusicProvider.mockReturnValue({
      startPlayer,
      getPlayer,
      setPlayerStateChangeCb,
    });
    const emitSpy = jest.spyOn(mockSocket, "emit");
    const { getAllByTestId, getByTestId } = render(
      <ManageSession
        sessionUuid="1112345678"
        isPlayerReady={true}
        deviceId="122536"
        player={player}
        socket={mockSocket}
      />
    );

    fireEvent.click(getByTestId("start-session-btn"));

    await act(async () => {
      mockSocket.emit("challengersUpdate", [
        {
          uuid: "qwewrw-1232553",
          name: "name1",
          score: 1,
          color: { background: "1, 2, 3", text: "255, 255, 255" },
        },
      ]);

      mockSocket.emit("lockChallenge", "qwewrw-1232553");
    });

    await act(async () => {
      fireEvent.click(getAllByTestId("challenge-button")[0]);
    });

    expect(emitSpy).toHaveBeenCalledWith("setScore", {
      sessionUuid: "1112345678",
      score: 0,
      track: { name: "Hallelujah", artists: "" },
    });
  });
});

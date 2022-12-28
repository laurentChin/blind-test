import React from "react";
import { render, fireEvent, act } from "@testing-library/react";
import io from "socket.io-client";

import { SpotifyContext } from "../../../contexts/Spotify";
import { ManageSession } from "./ManageSession";

jest.mock("qrcode");

describe("<ManageSession />", () => {
  it("should start a session on 'Start the session' button click", async () => {
    const startPlayer = jest.fn().mockResolvedValue({});
    const getPlayer = jest.fn();
    const setPlayerStateChangeCb = jest.fn();
    const { getByTestId } = render(
      <SpotifyContext.Provider
        value={{ startPlayer, getPlayer, setPlayerStateChangeCb }}
      >
        <ManageSession
          sessionUuid="1112345678"
          isPlayerReady={true}
          isPlayerScriptLoaded={true}
          deviceId="122536"
        />
      </SpotifyContext.Provider>
    );

    fireEvent.click(getByTestId("start-session-btn"));

    await act(async () => {
      await process.nextTick(() => {});
      expect(startPlayer).toHaveBeenCalled();
    });
  });

  it("should display the challenger list", async () => {
    const startPlayer = jest.fn().mockResolvedValue({});
    const getPlayer = jest.fn();
    const setPlayerStateChangeCb = jest.fn();
    const { container } = render(
      <SpotifyContext.Provider
        value={{ startPlayer, getPlayer, setPlayerStateChangeCb }}
      >
        <ManageSession
          sessionUuid="1112345678"
          isPlayerReady={true}
          isPlayerScriptLoaded={true}
          deviceId="122536"
        />
      </SpotifyContext.Provider>
    );

    await act(async () => {
      io().emit("challengersUpdate", [
        { uuid: "qwewrw-1232553", name: "name1", score: 1 },
        { uuid: "wuefgeew-82687234", name: "name2", score: 3 },
      ]);
    });

    expect(container.querySelectorAll(".challenger-list p").length).toEqual(2);
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
    const socket = io();
    const emitSpy = jest.spyOn(socket, "emit");
    const { getAllByTestId, getByTestId } = render(
      <SpotifyContext.Provider
        value={{ startPlayer, getPlayer, setPlayerStateChangeCb }}
      >
        <ManageSession
          sessionUuid="1112345678"
          isPlayerReady={true}
          isPlayerScriptLoaded={true}
          deviceId="122536"
          player={player}
        />
      </SpotifyContext.Provider>
    );

    fireEvent.click(getByTestId("start-session-btn"));

    await act(async () => {
      socket.emit("challengersUpdate", [
        { uuid: "qwewrw-1232553", name: "name1", score: 1 },
        { uuid: "wuefgeew-82687234", name: "name2", score: 3 },
      ]);

      socket.emit("lockChallenge", "qwewrw-1232553");
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
      socket.emit("lockChallenge", "qwewrw-1232553");
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
      socket.emit("lockChallenge", "qwewrw-1232553");
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
});

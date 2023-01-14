import React from "react";
import { render, act } from "@testing-library/react";
import { Play } from "./Play";

let mockSocket;

describe("<Play />", () => {
  beforeEach(() => {
    mockSocket = {
      emit: jest.fn(),
      on: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Should hide 'challenge' button if an user is trying to answer", async () => {
    const listeners = {};
    const socket = {
      emit: jest.fn((event, data) => {
        listeners[event].forEach((listener) => listener(data));
      }),
      on: jest.fn((event, callback) => {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        listeners[event].push(callback);
      }),
    };
    const { getByTestId } = render(
      <Play
        sessionUuid="session-12345"
        player={{ uuid: "player-12345", name: "bob", color: "#e6194B" }}
        socket={socket}
      />
    );

    expect(getByTestId("challenge-button")).toHaveTextContent("Challenge");
    expect(getByTestId("challenge-button")).not.toBeDisabled();

    await act(async () => {
      socket.emit("challengersUpdate", [
        { uuid: "player-12345", name: "bob", color: "#e6194B" },
      ]);
      socket.emit("lockChallenge", "player-12345");
    });

    expect(getByTestId("challenge-button")).toHaveTextContent("bob");
    expect(getByTestId("challenge-button")).toBeDisabled();
  });
});

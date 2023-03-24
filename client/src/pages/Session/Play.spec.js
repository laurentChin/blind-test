import React from "react";
import { render, act, fireEvent } from "@testing-library/react";
import { Play } from "./Play";

let mockListeners = {};
let mockSocket = {};

window.Notification = jest.fn();

describe("<Play />", () => {
  beforeEach(() => {
    mockSocket = {
      emit: jest.fn((event, data, callback) => {
        mockListeners[event].forEach((listener) => listener(data));
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
    };
  });

  afterEach(() => {
    mockListeners = {};
    jest.clearAllMocks();
  });

  it("Should hide 'challenge' button if an user is trying to answer", async () => {

    const { getByTestId } = render(
      <Play
        sessionUuid="session-12345"
        player={{ uuid: "player-12345", name: "bob", color: "#e6194B" }}
        socket={mockSocket}
        onLeave={jest.fn}
        challengers={[]}
      />
    );

    expect(getByTestId("challenge-button")).toHaveTextContent("Challenge");
    expect(getByTestId("challenge-button")).not.toBeDisabled();

    await act(async () => {
      mockSocket.emit("challengersUpdate", [
        { uuid: "player-12345", name: "bob", color: "#e6194B" },
      ]);
      mockSocket.emit("lockChallenge", "player-12345");
    });

    expect(getByTestId("challenge-button")).toHaveTextContent("bob");
    expect(getByTestId("challenge-button")).toBeDisabled();
  });

  it("should call onLeave callback on confirm when user click on leave button", () => {
    const onLeaveCb = jest.fn();

    window.confirm = () => true;

    const { getByTestId } = render(
      <Play
        sessionUuid="session-12345"
        onLeave={onLeaveCb}
        socket={mockSocket}
        player={{ uuid: "player-12345", name: "bob", color: "255,255,255" }}
        challengers={[]}
      />
    );

    mockSocket.on('leave', jest.fn)

    fireEvent.click(getByTestId('leave-session-button'))

    expect(onLeaveCb).toHaveBeenCalled();
  });

  it("should not call onLeave callback when user does not confirm leaving", () => {
    const onLeaveCb = jest.fn();

    window.confirm = () => false;

    const { getByTestId } = render(
      <Play
        sessionUuid="session-12345"
        onLeave={onLeaveCb}
        socket={mockSocket}
        player={{ uuid: "player-12345", name: "bob", color: "255,255,255" }}
        challengers={[]}
      />
    );

    mockSocket.on('leave', jest.fn)

    fireEvent.click(getByTestId('leave-session-button'))

    expect(onLeaveCb).not.toHaveBeenCalled();
  });

  it("should call onLeave callback when session is closed by the master", () => {
    const onLeaveCb = jest.fn();

    render(
      <Play
        sessionUuid="session-12345"
        onLeave={onLeaveCb}
        socket={mockSocket}
        player={{ uuid: "player-12345", name: "bob", color: "255,255,255" }}
        challengers={[]}
      />
    );

    mockSocket.emit('sessionClosedByMaster', jest.fn)

    expect(onLeaveCb).toHaveBeenCalled();
  });
});

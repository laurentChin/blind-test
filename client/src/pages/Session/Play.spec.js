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

  describe("mode='everybodyPlays'", () => {
    const player = { uuid: "player-12345", name: "bob", color: "#e6194B" };

    it("should show a reveal button instead of the buzzer once this player is locked in, then the score buttons once revealed", async () => {
      const { getByTestId, queryByTestId } = render(
        <Play
          mode="everybodyPlays"
          sessionUuid="session-12345"
          player={player}
          socket={mockSocket}
          onLeave={jest.fn()}
          challengers={[]}
        />
      );

      await act(async () => {
        mockSocket.emit("trackReady", { name: "Hallelujah", artists: "Jeff Buckley" });
        mockSocket.emit("lockChallenge", "player-12345");
      });

      expect(queryByTestId("challenge-button")).toBeFalsy();
      expect(getByTestId("reveal-answer-btn")).toBeInTheDocument();

      fireEvent.click(getByTestId("reveal-answer-btn"));

      expect(getByTestId("self-score-wrong-btn")).toBeInTheDocument();
      expect(getByTestId("self-score-half-btn")).toBeInTheDocument();
      expect(getByTestId("self-score-full-btn")).toBeInTheDocument();
    });

    it("should open a dialog with the buzzing player's name, instead of showing it in the main button, when someone else takes the buzzer", async () => {
      const { getByTestId, container } = render(
        <Play
          mode="everybodyPlays"
          sessionUuid="session-12345"
          player={player}
          socket={mockSocket}
          onLeave={jest.fn()}
          challengers={[]}
        />
      );

      const dialog = container.querySelector(".challenger-dialog");
      expect(dialog.open).toBeFalsy();

      await act(async () => {
        mockSocket.emit("challengersUpdate", [
          { uuid: "other-player", name: "alice", color: "1,2,3" },
        ]);
        mockSocket.emit("lockChallenge", "other-player");
      });

      expect(getByTestId("challenge-button")).toBeDisabled();
      expect(getByTestId("challenge-button")).not.toHaveTextContent("alice");
      expect(dialog.open).toBeTruthy();
      expect(dialog.textContent).toBe("alice");

      await act(async () => {
        mockSocket.emit("challengerRelease", []);
      });

      expect(dialog.open).toBeFalsy();
    });

    it("should emit setScore with the revealed track when a success button is clicked", async () => {
      mockSocket.on("setScore", jest.fn());
      const { getByTestId } = render(
        <Play
          mode="everybodyPlays"
          sessionUuid="session-12345"
          player={player}
          socket={mockSocket}
          onLeave={jest.fn()}
          challengers={[]}
        />
      );

      await act(async () => {
        mockSocket.emit("trackReady", { name: "Hallelujah", artists: "Jeff Buckley" });
        mockSocket.emit("lockChallenge", "player-12345");
      });

      fireEvent.click(getByTestId("reveal-answer-btn"));
      fireEvent.click(getByTestId("self-score-full-btn"));

      expect(mockSocket.emit).toHaveBeenCalledWith("setScore", {
        sessionUuid: "session-12345",
        score: 1,
        track: { name: "Hallelujah", artists: "Jeff Buckley" },
      });
    });

    it("should emit markWrongAnswer and disable further buzzing on this track when 'Wrong' is clicked", async () => {
      mockSocket.on("markWrongAnswer", jest.fn());
      const { getByTestId } = render(
        <Play
          mode="everybodyPlays"
          sessionUuid="session-12345"
          player={player}
          socket={mockSocket}
          onLeave={jest.fn()}
          challengers={[]}
        />
      );

      await act(async () => {
        mockSocket.emit("trackReady", { name: "Hallelujah", artists: "Jeff Buckley" });
        mockSocket.emit("lockChallenge", "player-12345");
      });

      fireEvent.click(getByTestId("reveal-answer-btn"));
      fireEvent.click(getByTestId("self-score-wrong-btn"));

      expect(mockSocket.emit).toHaveBeenCalledWith("markWrongAnswer", {
        sessionUuid: "session-12345",
        playerUuid: "player-12345",
      });

      await act(async () => {
        mockSocket.emit("challengerRelease", []);
      });

      expect(getByTestId("challenge-button")).toBeDisabled();
      expect(getByTestId("challenge-button")).toHaveTextContent(
        "Already tried this track"
      );
    });

    it("should disable buzzing when the server rejects a challenge as already-excluded", () => {
      mockSocket.on("challenge", jest.fn());
      const { getByTestId } = render(
        <Play
          mode="everybodyPlays"
          sessionUuid="session-12345"
          player={player}
          socket={mockSocket}
          onLeave={jest.fn()}
          challengers={[]}
        />
      );

      fireEvent.click(getByTestId("challenge-button"));

      const [, , ackCallback] = mockSocket.emit.mock.calls.find(
        ([event]) => event === "challenge"
      );

      act(() => {
        ackCallback({ rejected: true });
      });

      expect(getByTestId("challenge-button")).toBeDisabled();
      expect(getByTestId("challenge-button")).toHaveTextContent(
        "Already tried this track"
      );
    });

    it("should reset the excluded/revealed state on a new track", async () => {
      const { getByTestId } = render(
        <Play
          mode="everybodyPlays"
          sessionUuid="session-12345"
          player={player}
          socket={mockSocket}
          onLeave={jest.fn()}
          challengers={[]}
        />
      );

      fireEvent.click(getByTestId("challenge-button"));
      const [, , ackCallback] = mockSocket.emit.mock.calls.find(
        ([event]) => event === "challenge"
      );

      act(() => {
        ackCallback({ rejected: true });
      });

      expect(getByTestId("challenge-button")).toBeDisabled();

      await act(async () => {
        mockSocket.emit("trackReady", { name: "Yesterday", artists: "The Beatles" });
      });

      expect(getByTestId("challenge-button")).not.toBeDisabled();
      expect(getByTestId("challenge-button")).toHaveTextContent("Challenge");
    });
  });
});

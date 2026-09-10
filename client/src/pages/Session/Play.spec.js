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
        player={{
          uuid: "player-12345",
          name: "bob",
          color: { background: "230, 25, 75", text: "255, 255, 255" },
        }}
        socket={mockSocket}
        onLeave={jest.fn}
        challengers={[]}
      />
    );

    expect(getByTestId("challenge-button")).toHaveTextContent("Challenge");
    expect(getByTestId("challenge-button")).not.toBeDisabled();

    await act(async () => {
      mockSocket.emit("challengersUpdate", [
        {
          uuid: "player-12345",
          name: "bob",
          color: { background: "230, 25, 75", text: "255, 255, 255" },
        },
      ]);
      mockSocket.emit("lockChallenge", "player-12345");
    });

    expect(getByTestId("challenge-button")).toHaveTextContent("bob");
    expect(getByTestId("challenge-button")).toBeDisabled();
  });

  it("should show the timer fill while a challenge is locked", async () => {
    const { getByTestId } = render(
      <Play
        sessionUuid="session-12345"
        player={{
          uuid: "player-12345",
          name: "bob",
          color: { background: "230, 25, 75", text: "255, 255, 255" },
        }}
        socket={mockSocket}
        onLeave={jest.fn}
        challengers={[]}
        timerSeconds={7}
      />
    );

    await act(async () => {
      mockSocket.emit("lockChallenge", "player-12345");
    });

    expect(getByTestId("challenge-button")).toHaveClass("is-timing");
    expect(getByTestId("challenge-button")).toHaveStyle(
      "--timer-duration: 7s"
    );
  });

  it("should unfreeze everyone and put the timed-out challenger on cooldown when the timer expires", async () => {
    jest.useFakeTimers();

    const { getByTestId } = render(
      <Play
        sessionUuid="session-12345"
        player={{
          uuid: "player-12345",
          name: "bob",
          color: { background: "230, 25, 75", text: "255, 255, 255" },
        }}
        socket={mockSocket}
        onLeave={jest.fn}
        challengers={[]}
        cooldownSeconds={2}
      />
    );

    await act(async () => {
      mockSocket.emit("lockChallenge", "player-12345");
    });

    expect(getByTestId("challenge-button")).toBeDisabled();

    await act(async () => {
      mockSocket.emit("challengeTimedOut", "player-12345");
    });

    expect(getByTestId("challenge-button")).toBeDisabled();
    expect(getByTestId("challenge-button")).toHaveClass("is-cooldown");
    expect(getByTestId("challenge-button")).toHaveTextContent("Cooldown…");

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(getByTestId("challenge-button")).not.toBeDisabled();
    expect(getByTestId("challenge-button")).toHaveTextContent("Challenge");

    jest.useRealTimers();
  });

  it("should just unfreeze other players, without a cooldown, when someone else's timer expires", async () => {
    const { getByTestId } = render(
      <Play
        sessionUuid="session-12345"
        player={{
          uuid: "player-12345",
          name: "bob",
          color: { background: "230, 25, 75", text: "255, 255, 255" },
        }}
        socket={mockSocket}
        onLeave={jest.fn}
        challengers={[]}
      />
    );

    await act(async () => {
      mockSocket.emit("lockChallenge", "other-player");
    });

    expect(getByTestId("challenge-button")).toBeDisabled();

    await act(async () => {
      mockSocket.emit("challengeTimedOut", "other-player");
    });

    expect(getByTestId("challenge-button")).not.toBeDisabled();
    expect(getByTestId("challenge-button")).not.toHaveClass("is-cooldown");
  });

  it("should call onLeave callback on confirm when user click on leave button", () => {
    const onLeaveCb = jest.fn();

    window.confirm = () => true;

    const { getByTestId } = render(
      <Play
        sessionUuid="session-12345"
        onLeave={onLeaveCb}
        socket={mockSocket}
        player={{
          uuid: "player-12345",
          name: "bob",
          color: { background: "255, 255, 255", text: "0, 0, 0" },
        }}
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
        player={{
          uuid: "player-12345",
          name: "bob",
          color: { background: "255, 255, 255", text: "0, 0, 0" },
        }}
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
        player={{
          uuid: "player-12345",
          name: "bob",
          color: { background: "255, 255, 255", text: "0, 0, 0" },
        }}
        challengers={[]}
      />
    );

    mockSocket.emit('sessionClosedByMaster', jest.fn)

    expect(onLeaveCb).toHaveBeenCalled();
  });

  describe("mode='everybodyPlays'", () => {
    const player = {
      uuid: "player-12345",
      name: "bob",
      color: { background: "230, 25, 75", text: "255, 255, 255" },
    };

    it("should show a non-interactive answering timer instead of the buzzer once this player is locked in, then auto-reveal the score buttons once the timer times out", async () => {
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
        mockSocket.emit("trackReady", {
          track: {
            name: "Hallelujah",
            artists: "Jeff Buckley",
            image: "https://img/cover.jpg",
          },
        });
        mockSocket.emit("lockChallenge", "player-12345");
      });

      expect(queryByTestId("challenge-button")).toBeFalsy();
      expect(getByTestId("answering-timer")).toBeInTheDocument();
      expect(queryByTestId("self-score-none-btn")).toBeFalsy();

      await act(async () => {
        mockSocket.emit("challengeTimedOut", "player-12345");
      });

      expect(getByTestId("revealed-cover")).toHaveAttribute(
        "src",
        "https://img/cover.jpg"
      );
      expect(getByTestId("self-score-none-btn")).toBeInTheDocument();
      expect(getByTestId("self-score-almost-btn")).toBeInTheDocument();
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
          {
            uuid: "other-player",
            name: "alice",
            color: { background: "1, 2, 3", text: "255, 255, 255" },
          },
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

    it("should emit setScore with the configured points when a score button is clicked", async () => {
      mockSocket.on("setScore", jest.fn());
      const { getByTestId } = render(
        <Play
          mode="everybodyPlays"
          sessionUuid="session-12345"
          player={player}
          socket={mockSocket}
          onLeave={jest.fn()}
          challengers={[]}
          almostPoints={0.5}
          fullPoints={2}
        />
      );

      await act(async () => {
        mockSocket.emit("trackReady", { track: { name: "Hallelujah", artists: "Jeff Buckley" } });
        mockSocket.emit("lockChallenge", "player-12345");
        mockSocket.emit("challengeTimedOut", "player-12345");
      });

      fireEvent.click(getByTestId("self-score-full-btn"));

      expect(mockSocket.emit).toHaveBeenCalledWith("setScore", {
        sessionUuid: "session-12345",
        playerUuid: "player-12345",
        score: 2,
        track: { name: "Hallelujah", artists: "Jeff Buckley" },
      });
    });

    it("should emit markWrongAnswer, then keep showing the answer with the score buttons disabled, when 'Fake news' is clicked", async () => {
      mockSocket.on("markWrongAnswer", jest.fn());
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
        mockSocket.emit("trackReady", { track: { name: "Hallelujah", artists: "Jeff Buckley" } });
        mockSocket.emit("lockChallenge", "player-12345");
        mockSocket.emit("challengeTimedOut", "player-12345");
      });

      fireEvent.click(getByTestId("self-score-none-btn"));

      expect(mockSocket.emit).toHaveBeenCalledWith("markWrongAnswer", {
        sessionUuid: "session-12345",
        playerUuid: "player-12345",
      });

      await act(async () => {
        mockSocket.emit("challengerRelease", []);
      });

      // Still on the answer screen (not back to the buzzer) — same track
      // keeps playing for other players until someone advances it.
      expect(queryByTestId("challenge-button")).toBeFalsy();
      expect(getByTestId("self-score-none-btn")).toBeDisabled();
      expect(getByTestId("self-score-almost-btn")).toBeDisabled();
      expect(getByTestId("self-score-full-btn")).toBeDisabled();

      // A genuinely new track (someone else eventually got it, or the host
      // skipped) brings back the normal play screen.
      await act(async () => {
        mockSocket.emit("trackReady", { track: { name: "Yesterday", artists: "The Beatles" } });
      });

      expect(getByTestId("challenge-button")).not.toBeDisabled();
      expect(getByTestId("challenge-button")).toHaveTextContent("Challenge");
    });

    it("should broadcast the answer reveal to a player who never challenged, without any score buttons", async () => {
      const bystander = {
        uuid: "player-bystander",
        name: "alice",
        color: { background: "1, 2, 3", text: "255, 255, 255" },
      };
      const { getByTestId, queryByTestId } = render(
        <Play
          mode="everybodyPlays"
          sessionUuid="session-12345"
          player={bystander}
          socket={mockSocket}
          onLeave={jest.fn()}
          challengers={[]}
        />
      );

      await act(async () => {
        mockSocket.emit("trackReady", { track: { name: "Hallelujah", artists: "Jeff Buckley" } });
        // Someone else buzzes in and answers — this player never does.
        mockSocket.emit("lockChallenge", "player-12345");
        mockSocket.emit("challengeResult", {
          score: 1,
          track: { name: "Hallelujah", artists: "Jeff Buckley", image: "https://img/cover.jpg" },
        });
      });

      expect(getByTestId("revealed-cover")).toHaveAttribute(
        "src",
        "https://img/cover.jpg"
      );
      expect(getByTestId("revealed-track")).toHaveTextContent("Hallelujah");
      expect(queryByTestId("self-score-none-btn")).toBeFalsy();
      expect(queryByTestId("self-score-almost-btn")).toBeFalsy();
      expect(queryByTestId("self-score-full-btn")).toBeFalsy();
      expect(queryByTestId("reveal-next-track-btn")).toBeFalsy();
    });

    it("should only show the 'Next song' button to the host, on the broadcast reveal screen", async () => {
      const onSkipTrack = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <Play
          mode="everybodyPlays"
          sessionUuid="session-12345"
          player={player}
          socket={mockSocket}
          onLeave={jest.fn()}
          challengers={[]}
          isHost
          onSkipTrack={onSkipTrack}
        />
      );

      await act(async () => {
        mockSocket.emit("trackReady", { track: { name: "Hallelujah", artists: "Jeff Buckley" } });
      });

      expect(queryByTestId("reveal-next-track-btn")).toBeFalsy();

      await act(async () => {
        mockSocket.emit("challengeResult", {
          score: 1,
          track: { name: "Hallelujah", artists: "Jeff Buckley" },
        });
      });

      fireEvent.click(getByTestId("reveal-next-track-btn"));

      expect(onSkipTrack).toHaveBeenCalled();
    });

    it("should hide the 'Next song' button and show the final scores dialog once the last track's answer is revealed", async () => {
      const onSkipTrack = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <Play
          mode="everybodyPlays"
          sessionUuid="session-12345"
          player={player}
          socket={mockSocket}
          onLeave={jest.fn()}
          challengers={[
            { uuid: "player-12345", name: "bob", score: 2 },
            { uuid: "player-99999", name: "alice", score: 3 },
          ]}
          isHost
          onSkipTrack={onSkipTrack}
          totalTracks={2}
          playedCount={2}
        />
      );

      await act(async () => {
        mockSocket.emit("trackReady", {
          track: { name: "Hallelujah", artists: "Jeff Buckley" },
          playedCount: 2,
          totalTracks: 2,
        });
        mockSocket.emit("challengeResult", {
          score: 1,
          track: { name: "Hallelujah", artists: "Jeff Buckley" },
        });
      });

      expect(queryByTestId("reveal-next-track-btn")).toBeFalsy();
      const dialog = getByTestId("final-score-dialog");
      expect(dialog.open).toBeTruthy();
      expect(dialog).toHaveTextContent("alice");
      expect(dialog).toHaveTextContent("3");
      expect(dialog).toHaveTextContent("bob");
      expect(dialog).toHaveTextContent("2");
    });

    it("should not show the final scores dialog until the self-scoring challenger has actually submitted a score, even on the last track", async () => {
      const { getByTestId, container } = render(
        <Play
          mode="everybodyPlays"
          sessionUuid="session-12345"
          player={player}
          socket={mockSocket}
          onLeave={jest.fn()}
          challengers={[{ ...player, score: 0 }]}
          totalTracks={1}
          playedCount={1}
        />
      );

      const dialog = container.querySelector(".final-score-dialog");

      await act(async () => {
        mockSocket.emit("trackReady", {
          track: { name: "Hallelujah", artists: "Jeff Buckley" },
          playedCount: 1,
          totalTracks: 1,
        });
        mockSocket.emit("lockChallenge", "player-12345");
        mockSocket.emit("challengeTimedOut", "player-12345");
      });

      // Timer ran out and the answer is revealed to this challenger, but they
      // haven't clicked a score button yet — the dialog must stay hidden so
      // it doesn't cover those buttons.
      expect(dialog.open).toBeFalsy();
      expect(getByTestId("self-score-full-btn")).toBeInTheDocument();

      fireEvent.click(getByTestId("self-score-full-btn"));

      // The server only reveals the round to everyone (challengeResult) once
      // the score is actually submitted.
      await act(async () => {
        mockSocket.emit("challengeResult", {
          score: 1,
          track: { name: "Hallelujah", artists: "Jeff Buckley" },
        });
      });

      expect(dialog.open).toBeTruthy();
      expect(dialog.textContent).toContain("bob");
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

    it("should keep bystanders locked out while the challenger is mid-reveal, releasing them only once the challenger submits", async () => {
      const bystander = {
        uuid: "player-bystander",
        name: "alice",
        color: { background: "1, 2, 3", text: "255, 255, 255" },
      };
      const { getByTestId } = render(
        <Play
          mode="everybodyPlays"
          sessionUuid="session-12345"
          player={bystander}
          socket={mockSocket}
          onLeave={jest.fn()}
          challengers={[]}
        />
      );

      await act(async () => {
        mockSocket.emit("lockChallenge", "player-12345");
        mockSocket.emit("challengeTimedOut", "player-12345");
      });

      // The challenger's own timer ran out, but they're still mid-reveal —
      // a bystander must not be handed the buzzer back until that's over,
      // or they could steal the round out from under the challenger.
      expect(getByTestId("challenge-button")).toBeDisabled();

      await act(async () => {
        mockSocket.emit("challengerRelease", []);
      });

      expect(getByTestId("challenge-button")).not.toBeDisabled();
    });

    it("should restore an in-progress lock, exclusion, and track on reconnect via restoredState", async () => {
      const { getByTestId } = render(
        <Play
          mode="everybodyPlays"
          sessionUuid="session-12345"
          player={player}
          socket={mockSocket}
          onLeave={jest.fn()}
          challengers={[]}
          restoredState={{
            currentChallenger: "player-12345",
            currentTrack: {
              name: "Hallelujah",
              artists: "Jeff Buckley",
              image: "https://img/cover.jpg",
            },
          }}
        />
      );

      // Reconnecting as the player who was mid-answer lands straight back
      // on the score buttons — the timer itself doesn't need restoring
      // since scoring is self-reported.
      expect(getByTestId("revealed-cover")).toHaveAttribute(
        "src",
        "https://img/cover.jpg"
      );
      expect(getByTestId("self-score-full-btn")).toBeInTheDocument();
    });

    it("should restore an already-excluded state on reconnect", () => {
      const { getByTestId } = render(
        <Play
          mode="everybodyPlays"
          sessionUuid="session-12345"
          player={player}
          socket={mockSocket}
          onLeave={jest.fn()}
          challengers={[]}
          restoredState={{ isExcluded: true }}
        />
      );

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
        mockSocket.emit("trackReady", { track: { name: "Yesterday", artists: "The Beatles" } });
      });

      expect(getByTestId("challenge-button")).not.toBeDisabled();
      expect(getByTestId("challenge-button")).toHaveTextContent("Challenge");
    });
  });
});

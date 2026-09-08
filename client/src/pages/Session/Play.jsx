import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { MdExpandMore, MdExpandLess } from "react-icons/md";

import { colorPropType } from "../../components/ColorPicker/ColorPicker";

import "./Play.css";

if (window.Notification && window.Notification.permission !== 'granted') {
  window.Notification.requestPermission();
}

const CHALLENGER_DRAWER_ID = "challenger-drawer";

const Play = ({
  sessionUuid,
  socket,
  player,
  onLeave,
  mode = "classic",
  timerSeconds = 5,
  cooldownSeconds = 2,
  almostPoints = 0.5,
  fullPoints = 1,
  isHost = false,
  onSkipTrack,
  ...props
}) => {
  const [challengers, setChallengers] = useState(props.challengers || []);
  const [isChallengeLocked, setChallengeLock] = useState(false);
  const [challengerUuid, setChallengerUuid] = useState();
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const cooldownTimeoutRef = useRef();
  // "everybodyPlays" only: the current/upcoming track, privately cached from
  // the host's trackReady broadcast ahead of time and only shown once this
  // player's own challenge timer runs out (see challengeTimedOut below).
  const [currentTrack, setCurrentTrack] = useState();
  const [isRevealed, setIsRevealed] = useState(false);
  // Locally known "already tried this track and got it wrong" — set
  // optimistically on a wrong self-report, and defensively if the server
  // rejects a buzz-in (e.g. after a refresh mid-track). Reset whenever a new
  // track is cued.
  const [isExcluded, setIsExcluded] = useState(false);
  // Set once this player has clicked one of the 3 score buttons — the
  // answer stays on screen (until the next trackReady) but the buttons
  // themselves are disabled so a submission can't be sent twice.
  const [isScoreSubmitted, setIsScoreSubmitted] = useState(false);
  // "everybodyPlays" only: a correct answer is broadcast to every player
  // (not just the one who scored) via challengeResult — this shows the same
  // reveal screen to everyone, without score buttons, until the host moves
  // the game on.
  const [isTrackRevealed, setIsTrackRevealed] = useState(false);
  const challengerDialog = useRef();

  useEffect(() => {
    setChallengers(props.challengers)
  }, [props.challengers])

  socket.on("challengersUpdate", setChallengers);

  socket.on("lockChallenge", (msg) => {
    setChallengeLock(true);
    setChallengerUuid(msg);
  });

  socket.on("challengerRelease", (msg) => {
    setChallengeLock(false);
    setChallengerUuid(undefined);
    setChallengers(msg);
  });

  socket.on("challengeTimedOut", (timedOutPlayerUuid) => {
    setChallengeLock(false);
    setChallengerUuid(undefined);

    if (timedOutPlayerUuid !== player.uuid) return;

    // Everybody plays: the timer running out is what reveals the answer —
    // there's no manual "reveal" step, so this player goes straight to the
    // score buttons instead of a cooldown.
    if (mode === "everybodyPlays") {
      setIsRevealed(true);
      return;
    }

    clearTimeout(cooldownTimeoutRef.current);
    setIsOnCooldown(true);
    cooldownTimeoutRef.current = setTimeout(
      () => setIsOnCooldown(false),
      cooldownSeconds * 1000
    );
  });

  useEffect(() => () => clearTimeout(cooldownTimeoutRef.current), []);

  socket.on("trackReady", (track) => {
    setCurrentTrack(track);
    setIsRevealed(false);
    setIsExcluded(false);
    setIsScoreSubmitted(false);
    setIsTrackRevealed(false);
  });

  socket.on("challengeResult", ({ track }) => {
    if (mode !== "everybodyPlays") return;

    setCurrentTrack(track);
    setIsTrackRevealed(true);
  });

  const clearSession = () => {
    sessionStorage.removeItem("player");
    sessionStorage.removeItem("sessionUuid");
    onLeave();
  }

  socket.on("sessionClosedByMaster", () => {
    if (window.Notification && window.Notification.permission === 'granted') {
      const notification = new window.Notification('Blind test', { body: "The session has been closed.", requireInteraction: true });
    }
    clearSession()
  })

  const leave = () => {
    if (window.confirm("Are you sure want to leave the session?")) {
      socket.emit("leave", { sessionUuid, playerUuid: player.uuid }, clearSession);
    }
  };

  const buzzIn = () =>
    socket.emit("challenge", { sessionUuid, playerUuid: player.uuid }, (ack) => {
      if (ack?.rejected) {
        setIsExcluded(true);
      }
    });

  const markWrong = () => {
    socket.emit("markWrongAnswer", { sessionUuid, playerUuid: player.uuid });
    setIsScoreSubmitted(true);
    setIsExcluded(true);
  };

  const selfScore = (score) => {
    socket.emit("setScore", {
      sessionUuid,
      playerUuid: player.uuid,
      score,
      track: currentTrack,
    });
    setIsScoreSubmitted(true);
  };

  const ranked = [...challengers].sort((a, b) => b.score - a.score);
  const lockedChallenger = challengers.find(
    (challenger) => challenger.uuid === challengerUuid
  );
  const isSelfChallenging = mode === "everybodyPlays" && challengerUuid === player.uuid;
  // No shared Board in this mode — a dialog is how every other player's own
  // phone finds out who buzzed in, instead of packing the name into the
  // (now generic) challenge button label.
  const isLockedBySomeoneElse =
    mode === "everybodyPlays" && isChallengeLocked && !isSelfChallenging;

  useEffect(() => {
    if (isLockedBySomeoneElse) {
      challengerDialog.current?.showModal();
    } else {
      challengerDialog.current?.close();
    }
  }, [isLockedBySomeoneElse]);

  return (
    <div className="Play">
      <h1 className="visually-hidden">Play</h1>
      {isSelfChallenging || isRevealed || isTrackRevealed ? (
        <div className="reveal-container" data-testid="reveal-container">
          {isSelfChallenging && !isRevealed ? (
            <div
              className={`answering-timer ${
                isChallengeLocked ? "is-timing" : ""
              }`.trim()}
              style={{ "--timer-duration": `${timerSeconds}s` }}
              data-testid="answering-timer"
            >
              Answer out loud…
            </div>
          ) : (
            <>
              {currentTrack?.image && (
                <img
                  className="revealed-cover"
                  data-testid="revealed-cover"
                  src={currentTrack.image}
                  alt=""
                />
              )}
              {currentTrack && (
                <p className="revealed-track" data-testid="revealed-track">
                  <strong>{currentTrack.name}</strong>
                  {currentTrack.artists && ` — ${currentTrack.artists}`}
                </p>
              )}
              {isRevealed && (
                <div className="self-score-buttons">
                  <button
                    type="button"
                    data-testid="self-score-none-btn"
                    className="btn btn-danger-strong"
                    disabled={isScoreSubmitted}
                    onClick={markWrong}
                  >
                    Fake news
                  </button>
                  <button
                    type="button"
                    data-testid="self-score-full-btn"
                    className="btn btn-score-full"
                    disabled={isScoreSubmitted}
                    onClick={() => selfScore(fullPoints)}
                  >
                    Jackpot
                  </button>
                  <button
                    type="button"
                    data-testid="self-score-almost-btn"
                    className="btn btn-score-half"
                    disabled={isScoreSubmitted}
                    onClick={() => selfScore(almostPoints)}
                  >
                    Title or Artist
                  </button>
                </div>
              )}
              {isHost && isTrackRevealed && (
                <button
                  type="button"
                  data-testid="reveal-next-track-btn"
                  className="btn btn-ghost next-track-btn"
                  onClick={onSkipTrack}
                >
                  Next song
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <button
          style={{
            "--player-color": `rgb(${player.color.background})`,
            "--player-color-text": `rgb(${player.color.text})`,
            "--timer-duration": `${timerSeconds}s`,
            "--cooldown-duration": `${cooldownSeconds}s`,
          }}
          disabled={isChallengeLocked || isExcluded || isOnCooldown}
          onClick={buzzIn}
          data-testid="challenge-button"
          className={`Session-challenge-button ${
            isChallengeLocked ? "is-timing" : ""
          } ${isOnCooldown ? "is-cooldown" : ""}`.trim()}
        >
          {isOnCooldown
            ? "Cooldown…"
            : isChallengeLocked
            ? mode === "everybodyPlays"
              ? "Answering…"
              : lockedChallenger?.name
            : isExcluded
            ? "Already tried this track"
            : `Challenge`}
        </button>
      )}
      {mode === "everybodyPlays" && (
        <dialog
          ref={challengerDialog}
          className="challenger-dialog"
          onClick={(event) => {
            if (event.target === challengerDialog.current) {
              challengerDialog.current.close();
            }
          }}
        >
          {lockedChallenger && (
            <p
              className="dialog-challenger-name"
              style={{
                "--player-color": `rgb(${lockedChallenger.color.background})`,
                "--player-color-text": `rgb(${lockedChallenger.color.text})`,
              }}
            >
              {lockedChallenger.name}
            </p>
          )}
        </dialog>
      )}
      <button
        className="btn btn-danger Session-leave-button"
        data-testid="leave-session-button"
        onClick={leave}
      >
        Leave the game
      </button>

      <button
        type="button"
        className="challenger-list-trigger"
        popoverTarget={CHALLENGER_DRAWER_ID}
        popoverTargetAction="show"
      >
        Show challengers
        <MdExpandLess aria-hidden="true" />
      </button>

      <div
        id={CHALLENGER_DRAWER_ID}
        popover="auto"
        className="challenger-list-wrapper"
      >
        <button
          type="button"
          className="challenger-list-opener"
          popoverTarget={CHALLENGER_DRAWER_ID}
          popoverTargetAction="hide"
        >
          Hide challengers
          <MdExpandMore aria-hidden="true" />
        </button>
        <ol className="challenger-list">
          {ranked.map((challenger) => (
            <li
              key={challenger.uuid}
              className={
                challengerUuid === challenger.uuid ? "challenger" : null
              }
            >
              <span>{challenger.name}</span> <span>{challenger.score}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

Play.propTypes = {
  sessionUuid: PropTypes.string.isRequired,
  mode: PropTypes.oneOf(["classic", "everybodyPlays"]),
  timerSeconds: PropTypes.number,
  cooldownSeconds: PropTypes.number,
  almostPoints: PropTypes.number,
  fullPoints: PropTypes.number,
  isHost: PropTypes.bool,
  onSkipTrack: PropTypes.func,
  player: PropTypes.shape({
    uuid: PropTypes.string.isRequired,
    color: colorPropType.isRequired,
  }),
  socket: PropTypes.shape({
    emit: PropTypes.func.isRequired,
    on: PropTypes.func.isRequired,
  }),
  onLeave: PropTypes.func.isRequired,
  challengers: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      color: colorPropType.isRequired,
    })
  ),
};

export { Play };

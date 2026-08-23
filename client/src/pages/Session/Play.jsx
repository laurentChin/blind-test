import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { MdExpandMore, MdExpandLess } from "react-icons/md";

import "./Play.css";

if (window.Notification && window.Notification.permission !== 'granted') {
  window.Notification.requestPermission();
}

const CHALLENGER_DRAWER_ID = "challenger-drawer";

const Play = ({ sessionUuid, socket, player, onLeave, mode = "classic", ...props }) => {
  const [challengers, setChallengers] = useState(props.challengers || []);
  const [isChallengeLocked, setChallengeLock] = useState(false);
  const [challengerUuid, setChallengerUuid] = useState();
  // "everybodyPlays" only: the current/upcoming track, privately cached from
  // the host's trackReady broadcast ahead of time and only ever shown once
  // this player reveals it themselves (see Play mode docs in the plan).
  const [currentTrack, setCurrentTrack] = useState();
  const [isRevealed, setIsRevealed] = useState(false);
  // Locally known "already tried this track and got it wrong" — set
  // optimistically on a wrong self-report, and defensively if the server
  // rejects a buzz-in (e.g. after a refresh mid-track). Reset whenever a new
  // track is cued.
  const [isExcluded, setIsExcluded] = useState(false);
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

  socket.on("trackReady", (track) => {
    setCurrentTrack(track);
    setIsRevealed(false);
    setIsExcluded(false);
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
    setIsRevealed(false);
    setIsExcluded(true);
  };

  const selfScore = (score) => {
    socket.emit("setScore", { sessionUuid, score, track: currentTrack });
    setIsRevealed(false);
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
      {isSelfChallenging ? (
        <div className="reveal-container" data-testid="reveal-container">
          {!isRevealed ? (
            <button
              type="button"
              data-testid="reveal-answer-btn"
              className="btn btn-accent reveal-answer-btn"
              onClick={() => setIsRevealed(true)}
            >
              Reveal the answer
            </button>
          ) : (
            <>
              {currentTrack && (
                <p className="revealed-track">
                  <strong>{currentTrack.name}</strong>
                  {currentTrack.artists && ` — ${currentTrack.artists}`}
                </p>
              )}
              <div className="self-score-buttons">
                <button
                  type="button"
                  data-testid="self-score-wrong-btn"
                  className="btn btn-danger-strong"
                  onClick={markWrong}
                >
                  Wrong
                </button>
                <button
                  type="button"
                  data-testid="self-score-half-btn"
                  className="btn btn-score-half"
                  onClick={() => selfScore(0.5)}
                >
                  Success .5pt
                </button>
                <button
                  type="button"
                  data-testid="self-score-full-btn"
                  className="btn btn-score-full"
                  onClick={() => selfScore(1)}
                >
                  Success 1pt
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          style={{ "--player-color": `rgb(${player.color})` }}
          disabled={isChallengeLocked || isExcluded}
          onClick={buzzIn}
          data-testid="challenge-button"
          className="Session-challenge-button"
        >
          {isChallengeLocked
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
              style={{ "--player-color": `rgba(${lockedChallenger.color})` }}
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
  player: PropTypes.shape({
    uuid: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
  }),
  socket: PropTypes.shape({
    emit: PropTypes.func.isRequired,
    on: PropTypes.func.isRequired,
  }),
  onLeave: PropTypes.func.isRequired,
  challengers: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      color: PropTypes.string.isRequired,
    })
  ),
};

export { Play };

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { MdExpandMore, MdExpandLess } from "react-icons/md";

import "./Play.css";

if (window.Notification && window.Notification.permission !== 'granted') {
  window.Notification.requestPermission();
}

const CHALLENGER_DRAWER_ID = "challenger-drawer";

const Play = ({ sessionUuid, socket, player, onLeave, ...props }) => {
  const [challengers, setChallengers] = useState(props.challengers || []);
  const [isChallengeLocked, setChallengeLock] = useState(false);
  const [challengerUuid, setChallengerUuid] = useState();

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

  const ranked = [...challengers].sort((a, b) => b.score - a.score);

  return (
    <div className="Play">
      <h1 className="visually-hidden">Play</h1>
      <button
        style={{ "--player-color": `rgb(${player.color})` }}
        disabled={isChallengeLocked}
        onClick={() =>
          socket.emit("challenge", { sessionUuid, playerUuid: player.uuid })
        }
        data-testid="challenge-button"
        className="Session-challenge-button"
      >
        {isChallengeLocked
          ? challengers.find((challenger) => challenger.uuid === challengerUuid)
              ?.name
          : `Challenge`}
      </button>
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

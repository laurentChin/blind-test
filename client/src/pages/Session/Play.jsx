import React, { useState } from "react";
import PropTypes from "prop-types";
import { MdExpandMore, MdExpandLess } from "react-icons/md";

import "./Session.css";

const Play = ({ sessionUuid, socket, player }) => {
  const [challengers, setChallengers] = useState([]);
  const [isChallengeLocked, setChallengeLock] = useState(false);
  const [challengerUuid, setChallengerUuid] = useState();

  const [isChallengerListVisible, setChallengerListVisibility] =
    useState(false);

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

  return (
    <div className="Play-Session">
      <button
        style={{ backgroundColor: `rgb(${player.color})` }}
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
      <div
        className={`challenger-list-wrapper ${
          isChallengerListVisible ? "open" : ""
        }`}
      >
        <div
          className="challenger-list-opener"
          onClick={() => setChallengerListVisibility(!isChallengerListVisible)}
        >
          {isChallengerListVisible ? "Hide" : "Show"} challengers
          {isChallengerListVisible ? <MdExpandMore /> : <MdExpandLess />}
        </div>
        <div className="challenger-list">
          {challengers
            .sort((a, b) => b.score - a.score)
            .map((challenger) => (
              <p
                key={challenger.uuid}
                className={
                  challengerUuid === challenger.uuid ? "challenger" : null
                }
              >
                <span>{challenger.name}</span> <span>{challenger.score}</span>
              </p>
            ))}
        </div>
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
};

export { Play };

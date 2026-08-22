import React from "react";
import PropTypes from "prop-types";
import { AiFillCrown } from "react-icons/ai";

import "./ChallengeList.css";

const ChallengerList = ({
  challengers,
  challengerUuid,
  onClearChallenge,
  showActiveChallenger = true,
}) => {
  const currentChallenger = challengers.find(
    (challenger) => challengerUuid === challenger.uuid
  );
  const ranked = [...challengers].sort((a, b) => b.score - a.score);

  return (
    <div className="challenger-list">
      {showActiveChallenger && currentChallenger && (
        <div className="active-challenger-row">
          <p
            className="active-challenger"
            style={{ "--player-color": `rgba(${currentChallenger.color})` }}
          >
            {currentChallenger.name}
          </p>
          {onClearChallenge && (
            <button
              type="button"
              className="btn btn-ghost clear-challenge-btn"
              onClick={onClearChallenge}
            >
              Clear
            </button>
          )}
        </div>
      )}
      <ol className="challenger-ranking">
        {ranked.map((challenger, index) => (
          <li key={challenger.uuid} className={index === 0 ? "first" : ""}>
            {index === 0 && challenger.score > 0 && (
              <AiFillCrown aria-hidden="true" />
            )}
            <span>{challenger.name}</span> <span>{challenger.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

ChallengerList.propTypes = {
  challengers: PropTypes.array.isRequired,
  challengerUuid: PropTypes.string,
  onClearChallenge: PropTypes.func,
  showActiveChallenger: PropTypes.bool,
};

export { ChallengerList };

import React from "react";
import PropTypes from "prop-types";
import { AiFillCrown } from "react-icons/ai";

import "./ChallengeList.css";

const ChallengerList = ({ challengers, challengerUuid }) => {
  const currentChallenger = challengers.find(
    (challenger) => challengerUuid === challenger.uuid
  );
  return (
    <div className="challenger-list">
      {currentChallenger && (
        <p
          className="active-challenger"
          style={{
            borderColor: `rgba(${currentChallenger.color})`,
            backgroundColor: `rgba(${currentChallenger.color})`,
          }}
        >
          {currentChallenger.name}
        </p>
      )}
      {challengers
        .sort((a, b) => b.score - a.score)
        .map((challenger, index) => (
          <p key={challenger.uuid} className={index === 0 ? "first" : ""}>
            {index === 0 && challenger.score > 0 && <AiFillCrown />}
            <span>{challenger.name}</span> <span>{challenger.score}</span>
          </p>
        ))}
    </div>
  );
};

ChallengerList.propTypes = {
  challengers: PropTypes.array.isRequired,
  challengerUuid: PropTypes.string,
};

export { ChallengerList };

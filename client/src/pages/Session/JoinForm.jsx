import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import PropTypes from "prop-types";

import "./JoinForm.css";

const JoinForm = ({ socket, onJoin, sessionUuid }) => {
  const { uuid } = useParams();
  const [name, setName] = useState("");
  const [challengers, setChallengers] = useState([]);
  const [colors, setColors] = useState([]);
  const [playerColor, setPlayerColor] = useState("");
  const [teamUuid, setTeamUuid] = useState("-");
  const teamSelector = useRef();

  socket.on("challengersUpdate", setChallengers);
  socket.on("availableColorsUpdate", setColors);

  useEffect(() => {
    socket.emit("joinWaitingRoom", uuid, (response) => {
      setChallengers(response.challengers);
      setColors(response.colors);
    });
  }, [sessionUuid]);

  const joinSession = () =>
    socket.emit(
      "join",
      {
        sessionUuid: uuid,
        player: {
          name,
          color: playerColor,
          teamUuid: teamUuid !== "-" ? teamUuid : "",
        },
      },
      (response) => {
        const { player } = response;
        sessionStorage.setItem("player", JSON.stringify(player));
        sessionStorage.setItem("sessionUuid", response.sessionUuid);
        onJoin(response);
      }
    );

  return (
    <div className="Join-Session-Form">
      <div className="option-block">
        <h2>Choose a name and a color</h2>
        <input
          data-testid="player-name-input"
          type="text"
          value={name}
          onChange={({ currentTarget }) => setName(currentTarget.value)}
        />
        <div className="colors">
          {colors.length > 0 &&
            colors.map((color) => (
              <button
                onClick={() => setPlayerColor(color)}
                key={color}
                style={{
                  backgroundColor: `rgba(${color}, ${
                    color === playerColor ? "0.2" : "1"
                  })`,
                  ...(color === playerColor
                    ? { border: `3px solid rgb(${color})` }
                    : null),
                }}
                data-testid="color-button"
                className="color-button"
              >
                &nbsp;
              </button>
            ))}
        </div>
      </div>
      {challengers.length > 0 && (
        <>
          <span className="option-block-separator">OR</span>
          <div className="option-block">
            <h2>Join a team</h2>
            <select
              ref={teamSelector}
              onChange={({ target: { value } }) => {
                if (value !== "-") {
                  setTeamUuid(value);
                }
              }}
              defaultValue={"-"}
            >
              <option value="-">-</option>
              {challengers.map((challenger) => (
                <option key={challenger.uuid} value={challenger.uuid}>
                  {challenger.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      <button
        data-testid="join-session-btn"
        disabled={
          (playerColor === "" && name === "" && teamUuid === "-") ||
          (playerColor === "" && name !== "") ||
          (playerColor !== "" && name === "")
        }
        onClick={joinSession}
      >
        Join
      </button>
    </div>
  );
};

JoinForm.propTypes = {
  sessionUuid: PropTypes.string.isRequired,
  onJoin: PropTypes.func.isRequired,
  socket: PropTypes.shape({
    emit: PropTypes.func.isRequired,
    on: PropTypes.func.isRequired,
  }),
};

export { JoinForm };

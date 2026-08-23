import React, { useEffect, useId, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import PropTypes from "prop-types";

import { ColorPicker } from "../../components/ColorPicker/ColorPicker";

import "./JoinForm.css";

const JoinForm = ({ socket, onJoin, sessionUuid }) => {
  const { uuid } = useParams();
  const [name, setName] = useState("");
  const [challengers, setChallengers] = useState([]);
  const [colors, setColors] = useState([]);
  const [playerColor, setPlayerColor] = useState("");
  const [teamUuid, setTeamUuid] = useState("-");
  const teamSelector = useRef();
  const nameInputId = useId();

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
        sessionStorage.setItem("mode", response.mode || "classic");
        onJoin(response);
      }
    );

  return (
    <div className="Join-Session-Form">
      <div className="panel">
        <h2>Choose a name and a color</h2>
        <label htmlFor={nameInputId}>Name</label>
        <input
          id={nameInputId}
          className="field"
          data-testid="player-name-input"
          type="text"
          value={name}
          onChange={({ currentTarget }) => setName(currentTarget.value)}
        />
        {colors.length > 0 && (
          <ColorPicker
            colors={colors}
            value={playerColor}
            onChange={setPlayerColor}
          />
        )}
      </div>
      {challengers.length > 0 && (
        <>
          <span className="panel-separator">OR</span>
          <div className="panel">
            <h2>Join a team</h2>
            <label htmlFor={`${nameInputId}-team`}>Team</label>
            <select
              id={`${nameInputId}-team`}
              className="field"
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
        type="button"
        className="btn btn-positive join-button"
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

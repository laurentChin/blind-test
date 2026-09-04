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
  const [playerColor, setPlayerColor] = useState(null);
  const [teamUuid, setTeamUuid] = useState("-");
  const [joinMode, setJoinMode] = useState("solo");
  const teamSelector = useRef();
  const nameInputId = useId();
  const joinModeName = useId();

  socket.on("challengersUpdate", setChallengers);
  socket.on("availableColorsUpdate", setColors);

  useEffect(() => {
    socket.emit("joinWaitingRoom", uuid, (response) => {
      setChallengers(response.challengers);
      setColors(response.colors);
    });
  }, [sessionUuid]);

  useEffect(() => {
    if (challengers.length === 0 && joinMode === "team") {
      setJoinMode("solo");
      setTeamUuid("-");
    }
  }, [challengers, joinMode]);

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
        sessionStorage.setItem(
          "timerSeconds",
          response.challengeTimerSeconds || 5
        );
        sessionStorage.setItem(
          "cooldownSeconds",
          response.challengeCooldownSeconds ?? 2
        );
        onJoin(response);
      }
    );

  return (
    <div className="Join-Session-Form">
      <fieldset className="join-mode-picker">
        <legend className="visually-hidden">How do you want to play?</legend>
        <label className="join-mode-option">
          <input
            type="radio"
            name={joinModeName}
            value="solo"
            checked={joinMode === "solo"}
            onChange={() => setJoinMode("solo")}
          />
          Play solo
        </label>
        <label className="join-mode-option">
          <input
            type="radio"
            name={joinModeName}
            value="team"
            checked={joinMode === "team"}
            disabled={challengers.length === 0}
            onChange={() => setJoinMode("team")}
          />
          Join a team
        </label>
      </fieldset>
      {joinMode === "solo" ? (
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
      ) : (
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
      )}
      <button
        type="button"
        className="btn btn-positive join-button"
        data-testid="join-session-btn"
        disabled={
          joinMode === "solo"
            ? !playerColor || name === ""
            : teamUuid === "-"
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

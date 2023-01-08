import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { v4 } from "uuid";
import PropTypes from "prop-types";

import io from "socket.io-client";

import { MdExpandMore, MdExpandLess } from "react-icons/md";

import "./Session.css";

const socket = io(process.env.REACT_APP_SOCKET_URI);

const Session = (props) => {
  const persistedSessionUuid = sessionStorage.getItem("sessionUuid");
  const { uuid } = useParams();
  const [name, setName] = useState("");
  const [challengers, setChallengers] = useState(props.challengers || []);
  const [inWaitingRoom, setInWaitingRoom] = useState(false);
  const [isChallengeLocked, setChallengeLock] = useState(false);
  const [challengerUuid, setChallengerUuid] = useState("");
  const [playerUuid, setPlayerUuid] = useState(
    persistedSessionUuid === uuid
      ? sessionStorage.getItem("playerUuid") || "-"
      : "-"
  );
  const [inSession, setInSession] = useState(
    playerUuid !== "-" && persistedSessionUuid === uuid
  );
  const [colors, setColors] = useState(props.colors || []);
  const [playerColor, setPlayerColor] = useState(
    persistedSessionUuid === uuid
      ? sessionStorage.getItem("playerColor") || null
      : null
  );
  const [isChallengerListVisible, setChallengerListVisibility] =
    useState(false);

  const teamSelector = useRef();

  socket.on("challengersUpdate", setChallengers);
  socket.on("availableColorsUpdate", setColors);

  useEffect(() => {
    if (persistedSessionUuid && persistedSessionUuid !== `${uuid}`) {
      setInSession(false);
    }
  }, [uuid, persistedSessionUuid]);

  useEffect(() => {
    if (inSession && challengers.length === 0) {
      socket.emit("join", { sessionUuid: uuid });
    }
  }, [inSession, challengers, uuid]);

  useEffect(() => {
    if (!inSession && !inWaitingRoom) {
      socket.emit("joinWaitingRoom", uuid, (response) => {
        setChallengers(response.challengers);
        setColors(response.colors);
      });
      setInWaitingRoom(true);
    }
  }, [challengers, inSession, inWaitingRoom, uuid]);

  useEffect(() => {
    if (name !== "" && playerColor) {
      setPlayerUuid(v4());
    }

    if (
      name === "" &&
      (!teamSelector.current || teamSelector.current?.value === "-")
    ) {
      setPlayerUuid("-");
    }
  }, [name, playerColor]);

  const joinSession = () => {
    if (playerUuid === "-") return;
    sessionStorage.setItem("playerUuid", playerUuid);
    sessionStorage.setItem("playerColor", playerColor);
    sessionStorage.setItem("sessionUuid", uuid);
    socket.emit("join", {
      sessionUuid: uuid,
      player: { name, uuid: playerUuid, color: playerColor },
    });

    setInSession(true);
  };

  const challenge = () => {
    socket.emit("challenge", { sessionUuid: uuid, playerUuid });
  };

  socket.on("lockChallenge", (msg) => {
    setChallengeLock(true);
    setChallengerUuid(msg);
  });

  socket.on("challengerRelease", (msg) => {
    setChallengeLock(false);
    setChallengerUuid("");
    setChallengers(msg);
  });

  return (
    <div className="Session">
      {!inSession && (
        <div className="Join-Session-Form">
          <div className="option-block">
            <h2>Choose a name and a color</h2>
            <input
              type="text"
              value={name}
              onChange={({ currentTarget }) => setName(currentTarget.value)}
              onKeyUp={({ keyCode }) => {
                if (keyCode === 13) joinSession();
              }}
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
                    setPlayerUuid(value);
                    if (value !== "-") {
                      setPlayerColor(
                        challengers.find(
                          (challenger) => challenger.uuid === value
                        ).color
                      );
                    } else {
                      setPlayerColor(undefined);
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
          {playerUuid !== "-" && (
            <button onClick={() => joinSession()}>Join</button>
          )}
        </div>
      )}
      {inSession && !isChallengeLocked && (
        <button
          style={{ backgroundColor: `rgb(${playerColor})` }}
          onClick={challenge}
          className="Session-challenge-button"
        >
          Challenge
        </button>
      )}
      {inSession && (
        <div
          className={`challenger-list-wrapper ${
            isChallengerListVisible ? "open" : ""
          }`}
        >
          <div
            className="challenger-list-opener"
            onClick={() =>
              setChallengerListVisibility(!isChallengerListVisible)
            }
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
      )}
    </div>
  );
};

Session.propTypes = {
  colors: PropTypes.array,
  challengers: PropTypes.array,
};

export { Session };

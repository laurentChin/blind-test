import React, { useContext, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import QRCodeGenerator from "qrcode";
import io from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { MdOpenInNew } from "react-icons/md";

import { Player } from "../../../components/Player/Player";
import { SpotifyContext } from "../../../contexts/Spotify";

import "./ManageSession.css";
import { ChallengerList } from "../../../components/ChallengerList/ChallengerList";

const SPOTIFY_PLAYER_SRC = "https://sdk.scdn.co/spotify-player.js";
const script = document.createElement("script");
script.setAttribute("src", SPOTIFY_PLAYER_SRC);

const ManageSession = ({ sessionUuid, socket, ...props }) => {
  const spotifyContext = useContext(SpotifyContext);
  const navigate = useNavigate();

  const [isPlayerScriptLoaded, setPlayerScriptLoadedState] = useState(
    props.isPlayerScriptLoaded || false
  );
  const [isPlayerReady, setPlayerReadyState] = useState(
    props.isPlayerReady || false
  );
  const [player, setPlayer] = useState(props.player || {});
  const [challengers, setChallengers] = useState([]);
  const [challengerUuid, setChallengerUuid] = useState("");
  const [deviceId, setDeviceId] = useState(props.deviceId || "");
  const [hasSessionStart, setSessionStartStatus] = useState(false);

  const qrCode = useRef();

  if (!document.querySelector(`[src="${SPOTIFY_PLAYER_SRC}"]`)) {
    document.head.appendChild(script);
  }
  script.onload = () => {
    setPlayerScriptLoadedState(true);
  };

  useEffect(() => {
    if (qrCode.current) {
      QRCodeGenerator.toCanvas(
        qrCode.current,
        `${process.env.REACT_APP_URL}/session/${sessionUuid}`
      );
    }
  }, [qrCode, sessionUuid]);

  useEffect(() => {
    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = spotifyContext.setupPlayer((deviceId) => {
        setPlayerReadyState(true);
        setDeviceId(deviceId);
      });

      setPlayer(spotifyPlayer);

      socket.emit("createSession", { sessionUuid });
    };
  }, [spotifyContext, isPlayerScriptLoaded, sessionUuid]);

  socket.on("challengersUpdate", setChallengers);
  socket.on("challengerRelease", setChallengers);

  if (player.pause) {
    socket.on("lockChallenge", (msg) => {
      player.pause();
      setChallengerUuid(msg);
    });
  }

  const releaseChallenger = (score) => {
    player.getCurrentState().then((playerState) => {
      const { name, artists } = playerState.track_window.current_track;
      const track = {
        name,
        artists: artists
          .map((artist) => artist.name)
          .join(", ")
          .trim(),
      };
      socket.emit("setScore", {
        sessionUuid,
        score,
        track,
      });
      setChallengerUuid("");
      player.resume();
    });
  };

  const startNewChallenge = () => socket.emit("startNewChallenge", sessionUuid);

  const startSession = () =>
    spotifyContext
      .startPlayer(deviceId)
      .then(() => setSessionStartStatus(true));

  const closeSession = () => {
    if (
      window.confirm("Are you sure want to close the session for all users?")
    ) {
      socket.emit("closeSession", { sessionUuid });
      navigate("/");
    }
  };

  return (
    <div className="Step Session-Step">
      <div className="controls-container">
        <div className="session-actions">
          {!hasSessionStart && deviceId && (
            <button
              className="start-session-btn"
              data-testid="start-session-btn"
              onClick={() => startSession()}
            >
              Start the session
            </button>
          )}
          {deviceId && (
            <button
              className="close-session-btn"
              data-testid="close-session-btn"
              onClick={closeSession}
            >
              Close the session for all players
            </button>
          )}
        </div>
        {hasSessionStart && isPlayerReady && (
          <Player nextTrackCallback={startNewChallenge} />
        )}
        {hasSessionStart && challengerUuid && (
          <div className="challenge-buttons-container">
            <button
              data-testid="challenge-button"
              className="challenge-button challenge-button-wrong"
              onClick={() => releaseChallenger(0)}
            >
              Wrong
            </button>
            <button
              data-testid="challenge-button"
              className="challenge-button challenge-button-half"
              onClick={() => releaseChallenger(0.5)}
            >
              Success .5pt
            </button>
            <button
              data-testid="challenge-button"
              className="challenge-button challenge-button-full"
              onClick={() => releaseChallenger(1)}
            >
              Success 1pt
            </button>
          </div>
        )}
      </div>
      <ChallengerList
        challengers={challengers}
        challengerUuid={challengerUuid}
      />
      <div className="QRCode">
        <canvas ref={qrCode} />
        <a
          href={`${window.origin}/board/${sessionUuid}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open the board <MdOpenInNew />
        </a>
      </div>
    </div>
  );
};

ManageSession.propTypes = {
  sessionUuid: PropTypes.string.isRequired,
  isPlayerScriptLoaded: PropTypes.bool,
  isPlayerReady: PropTypes.bool,
  deviceId: PropTypes.string,
  player: PropTypes.object,
  socket: PropTypes.shape({
    emit: PropTypes.func.isRequired,
    on: PropTypes.func.isRequired,
  }).isRequired,
};

export { ManageSession };

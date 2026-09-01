import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { MdOpenInNew } from "react-icons/md";

import { Player } from "../../../components/Player/Player";
import { useMusicProvider } from "../../../contexts/MusicProvider";
import { useAsyncAction } from "../../../hooks/useAsyncAction";
import { useConfirmAction } from "../../../hooks/useConfirmAction";

import "./ManageSession.css";
import { ChallengerList } from "../../../components/ChallengerList/ChallengerList";

const ManageSession = ({ sessionUuid, socket, ...props }) => {
  const musicProvider = useMusicProvider();
  const navigate = useNavigate();

  const [isPlayerReady, setPlayerReadyState] = useState(
    props.isPlayerReady || false
  );
  const [player, setPlayer] = useState(props.player || {});
  const [challengers, setChallengers] = useState([]);
  const [challengerUuid, setChallengerUuid] = useState("");
  const [deviceId, setDeviceId] = useState(props.deviceId || "");
  const [hasSessionStart, setSessionStartStatus] = useState(false);
  const tracks = props.tracks || [];
  const { run, className: loadingClassName } = useAsyncAction();
  const { run: runCloseSession, isArmed: isCloseArmed } = useConfirmAction();

  useEffect(() => {
    if (props.isPlayerReady) return;

    musicProvider.setupPlayer((readyDeviceId) => {
      setPlayerReadyState(true);
      setDeviceId(readyDeviceId);
      setPlayer(musicProvider.getPlayer());
      socket.emit("createSession", {
        sessionUuid,
        timerSeconds: props.timerSeconds,
        cooldownSeconds: props.cooldownSeconds,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  socket.on("challengersUpdate", setChallengers);
  socket.on("challengerRelease", setChallengers);

  if (player.pause) {
    socket.on("lockChallenge", (msg) => {
      player.pause();
      setChallengerUuid(msg);
    });
  }

  socket.on("challengeTimedOut", () => {
    setChallengerUuid("");
    player.resume?.();
  });

  const releaseChallenger = (score) => {
    player.getCurrentState().then((playerState) => {
      const { name, artists } = playerState.track_window.current_track;
      const track = {
        name,
        artists: (artists || [])
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

  // Manual override for when a player buzzes in at a moment the session
  // can't sensibly be scored (e.g. mid-setup, wrong track) — releases the
  // lock without touching anyone's score, unlike releaseChallenger above.
  const clearChallenge = () => {
    socket.emit("clearChallenge", { sessionUuid });
    setChallengerUuid("");
    player.resume?.();
  };

  const startSession = () =>
    run(() =>
      musicProvider.startPlayer(deviceId).then(() => {
        // Spotify's API has no way to load a context without immediately
        // playing it, so pausing right after is the only way to open the
        // session on track 1 without autoplaying (a no-op for Apple Music,
        // whose startPlayer never starts playback in the first place).
        player.pause?.();
        setSessionStartStatus(true);
      })
    );

  const closeSession = () =>
    runCloseSession(() => {
      player.pause?.();
      socket.emit("closeSession", { sessionUuid });
      navigate("/");
    });

  return (
    <section className="Step Session-Step">
      <h2 className="visually-hidden">Manage the session</h2>
      <div className="controls-container">
        <div className="session-actions">
          {!hasSessionStart && deviceId && (
            <button
              type="button"
              className={`btn btn-positive start-session-btn ${loadingClassName}`.trim()}
              data-testid="start-session-btn"
              onClick={() => startSession()}
            >
              Start the session
            </button>
          )}
          {deviceId && (
            <button
              type="button"
              className={`btn btn-danger close-session-btn ${
                isCloseArmed ? "btn-confirm is-armed" : ""
              }`.trim()}
              data-testid="close-session-btn"
              onClick={closeSession}
            >
              {isCloseArmed
                ? "Click again to confirm"
                : "Close the session for all players"}
            </button>
          )}
          <a
            className="btn btn-accent"
            href={`${window.origin}/board/${sessionUuid}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open the board <MdOpenInNew aria-hidden="true" />
          </a>
        </div>
        {hasSessionStart && isPlayerReady && (
          <Player nextTrackCallback={startNewChallenge} tracks={tracks} />
        )}
        {hasSessionStart && challengerUuid && (
          <div className="challenge-buttons-container">
            <button
              type="button"
              data-testid="challenge-button"
              className="btn btn-danger-strong"
              onClick={() => releaseChallenger(0)}
            >
              Wrong
            </button>
            <button
              type="button"
              data-testid="challenge-button"
              className="btn btn-score-half"
              onClick={() => releaseChallenger(0.5)}
            >
              Success .5pt
            </button>
            <button
              type="button"
              data-testid="challenge-button"
              className="btn btn-score-full"
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
        onClearChallenge={clearChallenge}
      />
    </section>
  );
};

ManageSession.propTypes = {
  sessionUuid: PropTypes.string.isRequired,
  isPlayerReady: PropTypes.bool,
  deviceId: PropTypes.string,
  player: PropTypes.object,
  tracks: PropTypes.array,
  timerSeconds: PropTypes.number,
  cooldownSeconds: PropTypes.number,
  socket: PropTypes.shape({
    emit: PropTypes.func.isRequired,
    on: PropTypes.func.isRequired,
  }).isRequired,
};

export { ManageSession };

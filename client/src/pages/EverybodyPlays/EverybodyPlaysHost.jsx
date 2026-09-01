import React, { useEffect, useState } from "react";
import { v4 } from "uuid";
import io from "socket.io-client";
import { Navigate, useNavigate } from "react-router-dom";
import { FaPlay, FaPause } from "react-icons/fa";
import { MdSkipNext, MdSettings, MdExpandMore, MdExpandLess } from "react-icons/md";

import { getSelectedProvider, useMusicProvider } from "../../contexts/MusicProvider";
import { useProviderAuth } from "../../hooks/useProviderAuth";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { useConfirmAction } from "../../hooks/useConfirmAction";
import { ConfigureEverybodyPlaysSession } from "./ConfigureEverybodyPlaysSession";
import { JoinCode } from "../../components/JoinCode/JoinCode";
import { Play } from "../Session/Play";

import "./EverybodyPlaysHost.css";

const SESSION_UUID = v4();
const HOST_CONTROLS_ID = "host-controls-panel";

let socket = io(process.env.REACT_APP_SOCKET_URI);

const EverybodyPlaysHost = () => {
  const navigate = useNavigate();
  const provider = getSelectedProvider();
  const musicProvider = useMusicProvider();
  const isAuthenticated = useProviderAuth(provider, musicProvider);

  const [identity, setIdentity] = useState(null);
  const [selfPlayer, setSelfPlayer] = useState(null);
  const [challengers, setChallengers] = useState([]);
  const [challengeTimerSeconds, setChallengeTimerSeconds] = useState();
  const [challengeCooldownSeconds, setChallengeCooldownSeconds] = useState();
  const [deviceId, setDeviceId] = useState("");
  const [hasSessionStart, setHasSessionStart] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const { run, className: startLoadingClassName } = useAsyncAction();
  const { run: runCloseSession, isArmed: isCloseArmed } = useConfirmAction();

  useEffect(() => {
    if (!identity) return;

    musicProvider.setupPlayer((readyDeviceId) => setDeviceId(readyDeviceId));

    socket.emit(
      "join",
      {
        sessionUuid: SESSION_UUID,
        player: { name: identity.name, color: identity.color, teamUuid: "" },
      },
      (response) => {
        setSelfPlayer(response.player);
        setChallengers(response.challengers);
        setChallengeTimerSeconds(response.challengeTimerSeconds);
        setChallengeCooldownSeconds(response.challengeCooldownSeconds);
      }
    );

    // No visible "current/next track" display in this mode (unlike the
    // classic Player component) — this callback only exists to broadcast the
    // newly-current track privately to every player's screen, via the
    // dedicated trackReady relay, once the SDK actually reports it changed.
    let lastTrackName = "";
    musicProvider.setPlayerStateChangeCb((state) => {
      setIsPaused(state.paused);

      const track = state.track_window?.current_track;
      if (track && track.name && track.name !== lastTrackName) {
        lastTrackName = track.name;
        socket.emit("trackReady", {
          sessionUuid: SESSION_UUID,
          track: {
            name: track.name,
            artists: (track.artists || [])
              .map((artist) => artist.name)
              .join(", ")
              .trim(),
          },
        });
      }
    });

    // The only client that can drive playback for the whole room: whoever
    // scores (or the host's own "Skip") triggers this broadcast, and this is
    // the one tab holding the actual Spotify/Apple Music player instance.
    socket.on("startNewChallenge", () => musicProvider.getPlayer().nextTrack?.());
    // Same player instance is the one that must stop the music as soon as
    // anyone buzzes in (mirrors ManageSession.jsx's classic-mode handler).
    socket.on("lockChallenge", () => musicProvider.getPlayer().pause?.());
    socket.on("challengeTimedOut", () => musicProvider.getPlayer().resume?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  if (!provider) {
    return <Navigate to="/" replace />;
  }

  const startSession = () =>
    run(() =>
      musicProvider.startPlayer(deviceId).then(() => {
        // Cue track 1 paused rather than autoplaying, same trick as the
        // classic flow (see ManageSession.jsx).
        musicProvider.getPlayer().pause?.();
        setHasSessionStart(true);
      })
    );

  const closeSession = () =>
    runCloseSession(() => {
      socket.emit("closeSession", { sessionUuid: SESSION_UUID });
      navigate("/");
    });

  if (!identity) {
    return (
      <div className="EverybodyPlaysHost">
        <h1>Everybody plays</h1>
        {isAuthenticated ? (
          <ConfigureEverybodyPlaysSession
            sessionUuid={SESSION_UUID}
            socket={socket}
            onLaunch={setIdentity}
          />
        ) : (
          <p>Connecting…</p>
        )}
      </div>
    );
  }

  const joinUrl = `${window.origin}/session/${SESSION_UUID}`;

  return (
    <section className="EverybodyPlaysHost">
      <h1 className="visually-hidden">Everybody plays</h1>

      <button
        type="button"
        className="settings-trigger"
        popoverTarget={HOST_CONTROLS_ID}
        popoverTargetAction="show"
      >
        <MdSettings aria-hidden="true" />
        Settings
        <MdExpandMore aria-hidden="true" />
      </button>

      <div id={HOST_CONTROLS_ID} popover="auto" className="host-controls">
        <button
          type="button"
          className="host-controls-opener"
          popoverTarget={HOST_CONTROLS_ID}
          popoverTargetAction="hide"
        >
          Hide settings
          <MdExpandLess aria-hidden="true" />
        </button>
        {!hasSessionStart && deviceId && (
          <button
            type="button"
            className={`btn btn-positive ${startLoadingClassName}`.trim()}
            data-testid="start-session-btn"
            onClick={startSession}
          >
            Start the session
          </button>
        )}
        {hasSessionStart && (
          <>
            <button
              type="button"
              className="btn btn-ghost"
              data-testid="toggle-play-pause-btn"
              aria-label={isPaused ? "Play" : "Pause"}
              onClick={() => musicProvider.getPlayer().togglePlay()}
            >
              {isPaused ? <FaPlay /> : <FaPause />}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              data-testid="skip-track-btn"
              onClick={() => socket.emit("startNewChallenge", SESSION_UUID)}
            >
              <MdSkipNext aria-hidden="true" /> Skip
            </button>
          </>
        )}
        <div className="host-controls-row">
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
          <JoinCode joinUrl={joinUrl} variant="button" />
        </div>
      </div>

      {selfPlayer && (
        <Play
          mode="everybodyPlays"
          sessionUuid={SESSION_UUID}
          player={selfPlayer}
          socket={socket}
          challengers={challengers}
          timerSeconds={challengeTimerSeconds}
          cooldownSeconds={challengeCooldownSeconds}
          onLeave={closeSession}
        />
      )}
    </section>
  );
};

export { EverybodyPlaysHost };

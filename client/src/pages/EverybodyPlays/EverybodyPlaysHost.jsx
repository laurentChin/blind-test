import React, { useEffect, useRef, useState } from "react";
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
  const [trackUris, setTrackUris] = useState([]);
  const [selfPlayer, setSelfPlayer] = useState(null);
  const [challengers, setChallengers] = useState([]);
  const [challengeTimerSeconds, setChallengeTimerSeconds] = useState();
  const [challengeCooldownSeconds, setChallengeCooldownSeconds] = useState();
  const [almostPoints, setAlmostPoints] = useState();
  const [fullPoints, setFullPoints] = useState();
  const [totalTracks, setTotalTracks] = useState();
  const [playedCount, setPlayedCount] = useState();
  const [deviceId, setDeviceId] = useState("");
  const [hasSessionStart, setHasSessionStart] = useState(false);
  // setPlayerStateChangeCb below is registered as soon as identity is set —
  // i.e. as soon as the config screen launches, well before "Start the
  // session" is clicked — so a stray player_state_changed the SDK fires
  // during that idle wait (Spotify's SDK is known to fire one right after
  // connect(), sometimes with a null state) must not be mistaken for track 1
  // actually starting. A ref (not state) because startSession needs to flip
  // it synchronously, read by a callback closure that's only ever created
  // once (the effect below only depends on [identity]).
  const hasSessionStartRef = useRef(false);
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
        setAlmostPoints(response.almostPoints);
        setFullPoints(response.fullPoints);
        setTotalTracks(response.totalTracks);
        setPlayedCount(response.playedCount);
      }
    );

    // No visible "current/next track" display in this mode (unlike the
    // classic Player component) — this callback only exists to broadcast the
    // newly-current track privately to every player's screen, via the
    // dedicated trackReady relay, once the SDK actually reports it changed.
    let lastTrackName = "";
    musicProvider.setPlayerStateChangeCb((state) => {
      // Both providers can report no state at all right after connecting
      // (see Player.jsx's own guard for the same Spotify SDK quirk) —
      // ignored rather than applied.
      if (!state) return;

      setIsPaused(state.paused);
      socket.emit("playbackStateChanged", {
        sessionUuid: SESSION_UUID,
        isPlaying: !state.paused,
      });

      // Nothing has actually started yet — don't let a stray pre-session
      // event prime lastTrackName, or track 1's genuine load would look
      // like a no-op (same name already seen) and never get announced.
      if (!hasSessionStartRef.current) return;

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
            image: track.album?.images?.[0]?.url,
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
    // Playback stays paused through the timeout and the answer-reveal
    // screen, resuming only once the challenger submits (Fake news / Title
    // or Artist / Jackpot) — server emits challengerRelease for all three,
    // whether or not that submission also advances the track.
    socket.on("lockChallenge", () => musicProvider.getPlayer().pause?.());
    socket.on("challengerRelease", () => musicProvider.getPlayer().resume?.());
    // Keeps the "Skip" button's last-track check (below) accurate as the
    // session progresses — the join response above only gives its value at
    // join time, before any track has actually played.
    socket.on("trackReady", ({ playedCount: newPlayedCount }) => {
      if (newPlayedCount !== undefined) setPlayedCount(newPlayedCount);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  if (!provider) {
    return <Navigate to="/" replace />;
  }

  const startSession = () => {
    // See ManageSession.jsx: unlocks mobile autoplay policies before the
    // remote play command below, otherwise playback stays paused on Android.
    musicProvider.getPlayer().activateElement?.();
    // Flipped before the actual play command below (not in its .then()) so
    // whichever player_state_changed event genuinely reports track 1 —
    // whether it arrives before or after startPlayer's fetch resolves — is
    // captured instead of ignored as a pre-session stray.
    hasSessionStartRef.current = true;

    return run(() =>
      musicProvider.startPlayer(deviceId, trackUris).then(() => {
        // Starts playback immediately rather than cueing track 1 paused —
        // unlike Spotify (whose play endpoint autoplays on its own),
        // Apple Music's setQueue() never starts playback by itself, so this
        // resume() is what makes both providers actually start playing here.
        musicProvider.getPlayer().resume?.();
        setHasSessionStart(true);
      })
    );
  };

  const closeSession = () =>
    runCloseSession(() => {
      musicProvider.getPlayer().pause?.();
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
            onLaunch={({ name, color, trackUris }) => {
              setIdentity({ name, color });
              setTrackUris(trackUris);
            }}
          />
        ) : (
          <p>Connecting…</p>
        )}
      </div>
    );
  }

  const joinUrl = `${window.origin}/session/${SESSION_UUID}`;
  // Nothing left to skip to once the last track is up — Play.jsx's own
  // final-score dialog takes over from there instead.
  const isLastTrack = totalTracks > 0 && playedCount >= totalTracks;

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
          <button
            type="button"
            className="btn btn-ghost"
            data-testid="toggle-play-pause-btn"
            aria-label={isPaused ? "Play" : "Pause"}
            onClick={() => musicProvider.getPlayer().togglePlay()}
          >
            {isPaused ? <FaPlay /> : <FaPause />}
          </button>
        )}
        {hasSessionStart && !isLastTrack && (
          <button
            type="button"
            className="btn btn-ghost"
            data-testid="skip-track-btn"
            onClick={() => socket.emit("startNewChallenge", SESSION_UUID)}
          >
            <MdSkipNext aria-hidden="true" /> Skip
          </button>
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
          almostPoints={almostPoints}
          fullPoints={fullPoints}
          totalTracks={totalTracks}
          playedCount={playedCount}
          isHost
          onSkipTrack={() => socket.emit("startNewChallenge", SESSION_UUID)}
          onLeave={closeSession}
        />
      )}
    </section>
  );
};

export { EverybodyPlaysHost };

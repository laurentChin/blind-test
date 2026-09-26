import React, { useEffect, useId, useState } from "react";
import PropTypes from "prop-types";

import { ColorPicker } from "../../components/ColorPicker/ColorPicker";
import { useMusicProvider } from "../../contexts/MusicProvider";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { MIN_TRACKS } from "../Master/ConfigureSession";
import {
  ChallengeTimerConfig,
  DEFAULT_TIMER_SECONDS,
  DEFAULT_COOLDOWN_SECONDS,
} from "../../components/ChallengeTimerConfig/ChallengeTimerConfig";
import {
  AnswerScoreConfig,
  DEFAULT_ALMOST_POINTS,
  DEFAULT_FULL_POINTS,
} from "../../components/AnswerScoreConfig/AnswerScoreConfig";
import { THEMES, toCustomTheme } from "./themes";
import { generateThemePlaylist } from "./playlistGenerator";

import "./ConfigureEverybodyPlaysSession.css";

const MAX_TRACKS = 60;
const TRACK_COUNT_PRESETS = [10, 20, 40];

const ConfigureEverybodyPlaysSession = ({ sessionUuid, socket, onLaunch }) => {
  const musicProvider = useMusicProvider();
  const nameInputId = useId();
  const customThemeInputId = useId();
  const customTrackCountInputId = useId();

  const [creatorName, setCreatorName] = useState("");
  const [creatorColor, setCreatorColor] = useState(null);
  const [colors, setColors] = useState([]);

  const [themeId, setThemeId] = useState("");
  const [customTheme, setCustomTheme] = useState("");
  const [trackCount, setTrackCount] = useState(TRACK_COUNT_PRESETS[0]);
  const [isCustomCount, setIsCustomCount] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_TIMER_SECONDS);
  const [cooldownSeconds, setCooldownSeconds] = useState(DEFAULT_COOLDOWN_SECONDS);
  const [almostPoints, setAlmostPoints] = useState(DEFAULT_ALMOST_POINTS);
  const [fullPoints, setFullPoints] = useState(DEFAULT_FULL_POINTS);

  const [error, setError] = useState("");
  const { run, className: loadingClassName } = useAsyncAction();

  useEffect(() => {
    socket.emit("joinWaitingRoom", sessionUuid, (response) => {
      setColors(response.colors);
    });
  }, [socket, sessionUuid]);

  const selectTheme = (id) => {
    setThemeId(id);
    setCustomTheme("");
  };

  const changeCustomTheme = (value) => {
    setCustomTheme(value);
    setThemeId("");
  };

  const effectiveTheme = themeId
    ? THEMES.find((theme) => theme.id === themeId)
    : customTheme.trim() && toCustomTheme(customTheme.trim());

  const isIdentityValid = creatorName.trim() !== "" && !!creatorColor;
  const isThemeValid = !!effectiveTheme;
  const isTrackCountValid = trackCount >= MIN_TRACKS && trackCount <= MAX_TRACKS;
  const isReadyToLaunch = isIdentityValid && isThemeValid && isTrackCountValid;

  const generateAndLaunch = () =>
    run(async () => {
      setError("");

      socket.emit("createSession", {
        sessionUuid,
        mode: "everybodyPlays",
        timerSeconds,
        cooldownSeconds,
        almostPoints,
        fullPoints,
        totalTracks: trackCount,
      });

      const selected = await generateThemePlaylist(
        musicProvider,
        effectiveTheme,
        trackCount
      );

      if (selected.length < trackCount) {
        setError(
          "Not enough tracks found for this theme — try a broader theme or a lower track count."
        );
        return;
      }

      onLaunch({
        name: creatorName,
        color: creatorColor,
        trackUris: selected.map((track) => track.uri),
      });
    });

  return (
    <div className="ConfigureEverybodyPlaysSession">
      <section className="config-step">
        <h2>1. Choose a name and a color</h2>
        <label htmlFor={nameInputId}>Your name</label>
        <input
          id={nameInputId}
          className="field"
          data-testid="creator-name-input"
          type="text"
          value={creatorName}
          onChange={({ currentTarget }) => setCreatorName(currentTarget.value)}
        />
        {colors.length > 0 && (
          <ColorPicker
            colors={colors}
            value={creatorColor}
            onChange={setCreatorColor}
          />
        )}
      </section>

      <section className="config-step" inert={!isIdentityValid}>
        <h2>2. Choose a theme</h2>
        <p className="config-step-hint">
          The songs are picked for you — you won't see the list.
        </p>
        <div className="panel">
          <div className="theme-grid">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                data-testid={`select-theme-${theme.id}-btn`}
                className="btn theme-tile"
                aria-pressed={themeId === theme.id}
                onClick={() => selectTheme(theme.id)}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </div>
        <span className="panel-separator">OR</span>
        <div className="panel">
          <label htmlFor={customThemeInputId}>Your own theme</label>
          <input
            id={customThemeInputId}
            className="field"
            data-testid="custom-theme-input"
            type="text"
            placeholder="e.g. Céline Dion, 90s rock…"
            value={customTheme}
            onChange={({ currentTarget }) => changeCustomTheme(currentTarget.value)}
          />
        </div>
      </section>

      <section className="config-step" inert={!isIdentityValid || !isThemeValid}>
        <h2>3. How many tracks?</h2>
        <div className="track-count-grid">
          {TRACK_COUNT_PRESETS.map((count) => (
            <button
              key={count}
              type="button"
              data-testid={`select-count-${count}-btn`}
              className="btn track-count-tile"
              aria-pressed={!isCustomCount && trackCount === count}
              onClick={() => {
                setIsCustomCount(false);
                setTrackCount(count);
              }}
            >
              {count}
            </button>
          ))}
          <button
            type="button"
            data-testid="select-count-custom-btn"
            className="btn track-count-tile"
            aria-pressed={isCustomCount}
            onClick={() => setIsCustomCount(true)}
          >
            Custom
          </button>
        </div>
        {isCustomCount && (
          <div className="custom-track-count">
            <label htmlFor={customTrackCountInputId}>
              Number of tracks ({MIN_TRACKS}-{MAX_TRACKS})
            </label>
            <input
              id={customTrackCountInputId}
              className="field"
              type="number"
              min={MIN_TRACKS}
              max={MAX_TRACKS}
              value={trackCount}
              onChange={({ currentTarget }) =>
                setTrackCount(parseInt(currentTarget.value, 10) || 0)
              }
            />
          </div>
        )}
      </section>

      <section className="config-step" inert={!isIdentityValid || !isThemeValid}>
        <h2>4. Timer settings</h2>
        <ChallengeTimerConfig
          timerSeconds={timerSeconds}
          cooldownSeconds={cooldownSeconds}
          onChange={({ timerSeconds, cooldownSeconds }) => {
            setTimerSeconds(timerSeconds);
            setCooldownSeconds(cooldownSeconds);
          }}
        />
      </section>

      <section className="config-step" inert={!isIdentityValid || !isThemeValid}>
        <h2>5. Scoring</h2>
        <AnswerScoreConfig
          almostPoints={almostPoints}
          fullPoints={fullPoints}
          onChange={({ almostPoints, fullPoints }) => {
            setAlmostPoints(almostPoints);
            setFullPoints(fullPoints);
          }}
        />
      </section>

      {error && <p className="generation-error">{error}</p>}

      {isReadyToLaunch && (
        <button
          type="button"
          data-testid="generate-and-launch-btn"
          className={`btn btn-positive launch-button ${loadingClassName}`.trim()}
          onClick={generateAndLaunch}
        >
          Generate & launch
        </button>
      )}
    </div>
  );
};

ConfigureEverybodyPlaysSession.propTypes = {
  sessionUuid: PropTypes.string.isRequired,
  socket: PropTypes.shape({
    emit: PropTypes.func.isRequired,
  }).isRequired,
  onLaunch: PropTypes.func.isRequired,
};

export { ConfigureEverybodyPlaysSession };

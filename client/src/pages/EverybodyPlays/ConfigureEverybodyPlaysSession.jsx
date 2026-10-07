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
import {
  THEMES,
  THEME_GROUPS,
  PERIODS,
  GENRES,
  YEARS,
  buildCustomTheme,
} from "./themes";
import { generateThemesPlaylist } from "./playlistGenerator";

import "./ConfigureEverybodyPlaysSession.css";

const MAX_TRACKS = 60;
const TRACK_COUNT_PRESETS = [10, 20, 40];

const ConfigureEverybodyPlaysSession = ({ sessionUuid, socket, onLaunch }) => {
  const musicProvider = useMusicProvider();
  const nameInputId = useId();
  const customThemeInputId = useId();
  const customPeriodSelectId = useId();
  const customYearSelectId = useId();
  const customGenreSelectId = useId();
  const customTrackCountInputId = useId();

  const [creatorName, setCreatorName] = useState("");
  const [creatorColor, setCreatorColor] = useState(null);
  const [colors, setColors] = useState([]);

  const [themeIds, setThemeIds] = useState([]);
  const [customTheme, setCustomTheme] = useState("");
  const [customPeriodId, setCustomPeriodId] = useState("");
  const [customYear, setCustomYear] = useState("");
  const [customGenreId, setCustomGenreId] = useState("");
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

  // Presets can be combined, but a preset and the "your own theme" form are
  // two ways to fill the same slot: touching one clears the other.
  const toggleTheme = (id) => {
    setThemeIds((ids) =>
      ids.includes(id) ? ids.filter((themeId) => themeId !== id) : [...ids, id]
    );
    setCustomTheme("");
    setCustomPeriodId("");
    setCustomYear("");
    setCustomGenreId("");
  };

  const changeCustom = (setValue) => (value) => {
    setValue(value);
    setThemeIds([]);
  };

  const changeCustomTheme = changeCustom(setCustomTheme);
  const changeCustomGenre = changeCustom(setCustomGenreId);
  // A single year and a period are the same criterion at two granularities:
  // picking one resets the other.
  const changeCustomPeriod = changeCustom((value) => {
    setCustomPeriodId(value);
    setCustomYear("");
  });
  const changeCustomYear = changeCustom((value) => {
    setCustomYear(value);
    setCustomPeriodId("");
  });

  const effectiveThemes =
    themeIds.length > 0
      ? THEMES.filter((theme) => themeIds.includes(theme.id))
      : [
          buildCustomTheme({
            text: customTheme,
            year: customYear ? Number(customYear) : undefined,
            periodId: customPeriodId,
            genreId: customGenreId,
          }),
        ].filter(Boolean);

  const isIdentityValid = creatorName.trim() !== "" && !!creatorColor;
  const isThemeValid = effectiveThemes.length > 0;
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

      let selected;
      try {
        selected = await generateThemesPlaylist(
          musicProvider,
          effectiveThemes,
          trackCount
        );
      } catch (generationError) {
        // Spotify's Development Mode quota (see contexts/Spotify.js) — the
        // only failure worth a dedicated message: retrying right away can't
        // work, unlike a theme that's simply too narrow.
        if (generationError.reason !== "QUOTA_EXCEEDED") {
          throw generationError;
        }

        setError(
          "The music provider's request quota is exhausted — wait a moment before trying again."
        );
        return;
      }

      if (selected.length < trackCount) {
        setError(
          "Not enough tracks found for these themes — try broader themes or a lower track count."
        );
        return;
      }

      onLaunch({
        name: creatorName,
        color: creatorColor,
        tracks: selected,
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
        <h2>2. Choose one or more themes</h2>
        <p className="config-step-hint">
          The songs are picked for you — you won't see the list.
        </p>
        <div className="panel theme-groups">
          {THEME_GROUPS.map((group) => (
            <section key={group.id} className="theme-group">
              <h3>{group.label}</h3>
              <div className="theme-grid">
                {group.themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    data-testid={`select-theme-${theme.id}-btn`}
                    className="btn theme-tile"
                    aria-pressed={themeIds.includes(theme.id)}
                    onClick={() => toggleTheme(theme.id)}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <span className="panel-separator">OR</span>
        <fieldset className="panel custom-theme">
          <legend>Your own theme</legend>
          <p className="config-step-hint">Combine any of these.</p>
          <div className="custom-theme-fields">
            <div className="custom-theme-field">
              <label htmlFor={customPeriodSelectId}>Decade</label>
              <select
                id={customPeriodSelectId}
                className="field"
                data-testid="custom-period-select"
                value={customPeriodId}
                onChange={({ currentTarget }) => changeCustomPeriod(currentTarget.value)}
              >
                <option value="">Any</option>
                {PERIODS.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="custom-theme-field">
              <label htmlFor={customYearSelectId}>Year</label>
              <select
                id={customYearSelectId}
                className="field"
                data-testid="custom-year-select"
                value={customYear}
                onChange={({ currentTarget }) => changeCustomYear(currentTarget.value)}
              >
                <option value="">Any</option>
                {YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="custom-theme-field">
              <label htmlFor={customGenreSelectId}>Genre</label>
              <select
                id={customGenreSelectId}
                className="field"
                data-testid="custom-genre-select"
                value={customGenreId}
                onChange={({ currentTarget }) => changeCustomGenre(currentTarget.value)}
              >
                <option value="">Any</option>
                {GENRES.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="custom-theme-field custom-theme-text">
              <label htmlFor={customThemeInputId}>Free text</label>
              <input
                id={customThemeInputId}
                className="field"
                data-testid="custom-theme-input"
                type="text"
                placeholder="e.g. an artist: Céline Dion, Queen…"
                value={customTheme}
                onChange={({ currentTarget }) => changeCustomTheme(currentTarget.value)}
              />
            </div>
          </div>
        </fieldset>
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

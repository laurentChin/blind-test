import React, { useEffect, useId, useState } from "react";
import PropTypes from "prop-types";

import { ColorPicker } from "../../components/ColorPicker/ColorPicker";
import { useMusicProvider } from "../../contexts/MusicProvider";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { MIN_TRACKS } from "../Master/ConfigureSession";
import { THEMES } from "./themes";

import "./ConfigureEverybodyPlaysSession.css";

const MAX_TRACKS = 60;
const TRACK_COUNT_PRESETS = [10, 20, 40];
const SEARCH_PAGE_SIZE = 50;
const MAX_SEARCH_PAGES = 4;

// Fisher-Yates: picking N random unique tracks out of the search results
// needs an unbiased shuffle, not just Math.random()-based sort.
function shuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// A single search page isn't always enough to hit a high track count: Apple
// Music's catalog search caps at 25 results per page (Spotify caps at 50),
// so this pages through search() — deduping by id as it goes — until either
// enough unique candidates are collected or the provider runs out of results.
async function collectCandidates(musicProvider, query, count) {
  const candidatesById = new Map();
  let offset = 0;

  // Tracked by how many items actually came back rather than a fixed
  // page*SEARCH_PAGE_SIZE stride: providers clamp the requested limit to
  // their own ceiling (Apple Music caps at 25 regardless of what's asked
  // for), so the real page size can be smaller than SEARCH_PAGE_SIZE — a
  // fixed stride would silently skip results in that case.
  for (let page = 0; page < MAX_SEARCH_PAGES && candidatesById.size < count; page++) {
    const { items = [] } = await musicProvider.search(query, {
      limit: SEARCH_PAGE_SIZE,
      offset,
    });

    if (items.length === 0) {
      break;
    }

    items.forEach((track) => candidatesById.set(track.id, track));
    offset += items.length;
  }

  return Array.from(candidatesById.values());
}

const ConfigureEverybodyPlaysSession = ({ sessionUuid, socket, onLaunch }) => {
  const musicProvider = useMusicProvider();
  const nameInputId = useId();
  const playlistNameInputId = useId();
  const customThemeInputId = useId();
  const customTrackCountInputId = useId();

  const [creatorName, setCreatorName] = useState("");
  const [creatorColor, setCreatorColor] = useState(null);
  const [colors, setColors] = useState([]);

  const [playlistName, setPlaylistName] = useState("");
  const [themeId, setThemeId] = useState("");
  const [customTheme, setCustomTheme] = useState("");
  const [trackCount, setTrackCount] = useState(TRACK_COUNT_PRESETS[0]);
  const [isCustomCount, setIsCustomCount] = useState(false);

  const [addedCount, setAddedCount] = useState(0);
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

  const effectiveQuery = themeId
    ? THEMES.find((theme) => theme.id === themeId)?.query
    : customTheme.trim();

  const isIdentityValid = creatorName.trim() !== "" && !!creatorColor;
  const isPlaylistNameValid = playlistName.trim() !== "";
  const isThemeValid = !!effectiveQuery;
  const isTrackCountValid = trackCount >= MIN_TRACKS && trackCount <= MAX_TRACKS;
  const isReadyToLaunch =
    isIdentityValid && isPlaylistNameValid && isThemeValid && isTrackCountValid;

  const generateAndLaunch = () =>
    run(async () => {
      setError("");
      setAddedCount(0);

      const { id: playlistId } = await musicProvider.createPlaylist(
        playlistName
      );
      musicProvider.setCurrentPlaylist(playlistId);

      const uniqueCandidates = await collectCandidates(
        musicProvider,
        effectiveQuery,
        trackCount
      );

      if (uniqueCandidates.length < trackCount) {
        setError(
          "Not enough tracks found for this theme — try a broader theme or a lower track count."
        );
        return;
      }

      const selected = shuffle(uniqueCandidates).slice(0, trackCount);

      for (let index = 0; index < selected.length; index++) {
        await musicProvider.addTrack(selected[index].uri);
        setAddedCount(index + 1);
      }

      onLaunch({ name: creatorName, color: creatorColor });
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
        <h2>2. Name the playlist</h2>
        <label htmlFor={playlistNameInputId}>Playlist name</label>
        <input
          id={playlistNameInputId}
          className="field"
          data-testid="playlist-name-input"
          type="text"
          value={playlistName}
          onChange={({ currentTarget }) => setPlaylistName(currentTarget.value)}
        />
      </section>

      <section
        className="config-step"
        inert={!isIdentityValid || !isPlaylistNameValid}
      >
        <h2>3. Choose a theme</h2>
        <p className="config-step-hint">
          The playlist is built for you — you won't see what's in it.
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

      <section
        className="config-step"
        inert={!isIdentityValid || !isPlaylistNameValid || !isThemeValid}
      >
        <h2>4. How many tracks?</h2>
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

      {error && <p className="generation-error">{error}</p>}

      {isReadyToLaunch && (
        <button
          type="button"
          data-testid="generate-and-launch-btn"
          className={`btn btn-positive launch-button ${loadingClassName}`.trim()}
          onClick={generateAndLaunch}
        >
          {addedCount > 0
            ? `Adding tracks… ${addedCount}/${trackCount}`
            : "Generate & launch"}
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

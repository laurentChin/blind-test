import React from "react";
import PropTypes from "prop-types";

import "./TrackListDebug.css";

const TRACK_LIST_DEBUG_ID = "track-list-debug-panel";

// Development-only peek at the generated everybody-plays playlist (the
// players, host included, are never meant to see it): lets the theme
// filters in playlistGenerator.js be checked against what was actually
// picked. Loaded lazily behind a NODE_ENV check by its caller, so it never
// ships in the production bundle.
const TrackListDebug = ({ tracks }) => (
  <>
    <button
      type="button"
      className="track-list-debug-trigger"
      data-testid="track-list-debug-btn"
      popoverTarget={TRACK_LIST_DEBUG_ID}
    >
      Debug · {tracks.length} tracks
    </button>

    <div
      id={TRACK_LIST_DEBUG_ID}
      popover="auto"
      className="track-list-debug"
      data-testid="track-list-debug-panel"
    >
      <table>
        <caption>Selected tracks, in play order</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Title</th>
            <th scope="col">Artist</th>
            <th scope="col">Album</th>
            <th scope="col">Year</th>
            <th scope="col">Source</th>
            <th scope="col">Weight</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map(({ track, weight, editorial }, index) => (
            <tr key={track.uri}>
              <td>{index + 1}</td>
              <td>{track.name}</td>
              <td>{(track.artists || []).map(({ name }) => name).join(", ")}</td>
              <td>{track.album?.name}</td>
              <td>{track.album?.release_date?.slice(0, 4)}</td>
              <td>{editorial ? "editorial" : "search"}</td>
              <td>{weight?.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);

TrackListDebug.propTypes = {
  tracks: PropTypes.arrayOf(
    PropTypes.shape({
      track: PropTypes.shape({
        uri: PropTypes.string.isRequired,
        name: PropTypes.string,
        artists: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string })),
        album: PropTypes.shape({
          name: PropTypes.string,
          release_date: PropTypes.string,
        }),
      }).isRequired,
      weight: PropTypes.number,
      editorial: PropTypes.bool,
    })
  ).isRequired,
};

export { TrackListDebug };

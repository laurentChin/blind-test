import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { FaRegPlayCircle, FaRegPauseCircle } from "react-icons/fa";
import { MdSkipNext } from "react-icons/md";

import { useMusicProvider } from "../../contexts/MusicProvider";

import "./Player.css";

const Player = ({ nextTrackCallback, tracks = [] }) => {
  const { getPlayer, setPlayerStateChangeCb } = useMusicProvider();

  // Seeded from the playlist already fetched during setup rather than
  // waiting on the provider's own "now playing" event, which only fires
  // once real playback starts — this is what lets the session open showing
  // track 1, paused, without needing to actually start playback first.
  const [state, setState] = useState({ paused: true });
  const [currentTrack, setCurrentTrack] = useState(tracks[0] || "");
  const [nextTrack, setNextTrack] = useState(tracks[1] || "");

  const player = getPlayer();

  useEffect(() => {
    setPlayerStateChangeCb(setState);
  }, [setPlayerStateChangeCb, player]);

  useEffect(() => {
    if (state.track_window) {
      const { current_track, next_tracks } = state.track_window;
      setCurrentTrack(current_track);
      setNextTrack(next_tracks[0]);
    }
  }, [state]);

  return (
    <section className="Player-container" aria-label="Music player">
      <p className="current-track">Current track: {currentTrack.name}</p>
      <p className="next-track">Next track: {nextTrack.name}</p>
      <div className="controls-container">
        <button
          type="button"
          className="btn btn-ghost"
          data-testid="toggle-play-pause-btn"
          aria-label={state.paused ? "Play" : "Pause"}
          onClick={() => player.togglePlay()}
        >
          {state.paused ? <FaRegPlayCircle /> : <FaRegPauseCircle />}
        </button>
        {nextTrack && (
          <button
            type="button"
            className="btn btn-ghost"
            data-testid="play-next-btn"
            aria-label="Next track"
            onClick={() => {
              player.nextTrack();
              nextTrackCallback();
            }}
          >
            <MdSkipNext />
          </button>
        )}
      </div>
    </section>
  );
};

Player.propTypes = {
  nextTrackCallback: PropTypes.func.isRequired,
  tracks: PropTypes.array,
};

export { Player };

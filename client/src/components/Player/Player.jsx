import React, { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { FaRegPlayCircle, FaRegPauseCircle } from "react-icons/fa";
import { MdSkipNext } from "react-icons/md";

import { SpotifyContext } from "../../contexts/Spotify";

import "./Player.css";

const Player = ({ nextTrackCallback }) => {
  const { getPlayer, setPlayerStateChangeCb } = useContext(SpotifyContext);

  const [state, setState] = useState({});
  const [currentTrack, setCurrentTrack] = useState("");
  const [nextTrack, setNextTrack] = useState("");

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
    <div className="Player-container">
      <span className="current-track">Current track : {currentTrack.name}</span>
      <span className="next-track">Next track : {nextTrack.name}</span>
      <div className="controls-container">
        <button
          data-testid="toggle-play-pause-btn"
          onClick={() => player.togglePlay()}
        >
          {state.paused ? <FaRegPlayCircle /> : <FaRegPauseCircle />}
        </button>
        {nextTrack && (
          <button
            data-testid="play-next-btn"
            onClick={() => {
              player.nextTrack();
              nextTrackCallback();
            }}
          >
            <MdSkipNext />
          </button>
        )}
      </div>
    </div>
  );
};

Player.propTypes = {
  nextTrackCallback: PropTypes.func.isRequired,
};

export { Player };

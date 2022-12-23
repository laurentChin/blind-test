import React, { useContext, useRef, useState } from "react";
import PropTypes from "prop-types";

import "./Result.css";
import { SpotifyContext } from "../../contexts/Spotify";
import { FaRegPlayCircle, FaRegPauseCircle } from "react-icons/fa";

const Result = ({ uri, name, artists, preview, addTrackCallback }) => {
  const spotifyContext = useContext(SpotifyContext);
  const player = useRef();
  const [isPlaying, setPlaying] = useState(false);
  const addToPlaylist = () => {
    spotifyContext.addTrack(uri).then(() => {
      addTrackCallback();
    });
  };

  return (
    <div className="Result">
      <span>
        {name} | {artists.map((artist) => artist.name).join(", ")}
      </span>
      {preview && (
        <>
          <audio ref={player} src={preview} loop />
          {player.current && isPlaying ? (
            <FaRegPauseCircle
              className="preview-control"
              onClick={() => {
                player.current.pause();
                setPlaying(false);
              }}
            />
          ) : (
            <FaRegPlayCircle
              className="preview-control"
              onClick={() => {
                player.current.play();
                setPlaying(true);
              }}
            />
          )}
        </>
      )}
      <button onClick={addToPlaylist}>Add</button>
    </div>
  );
};

Result.propTypes = {
  uri: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  artists: PropTypes.array.isRequired,
  addTrackCallback: PropTypes.func.isRequired,
  preview: PropTypes.string,
};

export { Result };

import React, { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";

import { FaTrash } from "react-icons/fa";

import { Search } from "../../../components/Search/Search";
import { SpotifyContext } from "../../../contexts/Spotify";

import "./ManageTracks.css";

const ManageTracks = ({ playlistId }) => {
  const spotifyContext = useContext(SpotifyContext);

  const [tracks, setTracks] = useState([]);
  const [isSearchPopInVisible, setSearchPopInVisible] = useState(false);

  useEffect(() => {
    spotifyContext.getTracks(playlistId).then((tracks) => setTracks(tracks));
  }, [playlistId, spotifyContext]);

  const removeTrack = (uri) => {
    spotifyContext.removeTrack(uri).then(() => {
      spotifyContext.getTracks(playlistId).then((tracks) => setTracks(tracks));
    });
  };

  return (
    <>
      <div className="Step Manage-Tracks">
        {tracks.map((track) => (
          <div className="track" key={track.id}>
            {track.name}{" "}
            <button
              data-testid={`delete-${track.uri}-btn`}
              onClick={() => removeTrack(track.uri)}
              className="trash-button"
            >
              <FaTrash />
            </button>
          </div>
        ))}
        <button onClick={() => setSearchPopInVisible(true)}>Add</button>
      </div>
      {isSearchPopInVisible && (
        <div className="search-pop-in">
          <div
            className="search-overlay"
            onClick={() => setSearchPopInVisible(false)}
          />
          <Search
            excludedTracks={tracks}
            addTrackCallback={() => {
              spotifyContext
                .getTracks(playlistId)
                .then((tracks) => setTracks(tracks));
              setSearchPopInVisible(false);
            }}
          />
        </div>
      )}
    </>
  );
};

ManageTracks.propTypes = {
  playlistId: PropTypes.string.isRequired,
};

export { ManageTracks };

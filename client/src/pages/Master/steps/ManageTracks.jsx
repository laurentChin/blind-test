import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

import { FaTrash } from "react-icons/fa";

import { Search } from "../../../components/Search/Search";
import { useMusicProvider } from "../../../contexts/MusicProvider";

import "./ManageTracks.css";

const ManageTracks = ({ playlistId }) => {
  const musicProvider = useMusicProvider();

  const [tracks, setTracks] = useState([]);
  const [isSearchPopInVisible, setSearchPopInVisible] = useState(false);

  useEffect(() => {
    musicProvider.getTracks(playlistId).then((tracks) => setTracks(tracks));
  }, [playlistId, musicProvider]);

  const removeTrack = (uri) => {
    musicProvider.removeTrack(uri).then(() => {
      musicProvider.getTracks(playlistId).then((tracks) => setTracks(tracks));
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
              musicProvider
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

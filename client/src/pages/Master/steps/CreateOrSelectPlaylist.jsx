import React, { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { SpotifyContext } from "../../../contexts/Spotify";

import "./CreateOrSelectPlaylist.css";

const CreateOrSelectPlaylist = ({
  isAuthenticated,
  playlistId,
  setPlaylistId,
  setTitle,
}) => {
  const spotifyContext = useContext(SpotifyContext);

  const [sessionName, setSessionName] = useState("");
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      spotifyContext.getPlaylists().then((playlists) => {
        setPlaylists(playlists);
        setTitle(
          playlists.find((playlist) => playlist.id === playlistId)?.name ||
            sessionName
        );
      });
    }
  }, [isAuthenticated, spotifyContext, playlistId, sessionName, setTitle]);

  useEffect(() => {
    if (playlistId) {
      sessionStorage.setItem("playlistId", playlistId);
      spotifyContext.setCurrentPlaylist(playlistId);
    }
  }, [playlistId, spotifyContext]);

  const createPlaylist = () => {
    spotifyContext
      .createPlaylist(sessionName)
      .then(({ id }) => setPlaylistId(id));
  };

  return (
    <div className="Step Create-Or-Select-Playlist">
      <div className="Create-Playlist option-block">
        <h3>Create a new playlist</h3>
        <input
          id="playlist-name"
          type="text"
          value={sessionName}
          onChange={({ currentTarget: { value } }) => {
            setSessionName(value);
            setTitle(value);
          }}
        />
        <button data-testid="create-playlist-btn" onClick={createPlaylist}>
          Create the playlist
        </button>
      </div>
      <span className="option-block-separator">OR</span>
      <div className="Select-Playlist option-block">
        <h3>Choose an existing playlist</h3>
        <div className="playlists-container">
          {playlists.map((playlist) =>
            playlist.id === playlistId ? (
              <span data-testid="selected-playlist" key={playlist.id}>
                {playlist.name}
              </span>
            ) : (
              <button
                key={playlist.id}
                onClick={() => {
                  setPlaylistId(playlist.id);
                  setTitle(playlist.name);
                }}
              >
                {playlist.name}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

CreateOrSelectPlaylist.propTypes = {
  playlistId: PropTypes.string.isRequired,
  isAuthenticated: PropTypes.bool.isRequired,
  setPlaylistId: PropTypes.func.isRequired,
  setTitle: PropTypes.func.isRequired,
};

export { CreateOrSelectPlaylist };

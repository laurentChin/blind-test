import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useMusicProvider } from "../../../contexts/MusicProvider";

import "./CreateOrSelectPlaylist.css";

const CreateOrSelectPlaylist = ({
  isAuthenticated,
  onSelectPlaylist,
  setTitle,
}) => {
  const musicProvider = useMusicProvider();

  const [sessionName, setSessionName] = useState("");
  const [playlists, setPlaylists] = useState([]);
  const [playlistId, setPlaylistId] = useState(
    sessionStorage.getItem("playlistId") || ""
  );

  useEffect(() => {
    if (isAuthenticated) {
      musicProvider.getPlaylists().then((response) => {
        setPlaylists(response);
        setTitle(
          response.find((playlist) => playlist.id === playlistId)?.name ||
            sessionName
        );
      });
    }
  }, [isAuthenticated, musicProvider, playlistId, sessionName, setTitle]);

  useEffect(() => {
    if (playlistId) {
      sessionStorage.setItem("playlistId", playlistId);
      musicProvider.setCurrentPlaylist(playlistId);
      onSelectPlaylist(playlistId);
    }
  }, [playlistId, musicProvider]);

  const createPlaylist = () => {
    musicProvider
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
      {playlists.length > 0 && (
        <>
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
        </>
      )}
    </div>
  );
};

CreateOrSelectPlaylist.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
  onSelectPlaylist: PropTypes.func.isRequired,
  setTitle: PropTypes.func.isRequired,
};

export { CreateOrSelectPlaylist };

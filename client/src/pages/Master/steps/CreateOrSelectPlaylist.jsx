import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useMusicProvider } from "../../../contexts/MusicProvider";
import { useAsyncAction } from "../../../hooks/useAsyncAction";

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
  const createDialog = useRef();
  const { run, className: loadingClassName } = useAsyncAction();
  const { run: runSelect, className: selectLoadingClassName } =
    useAsyncAction();

  useEffect(() => {
    if (isAuthenticated) {
      musicProvider.getPlaylists().then((response) => {
        setPlaylists(response);
        const selected = response.find(
          (playlist) => playlist.id === playlistId
        );
        if (selected) {
          setTitle(selected.name);
        }
      });
    }
    // playlistId is read here only to resolve the title for a playlist
    // restored from sessionStorage on mount; selecting or creating a
    // playlist already sets the title directly. Re-running this on every
    // playlistId change would race a freshly created playlist against the
    // provider's own listing endpoint (Apple Music's library list doesn't
    // index a just-created playlist immediately) and overwrite the
    // optimistic entry added in createPlaylist below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, musicProvider, setTitle]);

  useEffect(() => {
    if (playlistId) {
      sessionStorage.setItem("playlistId", playlistId);
      musicProvider.setCurrentPlaylist(playlistId);
      onSelectPlaylist(playlistId);
      runSelect(() => new Promise((resolve) => setTimeout(resolve, 1000)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistId, musicProvider]);

  const selectPlaylist = (playlist) => {
    setPlaylistId(playlist.id);
    setTitle(playlist.name);
  };

  const createPlaylist = (event) => {
    event.preventDefault();
    run(() =>
      musicProvider.createPlaylist(sessionName).then(({ id }) => {
        // Added optimistically: some providers (Apple Music) don't index a
        // just-created playlist in their own listing endpoint immediately,
        // so waiting for a refetch to show it as selected can leave the
        // list looking like creation silently failed.
        setPlaylists((playlists) => [
          ...playlists,
          { id, name: sessionName },
        ]);
        setPlaylistId(id);
        setTitle(sessionName);
        setSessionName("");
        createDialog.current.close();
      })
    );
  };

  return (
    <>
      <ul className="playlists-container">
        <li>
          <button
            type="button"
            data-testid="open-create-playlist-btn"
            className="btn btn-positive"
            onClick={() => createDialog.current.showModal()}
          >
            + Create a playlist
          </button>
        </li>
        {playlists.map((playlist) => (
          <li key={playlist.id}>
            {playlist.id === playlistId ? (
              <span
                data-testid="selected-playlist"
                className={selectLoadingClassName}
              >
                {playlist.name}
              </span>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => selectPlaylist(playlist)}
              >
                {playlist.name}
              </button>
            )}
          </li>
        ))}
      </ul>
      <dialog
        ref={createDialog}
        className="create-playlist-dialog"
        onClick={(event) => {
          if (event.target === createDialog.current) {
            createDialog.current.close();
          }
        }}
      >
        <form className="panel" onSubmit={createPlaylist}>
          <h3>Create a new playlist</h3>
          <label htmlFor="playlist-name">Playlist name</label>
          <input
            id="playlist-name"
            className="field"
            type="text"
            value={sessionName}
            onChange={({ currentTarget: { value } }) => {
              setSessionName(value);
              setTitle(value);
            }}
          />
          <button
            type="submit"
            data-testid="create-playlist-btn"
            className={`btn btn-positive ${loadingClassName}`.trim()}
          >
            Create the playlist
          </button>
        </form>
      </dialog>
    </>
  );
};

CreateOrSelectPlaylist.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
  onSelectPlaylist: PropTypes.func.isRequired,
  setTitle: PropTypes.func.isRequired,
};

export { CreateOrSelectPlaylist };

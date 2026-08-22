import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";

import "./Result.css";
import { useMusicProvider } from "../../contexts/MusicProvider";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { FaRegPlayCircle, FaRegPauseCircle } from "react-icons/fa";

const Result = ({
  id,
  uri,
  name,
  artists,
  preview,
  addTrackCallback,
  isPlaying = false,
  onTogglePreview = () => {},
}) => {
  const musicProvider = useMusicProvider();
  const player = useRef();
  const { run, className: loadingClassName } = useAsyncAction();
  const artistNames = artists.map((artist) => artist.name).join(", ");

  // isPlaying is owned by the parent (Search) so it can enforce only one
  // preview playing at a time — this component just mirrors it onto its own
  // audio element.
  useEffect(() => {
    if (!player.current) return;

    if (isPlaying) {
      player.current.play();
    } else {
      player.current.pause();
    }
  }, [isPlaying]);

  const addToPlaylist = () => {
    if (isPlaying) {
      onTogglePreview();
    }
    // Passed back to the caller instead of relying on a refetch: some
    // providers (Apple Music) don't reflect a track just added to a
    // playlist immediately on their own read endpoint, so an immediate
    // getTracks() call can silently omit it.
    run(() =>
      musicProvider
        .addTrack(uri)
        .then(() =>
          addTrackCallback({ id, uri, name, artists, preview_url: preview })
        )
    );
  };

  return (
    <li className="Result">
      <span>
        {name} | {artistNames}
      </span>
      {preview && (
        <>
          <audio ref={player} src={preview} loop />
          <button
            type="button"
            className="btn btn-ghost preview-control"
            aria-label={isPlaying ? `Pause preview of ${name}` : `Play preview of ${name}`}
            onClick={onTogglePreview}
          >
            {isPlaying ? <FaRegPauseCircle /> : <FaRegPlayCircle />}
          </button>
        </>
      )}
      <button
        type="button"
        className={`btn btn-positive ${loadingClassName}`.trim()}
        onClick={addToPlaylist}
      >
        Add
      </button>
    </li>
  );
};

Result.propTypes = {
  id: PropTypes.string.isRequired,
  uri: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  artists: PropTypes.array.isRequired,
  addTrackCallback: PropTypes.func.isRequired,
  preview: PropTypes.string,
  isPlaying: PropTypes.bool,
  onTogglePreview: PropTypes.func,
};

export { Result };

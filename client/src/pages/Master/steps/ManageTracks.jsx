import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

import { FaTrash } from "react-icons/fa";
import {
  MdDragIndicator,
  MdKeyboardArrowUp,
  MdKeyboardArrowDown,
} from "react-icons/md";

import { Search } from "../../../components/Search/Search";
import { useMusicProvider } from "../../../contexts/MusicProvider";
import { useConfirmAction } from "../../../hooks/useConfirmAction";

import "./ManageTracks.css";

const TrackRow = ({
  track,
  index,
  isFirst,
  isLast,
  isPlaceholder,
  onMove,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  const { run, isArmed } = useConfirmAction();

  return (
    <li
      className={isPlaceholder ? "track-placeholder" : "track"}
      aria-hidden={isPlaceholder || undefined}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(event) => onDragOver(event, index)}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
    >
      {!isPlaceholder && (
        <>
          <MdDragIndicator className="drag-handle" aria-hidden="true" />
          <span className="track-name">
            <strong>{track.name}</strong> [
            {(track.artists || []).map((artist) => artist.name).join(", ")}]
          </span>
          <div className="track-actions">
            <button
              type="button"
              className="btn btn-ghost"
              aria-label={`Move ${track.name} up`}
              disabled={isFirst}
              onClick={() => onMove(index, index - 1)}
            >
              <MdKeyboardArrowUp />
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              aria-label={`Move ${track.name} down`}
              disabled={isLast}
              onClick={() => onMove(index, index + 1)}
            >
              <MdKeyboardArrowDown />
            </button>
            <button
              type="button"
              data-testid={`delete-${track.uri}-${index}-btn`}
              onClick={() => run(() => onRemove(track))}
              className={`btn btn-danger trash-button ${
                isArmed ? "btn-confirm is-armed" : ""
              }`.trim()}
              aria-label={
                isArmed
                  ? `Click again to confirm removing ${track.name}`
                  : `Remove ${track.name}`
              }
            >
              {isArmed ? (
                "Click again to confirm"
              ) : (
                <FaTrash aria-hidden="true" />
              )}
            </button>
          </div>
        </>
      )}
    </li>
  );
};

TrackRow.propTypes = {
  track: PropTypes.shape({
    id: PropTypes.string.isRequired,
    uri: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    artists: PropTypes.arrayOf(
      PropTypes.shape({ name: PropTypes.string.isRequired })
    ),
  }).isRequired,
  index: PropTypes.number.isRequired,
  isFirst: PropTypes.bool.isRequired,
  isLast: PropTypes.bool.isRequired,
  isPlaceholder: PropTypes.bool.isRequired,
  onMove: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onDragStart: PropTypes.func.isRequired,
  onDragOver: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  onDragEnd: PropTypes.func.isRequired,
};

const ManageTracks = ({
  playlistId,
  onTracksChange = () => {},
  onLoadingChange = () => {},
}) => {
  const musicProvider = useMusicProvider();

  const [tracks, setTracks] = useState([]);
  const searchDialog = useRef();
  const dragIndex = useRef(null);
  const [insertionIndex, setInsertionIndex] = useState(null);

  useEffect(() => {
    if (!playlistId) return;

    onLoadingChange(true);
    musicProvider.getTracks(playlistId).then((tracks) => {
      setTracks(tracks);
      onLoadingChange(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistId, musicProvider]);

  useEffect(() => {
    onTracksChange(tracks);
  }, [tracks, onTracksChange]);

  const removeTrack = (track) =>
    musicProvider.removeTrack(track).then(() => {
      musicProvider.getTracks(playlistId).then((tracks) => setTracks(tracks));
    });

  const moveTrack = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= tracks.length || fromIndex === toIndex) {
      return;
    }

    musicProvider.reorderTrack(fromIndex, toIndex).then(() => {
      musicProvider.getTracks(playlistId).then((tracks) => setTracks(tracks));
    });
  };

  // While dragging, the source row keeps its place as the same DOM node
  // (same key, same TrackRow instance) but renders as an empty placeholder
  // instead of its usual content — swapping it for an unrelated element
  // would let React unmount/remount the underlying <li>, and real browsers
  // stop tracking a drag whose source node gets detached from the document,
  // silently killing the operation (not reproducible with jsdom's synthetic
  // events, which don't track a real node). The whole list is re-rendered
  // in the order the drop would produce (splice the dragged track out, then
  // back in at the hovered position), so surrounding rows shift live and
  // the placeholder always marks the exact slot the track would land in —
  // computed from which half (top/bottom) of the hovered row the cursor is
  // over, so dragging past a row inserts before or after it accordingly.
  const handleDragStart = (index) => {
    dragIndex.current = index;
    // Deferred: the browser needs the source row still showing its normal
    // content to capture its drag ghost image. Turning it into the
    // placeholder synchronously in the same dragstart handler races that
    // capture in real browsers.
    setTimeout(() => setInsertionIndex(index), 0);
  };

  const handleDragOver = (event, hoverIndex) => {
    event.preventDefault();
    if (dragIndex.current === null) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const isAfter = event.clientY - rect.top > rect.height / 2;
    const visiblePosition =
      hoverIndex > dragIndex.current ? hoverIndex - 1 : hoverIndex;

    setInsertionIndex(isAfter ? visiblePosition + 1 : visiblePosition);
  };

  const endDrag = () => {
    dragIndex.current = null;
    setInsertionIndex(null);
  };

  const handleDrop = () => {
    const fromIndex = dragIndex.current;
    const toIndex = insertionIndex;

    endDrag();

    if (fromIndex !== null && toIndex !== null) {
      moveTrack(fromIndex, toIndex);
    }
  };

  const previewTracks =
    dragIndex.current === null || insertionIndex === null
      ? tracks
      : (() => {
          const reordered = [...tracks];
          const [dragged] = reordered.splice(dragIndex.current, 1);
          reordered.splice(
            Math.min(insertionIndex, reordered.length),
            0,
            dragged
          );
          return reordered;
        })();

  return (
    <>
      <ul
        className="track-list"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleDrop();
        }}
      >
        {previewTracks.map((track) => {
          const index = tracks.indexOf(track);

          return (
            <TrackRow
              // Keyed by stable position in `tracks` rather than track.id:
              // the same song can legitimately appear more than once in a
              // playlist, and provider APIs reuse the same song/catalog id
              // for every occurrence — an id-based key would collide and
              // silently drop the duplicates from the render. Position
              // stays unique and, since `tracks` itself isn't mutated
              // mid-drag (only its display order via previewTracks), it
              // also stays stable for the dragged row throughout a drag.
              key={index}
              track={track}
              index={index}
              isFirst={index === 0}
              isLast={index === tracks.length - 1}
              isPlaceholder={index === dragIndex.current}
              onMove={moveTrack}
              onRemove={removeTrack}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={endDrag}
            />
          );
        })}
      </ul>
      <button
        type="button"
        className="btn btn-positive"
        onClick={() => searchDialog.current.showModal()}
      >
        Add
      </button>
      <dialog
        ref={searchDialog}
        className="search-dialog"
        onClick={(event) => {
          if (event.target === searchDialog.current) {
            searchDialog.current.close();
          }
        }}
      >
        <Search
          excludedTracks={tracks}
          addTrackCallback={(track) => {
            // Appended locally instead of refetched: some providers (Apple
            // Music) don't reflect a track just added to a playlist
            // immediately on their own read endpoint, so an immediate
            // getTracks() call can silently omit it.
            setTracks((tracks) => [...tracks, track]);
            searchDialog.current.close();
          }}
        />
      </dialog>
    </>
  );
};

ManageTracks.propTypes = {
  playlistId: PropTypes.string.isRequired,
  onTracksChange: PropTypes.func,
  onLoadingChange: PropTypes.func,
};

export { ManageTracks };

import React, { useId, useState } from "react";
import PropTypes from "prop-types";
import { FiDelete } from "react-icons/fi";
import { Result } from "../Result/Result";
import { useMusicProvider } from "../../contexts/MusicProvider";

import "./Search.css";

const Search = ({ excludedTracks, addTrackCallback }) => {
  const musicProvider = useMusicProvider();
  const [results, setResults] = useState([]);
  const [searchTerms, setSearchTerms] = useState("");
  const [activePreviewUri, setActivePreviewUri] = useState("");
  const inputId = useId();

  const togglePreview = (uri) => {
    setActivePreviewUri((current) => (current === uri ? "" : uri));
  };

  const handleSearch = ({ currentTarget: { value } }) => {
    setSearchTerms(value);
    if (value.length < 3) return null;
    musicProvider.search(value).then((tracks) => {
      setResults([
        ...tracks.items.filter(
          (item) => !excludedTracks.find((track) => track.id === item.id)
        ),
      ]);
    });
  };

  const clearSearch = () => {
    setResults([]);
    setSearchTerms("");
    setActivePreviewUri("");
  };

  const handleTrackAdded = (track) => {
    clearSearch();
    addTrackCallback(track);
  };

  return (
    <div className="Search-container">
      <div className="Search-Input-container">
        <label className="visually-hidden" htmlFor={inputId}>
          Search a title, or an artist
        </label>
        <input
          id={inputId}
          className="field"
          type="search"
          onChange={handleSearch}
          value={searchTerms}
          placeholder="Search a title, or an artist"
        />
        <button
          type="button"
          className="btn btn-ghost reset-search-button"
          aria-label="Clear search"
          onClick={clearSearch}
        >
          <FiDelete />
        </button>
      </div>
      <ul className="Search-ResultList">
        {results.map(({ id, uri, name, preview_url, artists }) => (
          <Result
            key={uri}
            id={id}
            uri={uri}
            name={name}
            artists={artists}
            preview={preview_url}
            addTrackCallback={handleTrackAdded}
            isPlaying={activePreviewUri === uri}
            onTogglePreview={() => togglePreview(uri)}
          />
        ))}
      </ul>
    </div>
  );
};

Search.propTypes = {
  excludedTracks: PropTypes.array.isRequired,
  addTrackCallback: PropTypes.func.isRequired,
};

export { Search };

import React, { useContext, useState } from "react";
import PropTypes from "prop-types";
import { FiDelete } from "react-icons/fi";
import { Result } from "../Result/Result";
import { SpotifyContext } from "../../contexts/Spotify";

import "./Search.css";

const Search = ({ excludedTracks, addTrackCallback }) => {
  const spotifyContext = useContext(SpotifyContext);
  const [results, setResults] = useState([]);
  const [searchTerms, setSearchTerms] = useState("");
  const handleSearch = ({ currentTarget: { value } }) => {
    setSearchTerms(value);
    if (value.length < 3) return null;
    spotifyContext.search(value).then((tracks) => {
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
  };
  return (
    <div className="Search-container">
      <div className="Search-Input-container">
        <input
          type="search"
          onChange={handleSearch}
          value={searchTerms}
          placeholder="Search of a title, or an artist"
        />
        <button className="reset-search-button" onClick={clearSearch}>
          <FiDelete />
        </button>
      </div>
      <div className="Search-ResultList">
        {results.map(({ uri, name, preview_url, artists }) => (
          <Result
            key={uri}
            uri={uri}
            name={name}
            artists={artists}
            preview={preview_url}
            addTrackCallback={addTrackCallback}
          />
        ))}
      </div>
    </div>
  );
};

Search.propTypes = {
  excludedTracks: PropTypes.array.isRequired,
  addTrackCallback: PropTypes.func.isRequired,
};

export { Search };

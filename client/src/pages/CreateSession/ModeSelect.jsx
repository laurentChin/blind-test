import React from "react";
import PropTypes from "prop-types";
import { FaCrown, FaUsers } from "react-icons/fa";

import "./ModeSelect.css";

const MODES = [
  {
    id: "classic",
    testId: "select-classic-mode-btn",
    icon: FaCrown,
    label: "Classic",
    description:
      "One player hosts: they build the playlist, play the tracks and judge every answer.",
  },
  {
    id: "everybody-plays",
    testId: "select-everybody-plays-mode-btn",
    icon: FaUsers,
    label: "Everybody plays",
    description:
      "No host — pick a theme and a track count, the app builds a secret playlist, and everyone (including you) can buzz in.",
  },
];

const ModeSelect = ({ onSelect }) => (
  <div className="mode-grid">
    {MODES.map(({ id, testId, icon: Icon, label, description }) => (
      <button
        key={id}
        type="button"
        data-testid={testId}
        className="mode-tile"
        onClick={() => onSelect(id)}
      >
        <Icon className="mode-icon" aria-hidden="true" />
        <span className="mode-label">{label}</span>
        <span className="mode-description">{description}</span>
      </button>
    ))}
  </div>
);

ModeSelect.propTypes = {
  onSelect: PropTypes.func.isRequired,
};

export { ModeSelect };

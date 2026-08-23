import React from "react";
import PropTypes from "prop-types";

import "./ColorPicker.css";

const ColorPicker = ({ colors, value, onChange, legend = "Color" }) => (
  <fieldset className="ColorPicker colors">
    <legend className="visually-hidden">{legend}</legend>
    {colors.map((color) => (
      <button
        type="button"
        onClick={() => onChange(color)}
        key={color}
        style={{ "--swatch-color": `rgba(${color}, 1)` }}
        aria-pressed={color === value}
        aria-label={`Color ${color}`}
        data-testid="color-button"
        className="color-button"
      />
    ))}
  </fieldset>
);

ColorPicker.propTypes = {
  colors: PropTypes.arrayOf(PropTypes.string).isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  legend: PropTypes.string,
};

export { ColorPicker };

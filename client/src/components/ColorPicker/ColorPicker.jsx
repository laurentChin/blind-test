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
        key={color.background}
        style={{ "--swatch-color": `rgb(${color.background})` }}
        aria-pressed={color === value}
        aria-label={`Color ${color.background}`}
        data-testid="color-button"
        className="color-button"
      />
    ))}
  </fieldset>
);

const colorPropType = PropTypes.shape({
  background: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
});

ColorPicker.propTypes = {
  colors: PropTypes.arrayOf(colorPropType).isRequired,
  value: colorPropType,
  onChange: PropTypes.func.isRequired,
  legend: PropTypes.string,
};

export { ColorPicker, colorPropType };

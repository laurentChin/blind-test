import React from "react";
import { render, fireEvent } from "@testing-library/react";

import { ColorPicker } from "./ColorPicker";

const COLORS = [
  { background: "1, 2, 3", text: "255, 255, 255" },
  { background: "4, 5, 6", text: "0, 0, 0" },
];

describe("<ColorPicker />", () => {
  it("should render a swatch button per color and report the picked color", () => {
    const onChange = jest.fn();
    const { getAllByTestId } = render(
      <ColorPicker colors={COLORS} value={null} onChange={onChange} />
    );

    const buttons = getAllByTestId("color-button");
    expect(buttons).toHaveLength(2);

    fireEvent.click(buttons[1]);
    expect(onChange).toHaveBeenCalledWith(COLORS[1]);
  });

  it("should mark the selected color as pressed", () => {
    const { getAllByTestId } = render(
      <ColorPicker colors={COLORS} value={COLORS[1]} onChange={jest.fn()} />
    );

    const buttons = getAllByTestId("color-button");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
  });
});

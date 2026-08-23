import React from "react";
import { render, fireEvent } from "@testing-library/react";

import { ColorPicker } from "./ColorPicker";

describe("<ColorPicker />", () => {
  it("should render a swatch button per color and report the picked color", () => {
    const onChange = jest.fn();
    const { getAllByTestId } = render(
      <ColorPicker colors={["1,2,3", "4,5,6"]} value="" onChange={onChange} />
    );

    const buttons = getAllByTestId("color-button");
    expect(buttons).toHaveLength(2);

    fireEvent.click(buttons[1]);
    expect(onChange).toHaveBeenCalledWith("4,5,6");
  });

  it("should mark the selected color as pressed", () => {
    const { getAllByTestId } = render(
      <ColorPicker
        colors={["1,2,3", "4,5,6"]}
        value="4,5,6"
        onChange={jest.fn()}
      />
    );

    const buttons = getAllByTestId("color-button");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
  });
});

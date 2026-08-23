import React from "react";
import { render, fireEvent } from "@testing-library/react";

import { ModeSelect } from "./ModeSelect";

describe("<ModeSelect />", () => {
  it("should call onSelect with 'classic' when the classic tile is clicked", () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(<ModeSelect onSelect={onSelect} />);

    fireEvent.click(getByTestId("select-classic-mode-btn"));

    expect(onSelect).toHaveBeenCalledWith("classic");
  });

  it("should call onSelect with 'everybody-plays' when the everybody-plays tile is clicked", () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(<ModeSelect onSelect={onSelect} />);

    fireEvent.click(getByTestId("select-everybody-plays-mode-btn"));

    expect(onSelect).toHaveBeenCalledWith("everybody-plays");
  });
});

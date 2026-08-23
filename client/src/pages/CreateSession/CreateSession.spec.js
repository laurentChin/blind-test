import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { useNavigate } from "react-router-dom";

import { CreateSession } from "./CreateSession";
import { useMusicProvider } from "../../contexts/MusicProvider";

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

jest.mock("../../contexts/MusicProvider", () => ({
  getSelectedProvider: jest.fn().mockReturnValue(""),
  useMusicProvider: jest.fn().mockReturnValue({
    isAuthenticated: false,
    login: jest.fn().mockResolvedValue(),
  }),
}));

jest.mock("../../components/ProviderSelect/ProviderSelect", () => ({
  // eslint-disable-next-line react/prop-types
  ProviderSelect: ({ setProvider }) => (
    <button data-testid="mock-provider-select" onClick={() => setProvider("spotify")}>
      provider
    </button>
  ),
}));

jest.mock("./ModeSelect", () => ({
  // eslint-disable-next-line react/prop-types
  ModeSelect: ({ onSelect }) => (
    <button data-testid="mock-mode-select" onClick={() => onSelect("classic")}>
      mode
    </button>
  ),
}));

describe("<CreateSession />", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should keep the mode step inert until the provider is authenticated", () => {
    useMusicProvider.mockReturnValue({
      isAuthenticated: false,
      login: jest.fn().mockResolvedValue(),
    });

    const { container } = render(<CreateSession />);
    const [, modeStep] = container.querySelectorAll(".config-step");

    expect(modeStep).toHaveAttribute("inert");
  });

  it("should unlock the mode step once authenticated", () => {
    useMusicProvider.mockReturnValue({
      isAuthenticated: true,
      login: jest.fn().mockResolvedValue(),
    });

    const { container } = render(<CreateSession />);
    const [, modeStep] = container.querySelectorAll(".config-step");

    expect(modeStep).not.toHaveAttribute("inert");
  });

  it("should navigate to /create-session/<mode> when a mode tile is picked", () => {
    useMusicProvider.mockReturnValue({
      isAuthenticated: true,
      login: jest.fn().mockResolvedValue(),
    });
    const navigate = jest.fn();
    useNavigate.mockReturnValue(navigate);

    const { getByTestId } = render(<CreateSession />);
    fireEvent.click(getByTestId("mock-mode-select"));

    expect(navigate).toHaveBeenCalledWith("/create-session/classic");
  });
});

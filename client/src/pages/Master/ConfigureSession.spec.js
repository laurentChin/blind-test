import React from "react";
import { render, fireEvent } from "@testing-library/react";

import { ConfigureSession } from "./ConfigureSession";

jest.mock("./steps/ProviderSelect", () => ({
  ProviderSelect: () => <div data-testid="provider-step" />,
}));

jest.mock("./steps/CreateOrSelectPlaylist", () => ({
  // eslint-disable-next-line react/prop-types
  CreateOrSelectPlaylist: ({ onSelectPlaylist }) => (
    <>
      <button onClick={() => onSelectPlaylist("playlist-1")}>
        select playlist
      </button>
      <button onClick={() => onSelectPlaylist("playlist-2")}>
        select other playlist
      </button>
    </>
  ),
}));

jest.mock("./steps/ManageTracks", () => ({
  // eslint-disable-next-line react/prop-types
  ManageTracks: ({ onTracksChange, onLoadingChange }) => (
    <>
      <button onClick={() => onLoadingChange(true)}>
        start loading tracks
      </button>
      <button
        onClick={() => {
          onTracksChange(
            Array.from({ length: 5 }, (_, index) => ({ id: `${index}` }))
          );
          onLoadingChange(false);
        }}
      >
        load tracks
      </button>
    </>
  ),
}));

const setup = (props = {}) => {
  const setProvider = jest.fn();
  const setTitle = jest.fn();
  const onLaunch = jest.fn();

  const utils = render(
    <ConfigureSession
      provider=""
      setProvider={setProvider}
      isAuthenticated={false}
      setTitle={setTitle}
      onLaunch={onLaunch}
      {...props}
    />
  );

  return { ...utils, setProvider, setTitle, onLaunch };
};

describe("<ConfigureSession />", () => {
  it("should keep the playlist and tracks steps inert until the previous step is validated", () => {
    const { container } = setup({ isAuthenticated: false });

    const [, playlistStep, tracksStep] = container.querySelectorAll(
      ".config-step"
    );

    expect(playlistStep).toHaveAttribute("inert");
    expect(tracksStep).toHaveAttribute("inert");
  });

  it("should unlock the playlist step once authenticated", () => {
    const { container } = setup({ isAuthenticated: true });

    const [, playlistStep] = container.querySelectorAll(".config-step");

    expect(playlistStep).not.toHaveAttribute("inert");
  });

  it("should unlock the tracks step once a playlist is selected", () => {
    const { container, getByText } = setup({ isAuthenticated: true });

    fireEvent.click(getByText("select playlist"));

    const [, , tracksStep] = container.querySelectorAll(".config-step");
    expect(tracksStep).not.toHaveAttribute("inert");
  });

  it("should only show the launch button once all steps are validated, and call onLaunch on click", () => {
    const { getByText, queryByText, onLaunch } = setup({
      isAuthenticated: true,
    });

    expect(queryByText("Launch the session")).toBeFalsy();

    fireEvent.click(getByText("select playlist"));
    fireEvent.click(getByText("load tracks"));

    const launchButton = getByText("Launch the session");
    expect(launchButton).toBeTruthy();

    fireEvent.click(launchButton);
    expect(onLaunch).toHaveBeenCalled();
  });

  it("should invalidate the playlist and tracks steps when the provider changes", () => {
    const setTitle = jest.fn();
    const onLaunch = jest.fn();
    const { getByText, queryByText, container, rerender } = render(
      <ConfigureSession
        provider="spotify"
        setProvider={jest.fn()}
        isAuthenticated={true}
        setTitle={setTitle}
        onLaunch={onLaunch}
      />
    );

    fireEvent.click(getByText("select playlist"));
    fireEvent.click(getByText("load tracks"));

    expect(getByText("Launch the session")).toBeTruthy();

    rerender(
      <ConfigureSession
        provider="appleMusic"
        setProvider={jest.fn()}
        isAuthenticated={false}
        setTitle={setTitle}
        onLaunch={onLaunch}
      />
    );

    expect(queryByText("Launch the session")).toBeFalsy();

    const [, playlistStep, tracksStep] = container.querySelectorAll(
      ".config-step"
    );
    expect(playlistStep).toHaveAttribute("inert");
    expect(tracksStep).toHaveAttribute("inert");
  });

  it("should invalidate the tracks step when switching to a different playlist, and re-dim it while the new tracks load", () => {
    const { getByText, queryByText, container } = setup({
      isAuthenticated: true,
    });

    fireEvent.click(getByText("select playlist"));
    fireEvent.click(getByText("load tracks"));

    expect(getByText("Launch the session")).toBeTruthy();

    fireEvent.click(getByText("select other playlist"));

    // The tracks count resets (hiding the launch button) since the new
    // playlist's tracks haven't loaded yet.
    expect(queryByText("Launch the session")).toBeFalsy();

    const [, , tracksStep] = container.querySelectorAll(".config-step");

    fireEvent.click(getByText("start loading tracks"));
    expect(tracksStep).toHaveAttribute("inert");

    fireEvent.click(getByText("load tracks"));
    expect(tracksStep).not.toHaveAttribute("inert");
    expect(getByText("Launch the session")).toBeTruthy();
  });

  it("should keep the tracks step inert while its tracks are loading, even right after selecting a playlist", () => {
    const { getByText, container } = setup({ isAuthenticated: true });

    fireEvent.click(getByText("select playlist"));
    fireEvent.click(getByText("start loading tracks"));

    const [, , tracksStep] = container.querySelectorAll(".config-step");
    expect(tracksStep).toHaveAttribute("inert");

    fireEvent.click(getByText("load tracks"));
    expect(tracksStep).not.toHaveAttribute("inert");
  });
});

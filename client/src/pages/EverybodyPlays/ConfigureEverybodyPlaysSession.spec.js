import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";

import { ConfigureEverybodyPlaysSession } from "./ConfigureEverybodyPlaysSession";
import { useMusicProvider } from "../../contexts/MusicProvider";

jest.mock("../../contexts/MusicProvider", () => ({
  useMusicProvider: jest.fn(),
}));

const makeTracks = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `track-${index}`,
    uri: `uri:track-${index}`,
  }));

const setup = ({ candidateCount = 15 } = {}) => {
  const musicProvider = {
    createPlaylist: jest.fn().mockResolvedValue({ id: "playlist-1" }),
    setCurrentPlaylist: jest.fn(),
    search: jest.fn().mockResolvedValue({ items: makeTracks(candidateCount) }),
    addTrack: jest.fn().mockResolvedValue(),
  };
  useMusicProvider.mockReturnValue(musicProvider);

  const socket = {
    emit: jest.fn((event, data, callback) => {
      if (event === "joinWaitingRoom") {
        callback({
          colors: [
            { background: "1, 2, 3", text: "255, 255, 255" },
            { background: "4, 5, 6", text: "0, 0, 0" },
          ],
        });
      }
    }),
  };
  const onLaunch = jest.fn();

  const utils = render(
    <ConfigureEverybodyPlaysSession
      sessionUuid="session-12345"
      socket={socket}
      onLaunch={onLaunch}
    />
  );

  return { ...utils, musicProvider, socket, onLaunch };
};

const fillIdentity = ({ getByTestId, getAllByTestId }) => {
  fireEvent.change(getByTestId("creator-name-input"), {
    target: { value: "Alice" },
  });
  fireEvent.click(getAllByTestId("color-button")[0]);
};

describe("<ConfigureEverybodyPlaysSession />", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should only show the launch button once identity, playlist name, theme and track count are all set", () => {
    const utils = setup();
    const { getByTestId, queryByTestId } = utils;

    expect(queryByTestId("generate-and-launch-btn")).toBeFalsy();

    fillIdentity(utils);
    fireEvent.change(getByTestId("playlist-name-input"), {
      target: { value: "Friday night" },
    });
    fireEvent.click(getByTestId("select-theme-80s-btn"));
    fireEvent.click(getByTestId("select-count-10-btn"));

    expect(getByTestId("generate-and-launch-btn")).toBeTruthy();
  });

  it("should generate a playlist from the chosen preset theme and launch with the creator's identity", async () => {
    const utils = setup({ candidateCount: 15 });
    const { getByTestId, musicProvider, onLaunch } = utils;

    fillIdentity(utils);
    fireEvent.change(getByTestId("playlist-name-input"), {
      target: { value: "Friday night" },
    });
    fireEvent.click(getByTestId("select-theme-80s-btn"));
    fireEvent.click(getByTestId("select-count-10-btn"));

    fireEvent.click(getByTestId("generate-and-launch-btn"));

    await waitFor(() => expect(onLaunch).toHaveBeenCalled());

    expect(musicProvider.createPlaylist).toHaveBeenCalledWith("Friday night");
    expect(musicProvider.setCurrentPlaylist).toHaveBeenCalledWith("playlist-1");
    expect(musicProvider.search).toHaveBeenCalledWith("80s hits", {
      limit: 50,
      offset: 0,
    });
    expect(musicProvider.addTrack).toHaveBeenCalledTimes(10);

    // Every added uri came from the search results, and none repeats.
    const addedUris = musicProvider.addTrack.mock.calls.map(([uri]) => uri);
    expect(new Set(addedUris).size).toBe(10);
    addedUris.forEach((uri) => expect(uri).toMatch(/^uri:track-/));

    expect(onLaunch).toHaveBeenCalledWith({
      name: "Alice",
      color: { background: "1, 2, 3", text: "255, 255, 255" },
    });
  });

  it("should create the session with the default timer/cooldown, or the edited values", async () => {
    const utils = setup({ candidateCount: 15 });
    const { getByTestId, socket, onLaunch } = utils;

    fillIdentity(utils);
    fireEvent.change(getByTestId("playlist-name-input"), {
      target: { value: "Friday night" },
    });
    fireEvent.click(getByTestId("select-theme-80s-btn"));
    fireEvent.click(getByTestId("select-count-10-btn"));
    fireEvent.change(getByTestId("timer-seconds-input"), {
      target: { value: "8" },
    });
    fireEvent.change(getByTestId("cooldown-seconds-input"), {
      target: { value: "3" },
    });

    fireEvent.click(getByTestId("generate-and-launch-btn"));

    await waitFor(() => expect(onLaunch).toHaveBeenCalled());

    expect(socket.emit).toHaveBeenCalledWith("createSession", {
      sessionUuid: "session-12345",
      mode: "everybodyPlays",
      timerSeconds: 8,
      cooldownSeconds: 3,
    });
  });

  it("should use the custom theme text instead of a preset when typed", async () => {
    const utils = setup({ candidateCount: 15 });
    const { getByTestId, musicProvider, onLaunch } = utils;

    fillIdentity(utils);
    fireEvent.change(getByTestId("playlist-name-input"), {
      target: { value: "Friday night" },
    });
    fireEvent.change(getByTestId("custom-theme-input"), {
      target: { value: "Céline Dion" },
    });
    fireEvent.click(getByTestId("select-count-10-btn"));

    fireEvent.click(getByTestId("generate-and-launch-btn"));

    await waitFor(() => expect(onLaunch).toHaveBeenCalled());

    expect(musicProvider.search).toHaveBeenCalledWith("Céline Dion", {
      limit: 50,
      offset: 0,
    });
  });

  it("should paginate across multiple search pages when a provider caps its own page size (e.g. Apple Music's 25/page)", async () => {
    const utils = setup();
    const { getByTestId, musicProvider, onLaunch } = utils;

    musicProvider.search.mockImplementation((query, { offset }) =>
      Promise.resolve({
        items: makeTracks(25).map((track) => ({
          id: `${track.id}-page-${offset}`,
          uri: `${track.uri}-page-${offset}`,
        })),
      })
    );

    fillIdentity(utils);
    fireEvent.change(getByTestId("playlist-name-input"), {
      target: { value: "Friday night" },
    });
    fireEvent.click(getByTestId("select-theme-80s-btn"));
    fireEvent.click(getByTestId("select-count-40-btn"));

    fireEvent.click(getByTestId("generate-and-launch-btn"));

    await waitFor(() => expect(onLaunch).toHaveBeenCalled());

    // 25 unique candidates per page isn't enough for 40 tracks in one page —
    // a second page, offset by however many actually came back, is needed.
    expect(musicProvider.search).toHaveBeenNthCalledWith(1, "80s hits", {
      limit: 50,
      offset: 0,
    });
    expect(musicProvider.search).toHaveBeenNthCalledWith(2, "80s hits", {
      limit: 50,
      offset: 25,
    });
    expect(musicProvider.addTrack).toHaveBeenCalledTimes(40);
  });

  it("should show an error and not launch when there aren't enough unique tracks for the requested count", async () => {
    const utils = setup({ candidateCount: 3 });
    const { getByTestId, findByText, musicProvider, onLaunch } = utils;

    fillIdentity(utils);
    fireEvent.change(getByTestId("playlist-name-input"), {
      target: { value: "Friday night" },
    });
    fireEvent.click(getByTestId("select-theme-80s-btn"));
    fireEvent.click(getByTestId("select-count-10-btn"));

    fireEvent.click(getByTestId("generate-and-launch-btn"));

    await findByText(/Not enough tracks/);

    expect(musicProvider.addTrack).not.toHaveBeenCalled();
    expect(onLaunch).not.toHaveBeenCalled();
  });

  it("should reveal a bounded numeric input when 'Custom' track count is picked", () => {
    const utils = setup();
    const { getByTestId, queryByLabelText } = utils;

    expect(queryByLabelText(/Number of tracks/)).toBeFalsy();

    fireEvent.click(getByTestId("select-count-custom-btn"));

    expect(queryByLabelText(/Number of tracks/)).toBeTruthy();
  });
});

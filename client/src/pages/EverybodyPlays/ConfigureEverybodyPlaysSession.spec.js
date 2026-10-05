import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";

import { ConfigureEverybodyPlaysSession } from "./ConfigureEverybodyPlaysSession";
import { useMusicProvider } from "../../contexts/MusicProvider";

jest.mock("../../contexts/MusicProvider", () => ({
  useMusicProvider: jest.fn(),
}));

// Distinct titles and artists: the generator dedupes by title and caps
// songs per artist, so look-alike fixtures would collapse onto a couple.
const makeTracks = (count, suffix = "") =>
  Array.from({ length: count }, (_, index) => ({
    id: `track-${index}${suffix}`,
    uri: `uri:track-${index}${suffix}`,
    name: `Song ${index}${suffix}`,
    artists: [{ name: `Artist ${index}${suffix}` }],
    album: { name: `Album ${index}`, release_date: "1985-01-01" },
  }));

const setup = ({ candidateCount = 15 } = {}) => {
  const musicProvider = {
    searchPageSize: 25,
    themeQueries: jest.fn((theme) => [theme.terms]),
    search: jest.fn((query, { offset }) =>
      Promise.resolve({ items: offset === 0 ? makeTracks(candidateCount) : [] })
    ),
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

  it("should only show the launch button once identity, theme and track count are all set", () => {
    const utils = setup();
    const { getByTestId, queryByTestId } = utils;

    expect(queryByTestId("generate-and-launch-btn")).toBeFalsy();

    fillIdentity(utils);
    fireEvent.click(getByTestId("select-theme-80s-btn"));
    fireEvent.click(getByTestId("select-count-10-btn"));

    expect(getByTestId("generate-and-launch-btn")).toBeTruthy();
  });

  it("should pick tracks from the chosen preset theme and launch with the creator's identity", async () => {
    const utils = setup({ candidateCount: 15 });
    const { getByTestId, musicProvider, onLaunch } = utils;

    fillIdentity(utils);
    fireEvent.click(getByTestId("select-theme-80s-btn"));
    fireEvent.click(getByTestId("select-count-10-btn"));

    fireEvent.click(getByTestId("generate-and-launch-btn"));

    await waitFor(() => expect(onLaunch).toHaveBeenCalled());

    expect(musicProvider.themeQueries).toHaveBeenCalledWith(
      expect.objectContaining({ id: "80s", years: [1980, 1989] })
    );
    expect(musicProvider.search).toHaveBeenCalledWith("80s hits", {
      limit: 25,
      offset: 0,
    });

    const [{ name, color, tracks }] = onLaunch.mock.calls[0];
    const trackUris = tracks.map(({ track }) => track.uri);

    // Every picked uri came from the search results, and none repeats.
    expect(trackUris).toHaveLength(10);
    expect(new Set(trackUris).size).toBe(10);
    trackUris.forEach((uri) => expect(uri).toMatch(/^uri:track-/));

    expect(name).toBe("Alice");
    expect(color).toEqual({ background: "1, 2, 3", text: "255, 255, 255" });
  });

  it("should create the session with the default timer/cooldown, or the edited values", async () => {
    const utils = setup({ candidateCount: 15 });
    const { getByTestId, socket, onLaunch } = utils;

    fillIdentity(utils);
    fireEvent.click(getByTestId("select-theme-80s-btn"));
    fireEvent.click(getByTestId("select-count-10-btn"));
    fireEvent.change(getByTestId("timer-seconds-input"), {
      target: { value: "8" },
    });
    fireEvent.blur(getByTestId("timer-seconds-input"));
    fireEvent.change(getByTestId("cooldown-seconds-input"), {
      target: { value: "3" },
    });
    fireEvent.blur(getByTestId("cooldown-seconds-input"));

    fireEvent.click(getByTestId("generate-and-launch-btn"));

    await waitFor(() => expect(onLaunch).toHaveBeenCalled());

    expect(socket.emit).toHaveBeenCalledWith("createSession", {
      sessionUuid: "session-12345",
      mode: "everybodyPlays",
      timerSeconds: 8,
      cooldownSeconds: 3,
      almostPoints: 0.5,
      fullPoints: 1,
      totalTracks: 10,
    });
  });

  it("should use the custom theme text instead of a preset when typed", async () => {
    const utils = setup({ candidateCount: 15 });
    const { getByTestId, musicProvider, onLaunch } = utils;

    fillIdentity(utils);
    fireEvent.change(getByTestId("custom-theme-input"), {
      target: { value: "Céline Dion" },
    });
    fireEvent.click(getByTestId("select-count-10-btn"));

    fireEvent.click(getByTestId("generate-and-launch-btn"));

    await waitFor(() => expect(onLaunch).toHaveBeenCalled());

    expect(musicProvider.themeQueries).toHaveBeenCalledWith(
      expect.objectContaining({ custom: true, text: "Céline Dion", terms: "Céline Dion" })
    );
    expect(musicProvider.search).toHaveBeenCalledWith("Céline Dion", {
      limit: 25,
      offset: 0,
    });
  });

  it("should page through search results by the provider's own page size", async () => {
    const utils = setup();
    const { getByTestId, musicProvider, onLaunch } = utils;

    musicProvider.search.mockImplementation((query, { offset }) =>
      Promise.resolve({ items: makeTracks(25, `-page-${offset}`) })
    );

    fillIdentity(utils);
    fireEvent.click(getByTestId("select-theme-80s-btn"));
    fireEvent.click(getByTestId("select-count-40-btn"));

    fireEvent.click(getByTestId("generate-and-launch-btn"));

    await waitFor(() => expect(onLaunch).toHaveBeenCalled());

    // Offsets step by searchPageSize, so no result is skipped or repeated.
    [0, 25, 50, 75].forEach((offset) =>
      expect(musicProvider.search).toHaveBeenCalledWith("80s hits", {
        limit: 25,
        offset,
      })
    );

    const [{ tracks }] = onLaunch.mock.calls[0];
    expect(tracks).toHaveLength(40);
  });

  it("should combine the decade, genre and free text of the 'your own theme' form into one theme", async () => {
    const utils = setup({ candidateCount: 15 });
    const { getByTestId, musicProvider, onLaunch } = utils;

    fillIdentity(utils);
    fireEvent.change(getByTestId("custom-period-select"), { target: { value: "80s" } });
    fireEvent.change(getByTestId("custom-genre-select"), { target: { value: "rock" } });
    fireEvent.change(getByTestId("custom-theme-input"), { target: { value: "Queen" } });
    fireEvent.click(getByTestId("select-count-10-btn"));

    fireEvent.click(getByTestId("generate-and-launch-btn"));

    await waitFor(() => expect(onLaunch).toHaveBeenCalled());

    expect(musicProvider.themeQueries).toHaveBeenCalledWith({
      id: "custom",
      custom: true,
      text: "Queen",
      years: [1980, 1989],
      genres: ["rock"],
      terms: "Queen 80s Rock",
    });
  });

  it("should treat a single year and a decade as one criterion, and a preset as replacing the whole form", () => {
    const utils = setup();
    const { getByTestId } = utils;

    fillIdentity(utils);
    fireEvent.change(getByTestId("custom-period-select"), { target: { value: "80s" } });
    fireEvent.change(getByTestId("custom-year-select"), { target: { value: "1985" } });

    expect(getByTestId("custom-period-select").value).toBe("");
    expect(getByTestId("custom-year-select").value).toBe("1985");

    fireEvent.change(getByTestId("custom-period-select"), { target: { value: "90s" } });

    expect(getByTestId("custom-year-select").value).toBe("");

    fireEvent.click(getByTestId("select-theme-disney-btn"));

    expect(getByTestId("custom-period-select").value).toBe("");
    expect(getByTestId("select-theme-disney-btn").getAttribute("aria-pressed")).toBe("true");

    fireEvent.change(getByTestId("custom-genre-select"), { target: { value: "pop" } });

    expect(getByTestId("select-theme-disney-btn").getAttribute("aria-pressed")).toBe("false");
  });

  it("should favor the provider's editorial playlist tracks when it has some", async () => {
    const utils = setup({ candidateCount: 0 });
    const { getByTestId, musicProvider, onLaunch } = utils;

    musicProvider.getEditorialTracks = jest
      .fn()
      .mockResolvedValue(makeTracks(20, "-editorial"));

    fillIdentity(utils);
    fireEvent.click(getByTestId("select-theme-80s-btn"));
    fireEvent.click(getByTestId("select-count-10-btn"));

    fireEvent.click(getByTestId("generate-and-launch-btn"));

    await waitFor(() => expect(onLaunch).toHaveBeenCalled());

    expect(musicProvider.getEditorialTracks).toHaveBeenCalledWith("80s hits");
    // 20 editorial tracks already fill the 2x-count pool: no search needed.
    expect(musicProvider.search).not.toHaveBeenCalled();

    const [{ tracks }] = onLaunch.mock.calls[0];
    tracks.forEach(({ track, editorial }) => {
      expect(track.uri).toMatch(/-editorial$/);
      expect(editorial).toBe(true);
    });
  });

  it("should show an error and not launch when there aren't enough unique tracks for the requested count", async () => {
    const utils = setup({ candidateCount: 3 });
    const { getByTestId, findByText, onLaunch } = utils;

    fillIdentity(utils);
    fireEvent.click(getByTestId("select-theme-80s-btn"));
    fireEvent.click(getByTestId("select-count-10-btn"));

    fireEvent.click(getByTestId("generate-and-launch-btn"));

    await findByText(/Not enough tracks/);

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

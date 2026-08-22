import React from "react";
import {
  createEvent,
  render,
  act,
  fireEvent,
  screen,
} from "@testing-library/react";
import { CreateOrSelectPlaylist } from "./CreateOrSelectPlaylist";
import { useMusicProvider } from "../../../contexts/MusicProvider";

jest.mock("../../../contexts/MusicProvider");

describe("<CreateOrSelectPlaylist />", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create and define a playlistId on user input", async () => {
    const setPlaylistId = jest.fn();
    const setCurrentPlaylist = jest.fn();
    const createPlaylist = jest.fn().mockResolvedValue({ id: "playlistId" });
    const getPlaylists = jest.fn().mockResolvedValue([]);
    const setTitle = jest.fn();
    useMusicProvider.mockReturnValue({
      createPlaylist,
      setCurrentPlaylist,
      getPlaylists,
    });
    const { getByTestId, container } = render(
      <CreateOrSelectPlaylist
        onSelectPlaylist={setPlaylistId}
        isAuthenticated={true}
        setTitle={setTitle}
      />
    );

    fireEvent.click(getByTestId("open-create-playlist-btn"));

    const sessionNameInput = container.querySelector("input");
    const changeEvent = createEvent.change(sessionNameInput, {
      target: { value: "sessionName" },
    });

    await act(async () => {
      fireEvent(sessionNameInput, changeEvent);
      fireEvent.click(getByTestId("create-playlist-btn"));
    });

    expect(createPlaylist).toHaveBeenCalledWith("sessionName");
    expect(setPlaylistId).toHaveBeenCalledWith("playlistId");
    expect(sessionNameInput).toHaveValue("");
  });

  it("should display the playlist selected in the list of user playlists", async () => {
    const setPlaylistId = jest.fn();
    const setCurrentPlaylist = jest.fn();
    const createPlaylist = jest.fn().mockResolvedValue({ id: "playlistId" });
    const getPlaylists = jest.fn().mockResolvedValue([
      { id: "playlistId", name: "selectedPlaylist" },
      { id: "234567890", name: "notSelectedPlaylist" },
    ]);
    const setTitle = jest.fn();
    useMusicProvider.mockReturnValue({
      createPlaylist,
      setCurrentPlaylist,
      getPlaylists,
    });
    const { getByTestId, container } = render(
      <CreateOrSelectPlaylist
        onSelectPlaylist={setPlaylistId}
        isAuthenticated={true}
        setTitle={setTitle}
      />
    );

    await act(async () => {
      await process.nextTick(() => {});
    });

    expect(getByTestId("selected-playlist")).toBeTruthy();
    expect(
      container.querySelectorAll(".playlists-container button").length
    ).toEqual(2); // "+ Create a playlist" + notSelectedPlaylist
  });

  it("should display the playlists returned by the provider", async () => {
    const setPlaylistId = jest.fn();
    const setCurrentPlaylist = jest.fn();
    const createPlaylist = jest.fn().mockResolvedValue({ id: "playlistId" });
    const getPlaylists = jest.fn().mockResolvedValue([
      { id: "playlistId", name: "Playlist1" },
      { id: "234567890", name: "Playlist2" },
    ]);
    const setTitle = jest.fn();
    useMusicProvider.mockReturnValue({
      createPlaylist,
      setCurrentPlaylist,
      getPlaylists,
    });

    render(
      <CreateOrSelectPlaylist
        onSelectPlaylist={setPlaylistId}
        isAuthenticated={true}
        setTitle={setTitle}
      />
    );

    await act(async () => {
      await process.nextTick(() => {});
    });

    expect(screen.getByText("Playlist1")).toBeTruthy();
    expect(screen.getByText("Playlist2")).toBeTruthy();
  });

  it("should keep a newly created playlist visible even if the provider's list doesn't include it yet", async () => {
    const setPlaylistId = jest.fn();
    const setCurrentPlaylist = jest.fn();
    const createPlaylist = jest.fn().mockResolvedValue({ id: "newId" });
    // Simulates Apple Music's eventual consistency: the library listing
    // endpoint doesn't yet reflect a playlist that was just created.
    const getPlaylists = jest.fn().mockResolvedValue([
      { id: "234567890", name: "existingPlaylist" },
    ]);
    const setTitle = jest.fn();
    useMusicProvider.mockReturnValue({
      createPlaylist,
      setCurrentPlaylist,
      getPlaylists,
    });

    const { getByTestId, container } = render(
      <CreateOrSelectPlaylist
        onSelectPlaylist={setPlaylistId}
        isAuthenticated={true}
        setTitle={setTitle}
      />
    );

    await act(async () => {
      await process.nextTick(() => {});
    });

    fireEvent.click(getByTestId("open-create-playlist-btn"));

    const sessionNameInput = container.querySelector("input");
    fireEvent(
      sessionNameInput,
      createEvent.change(sessionNameInput, {
        target: { value: "newPlaylistName" },
      })
    );

    await act(async () => {
      fireEvent.click(getByTestId("create-playlist-btn"));
    });

    expect(getByTestId("selected-playlist")).toHaveTextContent(
      "newPlaylistName"
    );
  });

  it("should define the playlistId on user selection", async () => {
    const setPlaylistId = jest.fn();
    const setCurrentPlaylist = jest.fn();
    const createPlaylist = jest.fn().mockResolvedValue({ id: "playlistId" });
    const getPlaylists = jest.fn().mockResolvedValue([
      { id: "playlistId", name: "Playlist1" },
      { id: "234567890", name: "Playlist2" },
    ]);
    const setTitle = jest.fn();
    useMusicProvider.mockReturnValue({
      createPlaylist,
      setCurrentPlaylist,
      getPlaylists,
    });

    await act(async () => {
      render(
        <CreateOrSelectPlaylist
          onSelectPlaylist={setPlaylistId}
          isAuthenticated={true}
          setTitle={setTitle}
        />
      );
    });

    await Promise.resolve();

    await act(async () => {
      fireEvent.click(screen.getByText("Playlist1"));
    });

    expect(setPlaylistId).toHaveBeenCalledWith("playlistId");
    expect(setCurrentPlaylist).toHaveBeenCalledWith("playlistId");
  });
});

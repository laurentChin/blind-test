import React from "react";
import { createEvent, render, act, fireEvent } from "@testing-library/react";
import { CreateOrSelectPlaylist } from "./CreateOrSelectPlaylist";
import { SpotifyContext } from "../../../contexts/Spotify";

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
    const { getByTestId, container } = render(
      <SpotifyContext.Provider
        value={{ createPlaylist, setCurrentPlaylist, getPlaylists }}
      >
        <CreateOrSelectPlaylist
          setPlaylistId={setPlaylistId}
          isAuthenticated={true}
          playlistId={""}
          setTitle={setTitle}
        />
      </SpotifyContext.Provider>
    );

    const sessionNameInput = container.querySelector("input");
    const changeEvent = createEvent.change(sessionNameInput, {
      target: { value: "sessionName" },
    });

    await act(async () => {
      fireEvent(sessionNameInput, changeEvent);
      await process.nextTick(() => {});
      fireEvent.click(getByTestId("create-playlist-btn"));
      await process.nextTick(() => {});
      expect(createPlaylist).toHaveBeenCalledWith("sessionName");
      expect(setPlaylistId).toHaveBeenCalledWith("playlistId");
    });
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
    const { getByTestId, container } = render(
      <SpotifyContext.Provider
        value={{ createPlaylist, setCurrentPlaylist, getPlaylists }}
      >
        <CreateOrSelectPlaylist
          setPlaylistId={setPlaylistId}
          isAuthenticated={true}
          playlistId={"playlistId"}
          setTitle={setTitle}
        />
      </SpotifyContext.Provider>
    );

    await act(async () => {
      await process.nextTick(() => {});
      expect(getByTestId("selected-playlist")).toBeTruthy();
      expect(
        container.querySelectorAll(".Select-Playlist button").length
      ).toEqual(1);
    });
  });

  it("should display the playlist selected in the list of user playlists", async () => {
    const setPlaylistId = jest.fn();
    const setCurrentPlaylist = jest.fn();
    const createPlaylist = jest.fn().mockResolvedValue({ id: "playlistId" });
    const getPlaylists = jest.fn().mockResolvedValue([
      { id: "playlistId", name: "Playlist1" },
      { id: "234567890", name: "Playlist2" },
    ]);
    const setTitle = jest.fn();

    const { getByText } = render(
      <SpotifyContext.Provider
        value={{ createPlaylist, setCurrentPlaylist, getPlaylists }}
      >
        <CreateOrSelectPlaylist
          setPlaylistId={setPlaylistId}
          isAuthenticated={true}
          playlistId={""}
          setTitle={setTitle}
        />
      </SpotifyContext.Provider>
    );

    await act(async () => {
      await process.nextTick(() => {});
      expect(getByText("Playlist1")).toBeTruthy();
      expect(getByText("Playlist2")).toBeTruthy();
    });
  });

  it("should define the playlistId on user selection", async () => {
    let playlistId = "";
    const setPlaylistId = jest.fn((id) => (playlistId = id));
    const setCurrentPlaylist = jest.fn();
    const createPlaylist = jest.fn().mockResolvedValue({ id: "playlistId" });
    const getPlaylists = jest.fn().mockResolvedValue([
      { id: "playlistId", name: "Playlist1" },
      { id: "234567890", name: "Playlist2" },
    ]);
    const setTitle = jest.fn();

    const { getByText, rerender } = render(
      <SpotifyContext.Provider
        value={{ createPlaylist, setCurrentPlaylist, getPlaylists }}
      >
        <CreateOrSelectPlaylist
          setPlaylistId={setPlaylistId}
          isAuthenticated={true}
          playlistId={playlistId}
          setTitle={setTitle}
        />
      </SpotifyContext.Provider>
    );

    await act(async () => {
      await process.nextTick(() => {});
      fireEvent.click(getByText("Playlist1"));
      await process.nextTick(() => {});
    });

    rerender(
      <SpotifyContext.Provider
        value={{ createPlaylist, setCurrentPlaylist, getPlaylists }}
      >
        <CreateOrSelectPlaylist
          setPlaylistId={setPlaylistId}
          isAuthenticated={true}
          playlistId={playlistId}
          setTitle={setTitle}
        />
      </SpotifyContext.Provider>
    );

    await act(async () => {
      expect(setPlaylistId).toHaveBeenCalledWith("playlistId");
      expect(setCurrentPlaylist).toHaveBeenCalledWith("playlistId");
    });
  });
});

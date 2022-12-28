import React from "react";
import { render, act, fireEvent, screen } from "@testing-library/react";
import { SpotifyContext } from "../../../contexts/Spotify";
import { ManageTracks } from "./ManageTracks";

describe("<ManageTracks />", () => {
  it("should display a list of tracks", async () => {
    const getTracks = jest.fn().mockResolvedValue([
      { name: "track1", id: "01" },
      { name: "track2", id: "02" },
      { name: "track3", id: "03" },
    ]);
    const removeTracks = jest.fn().mockResolvedValue([]);

    await act(async () => {
      render(
        <SpotifyContext.Provider value={{ getTracks, removeTracks }}>
          <ManageTracks playlistId={"12345678"} />
        </SpotifyContext.Provider>
      );
    });

    expect(getTracks).toHaveBeenCalled();
    expect(screen.getByText("track1")).toBeTruthy();
    expect(screen.getByText("track2")).toBeTruthy();
    expect(screen.getByText("track3")).toBeTruthy();
  });

  it("should trigger removeTrack on track deletion", async () => {
    const getTracks = jest.fn().mockResolvedValue([
      { name: "track1", id: "01", uri: "01-track1" },
      { name: "track2", id: "02", uri: "02-track2" },
      { name: "track3", id: "03", uri: "03-track3" },
    ]);
    const removeTrack = jest.fn().mockResolvedValue({});
    await act(async () => {
      render(
        <SpotifyContext.Provider value={{ getTracks, removeTrack }}>
          <ManageTracks playlistId={"12345678"} />
        </SpotifyContext.Provider>
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-01-track1-btn"));
    });

    expect(removeTrack).toHaveBeenCalledWith("01-track1");
    expect(getTracks).toHaveBeenCalledTimes(2);
  });
});

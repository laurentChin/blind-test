import React from "react";
import { render, act, fireEvent, screen } from "@testing-library/react";
import { useMusicProvider } from "../../../contexts/MusicProvider";
import { ManageTracks } from "./ManageTracks";

jest.mock("../../../contexts/MusicProvider");

describe("<ManageTracks />", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should display a list of tracks", async () => {
    const getTracks = jest.fn().mockResolvedValue([
      { name: "track1", id: "01" },
      { name: "track2", id: "02" },
      { name: "track3", id: "03" },
    ]);
    const removeTracks = jest.fn().mockResolvedValue([]);
    useMusicProvider.mockReturnValue({ getTracks, removeTracks });

    await act(async () => {
      render(<ManageTracks playlistId={"12345678"} />);
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
    useMusicProvider.mockReturnValue({ getTracks, removeTrack });

    await act(async () => {
      render(<ManageTracks playlistId={"12345678"} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-01-track1-btn"));
    });

    expect(removeTrack).toHaveBeenCalledWith("01-track1");
    expect(getTracks).toHaveBeenCalledTimes(2);
  });
});

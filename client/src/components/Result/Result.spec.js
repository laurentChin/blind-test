import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { Result } from "./Result";

import { useMusicProvider } from "../../contexts/MusicProvider";

jest.mock("../../contexts/MusicProvider");

describe("<Result />", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should use the props passed", () => {
    useMusicProvider.mockReturnValue({});
    const artists = [{ name: "artist1" }, { name: "artist2" }];
    const uri = "a:uri:1234567";
    const name = "name";
    const addTrackCallback = jest.fn();
    const { getByText, container } = render(
      <Result
        id={"track-id"}
        artists={artists}
        uri={uri}
        name={name}
        addTrackCallback={addTrackCallback}
      />
    );

    expect(getByText(/artist1, artist2/)).toBeTruthy();
    expect(getByText(/name/)).toBeTruthy();
    expect(container.querySelector("audio")).toBeFalsy();
  });

  it('should trigger addTrackCallback with the track data on "Add" button click', async () => {
    const addTrackCallback = jest.fn();
    const addTrack = jest.fn().mockResolvedValue({ body: {} });
    useMusicProvider.mockReturnValue({ addTrack });
    const uri = "a:uri:1234567";
    const artists = [{ name: "artist1" }, { name: "artist2" }];
    const { getByText } = render(
      <Result
        id={"track-id"}
        artists={artists}
        uri={uri}
        name={"name"}
        preview={"https://aaaa"}
        addTrackCallback={addTrackCallback}
      />
    );

    fireEvent.click(getByText("Add"));

    expect(addTrack).toHaveBeenCalledWith(uri);

    // Wait for the loading state to settle so the addTrack().then() chain
    // (and the state update it triggers) has fully resolved before asserting.
    await waitFor(() => expect(getByText("Add")).toHaveClass("btn-loading-done"));

    // Passed back explicitly rather than relying on a refetch: some
    // providers don't reflect a just-added track on their own read
    // endpoint immediately.
    expect(addTrackCallback).toHaveBeenCalledWith({
      id: "track-id",
      uri,
      name: "name",
      artists,
      preview_url: "https://aaaa",
    });
  });

  it("should call onTogglePreview when the play/pause button is clicked", () => {
    useMusicProvider.mockReturnValue({});
    const onTogglePreview = jest.fn();
    const { getByLabelText } = render(
      <Result
        id={"track-id"}
        artists={[{ name: "artist1" }, { name: "artist2" }]}
        uri={"a:uri:1234567"}
        name={"name"}
        preview={"https://aaaa"}
        addTrackCallback={jest.fn()}
        isPlaying={false}
        onTogglePreview={onTogglePreview}
      />
    );

    fireEvent.click(getByLabelText("Play preview of name"));

    expect(onTogglePreview).toHaveBeenCalled();
  });

  it("should pause its audio element whenever isPlaying turns false (e.g. another preview started)", () => {
    useMusicProvider.mockReturnValue({});
    const { container, rerender } = render(
      <Result
        id={"track-id"}
        artists={[{ name: "artist1" }, { name: "artist2" }]}
        uri={"a:uri:1234567"}
        name={"name"}
        preview={"https://aaaa"}
        addTrackCallback={jest.fn()}
        isPlaying={true}
        onTogglePreview={jest.fn()}
      />
    );

    const audio = container.querySelector("audio");
    const pauseSpy = jest.spyOn(audio, "pause").mockImplementation(() => {});
    jest.spyOn(audio, "play").mockImplementation(() => {});

    rerender(
      <Result
        id={"track-id"}
        artists={[{ name: "artist1" }, { name: "artist2" }]}
        uri={"a:uri:1234567"}
        name={"name"}
        preview={"https://aaaa"}
        addTrackCallback={jest.fn()}
        isPlaying={false}
        onTogglePreview={jest.fn()}
      />
    );

    expect(pauseSpy).toHaveBeenCalled();
  });

  it("should stop the preview when adding a track that was playing", async () => {
    const addTrackCallback = jest.fn();
    const addTrack = jest.fn().mockResolvedValue({ body: {} });
    useMusicProvider.mockReturnValue({ addTrack });
    const onTogglePreview = jest.fn();
    const uri = "a:uri:1234567";
    const { getByText } = render(
      <Result
        id={"track-id"}
        artists={[{ name: "artist1" }, { name: "artist2" }]}
        uri={uri}
        name={"name"}
        preview={"https://aaaa"}
        addTrackCallback={addTrackCallback}
        isPlaying={true}
        onTogglePreview={onTogglePreview}
      />
    );

    fireEvent.click(getByText("Add"));

    expect(onTogglePreview).toHaveBeenCalled();
    expect(addTrack).toHaveBeenCalledWith(uri);

    // Wait for the addTrack().then() chain to fully resolve before the test
    // (and its automatic unmount) ends, so the resulting state update isn't
    // left dangling outside of act().
    await waitFor(() => expect(getByText("Add")).toHaveClass("btn-loading-done"));
  });

  it("should display an audio tag if preview is given in props", async () => {
    useMusicProvider.mockReturnValue({});
    const addTrackCallback = jest.fn();
    const { container } = render(
      <Result
        id={"track-id"}
        artists={[{ name: "artist1" }, { name: "artist2" }]}
        uri={"a:uri:1234567"}
        name={"name"}
        preview={"https://aaaa"}
        addTrackCallback={addTrackCallback}
      />
    );

    expect(container.querySelector("audio")).toBeTruthy();
  });
});

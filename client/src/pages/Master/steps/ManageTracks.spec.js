import React from "react";
import {
  render,
  act,
  fireEvent,
  createEvent,
  screen,
  within,
} from "@testing-library/react";
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
    useMusicProvider.mockReturnValue({ getTracks });

    await act(async () => {
      render(<ManageTracks playlistId={"12345678"} />);
    });

    expect(getTracks).toHaveBeenCalled();
    expect(screen.getByText("track1")).toBeTruthy();
    expect(screen.getByText("track2")).toBeTruthy();
    expect(screen.getByText("track3")).toBeTruthy();
  });

  it("should show the artist name in brackets after the title, in bold", async () => {
    const getTracks = jest.fn().mockResolvedValue([
      {
        name: "track1",
        id: "01",
        uri: "01-track1",
        artists: [{ name: "artist1" }, { name: "artist2" }],
      },
    ]);
    useMusicProvider.mockReturnValue({ getTracks });

    const { container, getByText } = await act(async () =>
      render(<ManageTracks playlistId={"12345678"} />)
    );

    const title = getByText("track1");
    expect(title.tagName).toBe("STRONG");
    expect(container.querySelector(".track-name").textContent).toBe(
      "track1 [artist1, artist2]"
    );
  });

  it("should render every track even when the same song appears more than once (shared id/uri)", async () => {
    const getTracks = jest.fn().mockResolvedValue([
      { name: "track1", id: "01", uri: "01-track1" },
      { name: "dup", id: "02", uri: "02-dup" },
      { name: "dup", id: "02", uri: "02-dup" },
    ]);
    useMusicProvider.mockReturnValue({ getTracks });

    const { container } = await act(async () =>
      render(<ManageTracks playlistId={"12345678"} />)
    );

    // Provider APIs reuse the same song/catalog id for every occurrence of
    // a repeated song in a playlist — keying rows by that id would collide
    // and silently drop the duplicates.
    expect(container.querySelectorAll(".track").length).toBe(3);
    expect(screen.getAllByText("dup").length).toBe(2);
  });

  it("should report the track list to onTracksChange", async () => {
    const tracks = [
      { name: "track1", id: "01" },
      { name: "track2", id: "02" },
    ];
    const getTracks = jest.fn().mockResolvedValue(tracks);
    useMusicProvider.mockReturnValue({ getTracks });
    const onTracksChange = jest.fn();

    await act(async () => {
      render(
        <ManageTracks playlistId={"12345678"} onTracksChange={onTracksChange} />
      );
    });

    expect(onTracksChange).toHaveBeenCalledWith(tracks);
  });

  it("should show a newly added track once the search dialog's add flow completes, without refetching", async () => {
    const getTracks = jest
      .fn()
      .mockResolvedValue([{ name: "track1", id: "01", uri: "01-track1" }]);
    const search = jest.fn().mockResolvedValue({
      items: [
        {
          id: "02",
          uri: "02-newTrack",
          name: "newTrack",
          artists: [{ name: "artist" }],
        },
      ],
    });
    const addTrack = jest.fn().mockResolvedValue({});
    useMusicProvider.mockReturnValue({ getTracks, search, addTrack });

    await act(async () => {
      render(<ManageTracks playlistId={"12345678"} />);
    });

    fireEvent.click(screen.getByText("Add"));

    const searchInput = screen.getByPlaceholderText(
      "Search a title, or an artist"
    );

    await act(async () => {
      fireEvent(
        searchInput,
        createEvent.change(searchInput, { target: { value: "new" } })
      );
    });

    const resultRow = screen.getByText(/newTrack/).closest("li");

    await act(async () => {
      fireEvent.click(within(resultRow).getByText("Add"));
    });

    // Only the initial load fetches — the added track is appended locally
    // from the search result data instead of via a refetch, since some
    // providers (Apple Music) don't reflect it immediately on their own
    // read endpoint.
    expect(getTracks).toHaveBeenCalledTimes(1);
    expect(screen.getByText("track1")).toBeTruthy();
    expect(screen.getByText("newTrack")).toBeTruthy();
  });

  it("should arm the delete button on first click without removing the track", async () => {
    const getTracks = jest.fn().mockResolvedValue([
      { name: "track1", id: "01", uri: "01-track1" },
    ]);
    const removeTrack = jest.fn().mockResolvedValue({});
    useMusicProvider.mockReturnValue({ getTracks, removeTrack });

    await act(async () => {
      render(<ManageTracks playlistId={"12345678"} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-01-track1-0-btn"));
    });

    expect(removeTrack).not.toHaveBeenCalled();
    expect(screen.getByText("Click again to confirm")).toBeTruthy();
  });

  it("should trigger removeTrack on the confirming second click", async () => {
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
      fireEvent.click(screen.getByTestId("delete-01-track1-0-btn"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-01-track1-0-btn"));
    });

    expect(removeTrack).toHaveBeenCalledWith({
      name: "track1",
      id: "01",
      uri: "01-track1",
    });
    expect(getTracks).toHaveBeenCalledTimes(2);
  });

  it("should report loading start and end around fetching tracks", async () => {
    const tracks = [{ name: "track1", id: "01" }];
    const getTracks = jest.fn().mockResolvedValue(tracks);
    useMusicProvider.mockReturnValue({ getTracks });
    const onLoadingChange = jest.fn();

    await act(async () => {
      render(
        <ManageTracks
          playlistId={"12345678"}
          onLoadingChange={onLoadingChange}
        />
      );
    });

    expect(onLoadingChange.mock.calls).toEqual([[true], [false]]);
  });

  it("should reorder tracks via the move up/down buttons", async () => {
    const getTracks = jest.fn().mockResolvedValue([
      { name: "track1", id: "01", uri: "01-track1" },
      { name: "track2", id: "02", uri: "02-track2" },
    ]);
    const reorderTrack = jest.fn().mockResolvedValue({});
    useMusicProvider.mockReturnValue({ getTracks, reorderTrack });

    await act(async () => {
      render(<ManageTracks playlistId={"12345678"} />);
    });

    expect(screen.getByLabelText("Move track1 up")).toBeDisabled();
    expect(screen.getByLabelText("Move track2 down")).toBeDisabled();

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Move track2 up"));
    });

    expect(reorderTrack).toHaveBeenCalledWith(1, 0);
    expect(getTracks).toHaveBeenCalledTimes(2);
  });

  it("should show an empty placeholder row where a dragged track would land, and reorder on drop", async () => {
    const getTracks = jest.fn().mockResolvedValue([
      { name: "track1", id: "01", uri: "01-track1" },
      { name: "track2", id: "02", uri: "02-track2" },
      { name: "track3", id: "03", uri: "03-track3" },
    ]);
    const reorderTrack = jest.fn().mockResolvedValue({});
    useMusicProvider.mockReturnValue({ getTracks, reorderTrack });

    const { container, getByText } = await act(async () =>
      render(<ManageTracks playlistId={"12345678"} />)
    );

    const rowLabels = () =>
      Array.from(container.querySelectorAll(".track-list > li")).map((li) =>
        li.classList.contains("track-placeholder")
          ? "placeholder"
          : li.querySelector(".track-name strong").textContent
      );

    expect(rowLabels()).toEqual(["track1", "track2", "track3"]);

    const track3Row = getByText("track3").closest("li");
    const track2Row = getByText("track2").closest("li");
    jest
      .spyOn(track2Row, "getBoundingClientRect")
      .mockReturnValue({ top: 0, height: 40 });

    await act(async () => {
      fireEvent.dragStart(track3Row);
      // Hiding the dragged row is deferred (see ManageTracks.jsx) so the
      // browser can capture its drag ghost first; flush that here.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Dragging track3 over the top half of track2 should open a gap
    // between track1 and track2 — track3's own row disappears while
    // dragging (its native drag ghost follows the cursor instead).
    fireEvent.dragOver(track2Row, { clientY: 5 });

    expect(rowLabels()).toEqual(["track1", "placeholder", "track2"]);

    await act(async () => {
      fireEvent.drop(track2Row);
    });

    expect(reorderTrack).toHaveBeenCalledWith(2, 1);
  });

  it("should keep the dragged row as the same DOM node while it's shown as a placeholder", async () => {
    const getTracks = jest.fn().mockResolvedValue([
      { name: "track1", id: "01", uri: "01-track1" },
      { name: "track2", id: "02", uri: "02-track2" },
      { name: "track3", id: "03", uri: "03-track3" },
    ]);
    useMusicProvider.mockReturnValue({ getTracks });

    const { container, getByText } = await act(async () =>
      render(<ManageTracks playlistId={"12345678"} />)
    );

    const track3Row = getByText("track3").closest("li");

    await act(async () => {
      fireEvent.dragStart(track3Row);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Real browsers stop tracking a drag whose source node gets detached
    // from the document, so turning the dragged row into a placeholder
    // must reuse the same <li> rather than unmount it for a new one.
    const placeholderRow = container.querySelector(".track-placeholder");
    expect(placeholderRow).toBe(track3Row);
  });

  it("should restore the dragged row when the drag ends without a drop (e.g. dropped outside the list)", async () => {
    const getTracks = jest.fn().mockResolvedValue([
      { name: "track1", id: "01", uri: "01-track1" },
      { name: "track2", id: "02", uri: "02-track2" },
      { name: "track3", id: "03", uri: "03-track3" },
    ]);
    useMusicProvider.mockReturnValue({ getTracks });

    const { container, getByText } = await act(async () =>
      render(<ManageTracks playlistId={"12345678"} />)
    );

    const track3Row = getByText("track3").closest("li");

    await act(async () => {
      fireEvent.dragStart(track3Row);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.querySelector(".track-placeholder")).toBeTruthy();

    await act(async () => {
      fireEvent.dragEnd(track3Row);
    });

    expect(container.querySelector(".track-placeholder")).toBeFalsy();
    expect(getByText("track3")).toBeTruthy();
  });
});

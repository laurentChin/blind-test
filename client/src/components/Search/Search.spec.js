import React from "react";
import { render, fireEvent, createEvent, act } from "@testing-library/react";
import { Search } from "./Search";
import { useMusicProvider } from "../../contexts/MusicProvider";

jest.mock("../../contexts/MusicProvider");

describe("<Search />", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should display a list of results", async () => {
    const mockSearch = jest.fn();
    mockSearch.mockResolvedValue({
      items: [
        {
          id: "12345",
          uri: "aaaa:bbbb:cccc",
          name: "name1",
          artists: [{ name: "artist1" }],
        },
        {
          ud: "67890",
          uri: "dddd:eeee:fffff",
          name: "name2",
          artists: [{ name: "artist2" }, { name: "artist3" }],
        },
        {
          id: "toexclude",
          uri: "ddd:sss:hhhhhh",
          name: "name3",
          artists: [{ name: "artist1" }],
        },
      ],
    });
    useMusicProvider.mockReturnValue({ search: mockSearch });

    const { getByText, queryByText, container } = render(
      <Search
        addTrackCallback={jest.fn()}
        excludedTracks={[{ id: "toexclude" }]}
      />
    );
    const searchInput = container.querySelector("input");
    const changeEvent = createEvent.change(searchInput, {
      target: { value: "qqqq" },
    });

    await act(async () => {
      fireEvent(searchInput, changeEvent);
    });

    expect(getByText(/name1/)).toBeTruthy();
    expect(getByText(/name2/)).toBeTruthy();
    expect(queryByText(/name3/)).toBeFalsy();
  });

  it("should only allow one preview to play at a time", async () => {
    const mockSearch = jest.fn().mockResolvedValue({
      items: [
        {
          id: "1",
          uri: "aaaa:bbbb:cccc",
          name: "name1",
          artists: [{ name: "artist1" }],
          preview_url: "https://preview1",
        },
        {
          id: "2",
          uri: "dddd:eeee:ffff",
          name: "name2",
          artists: [{ name: "artist2" }],
          preview_url: "https://preview2",
        },
      ],
    });
    useMusicProvider.mockReturnValue({ search: mockSearch });

    const { getByLabelText, container } = render(
      <Search addTrackCallback={jest.fn()} excludedTracks={[]} />
    );
    const searchInput = container.querySelector("input");

    await act(async () => {
      fireEvent(
        searchInput,
        createEvent.change(searchInput, { target: { value: "qqqq" } })
      );
    });

    container.querySelectorAll("audio").forEach((audio) => {
      jest.spyOn(audio, "play").mockImplementation(() => {});
      jest.spyOn(audio, "pause").mockImplementation(() => {});
    });

    fireEvent.click(getByLabelText("Play preview of name1"));
    expect(getByLabelText("Pause preview of name1")).toBeTruthy();
    expect(getByLabelText("Play preview of name2")).toBeTruthy();

    fireEvent.click(getByLabelText("Play preview of name2"));
    expect(getByLabelText("Pause preview of name2")).toBeTruthy();
    expect(getByLabelText("Play preview of name1")).toBeTruthy();
  });

  it("should reset the search once a track has been added", async () => {
    const mockSearch = jest.fn().mockResolvedValue({
      items: [
        {
          id: "1",
          uri: "aaaa:bbbb:cccc",
          name: "name1",
          artists: [{ name: "artist1" }],
        },
      ],
    });
    const addTrack = jest.fn().mockResolvedValue({});
    const addTrackCallback = jest.fn();
    useMusicProvider.mockReturnValue({ search: mockSearch, addTrack });

    const { getByText, queryByText, container } = render(
      <Search addTrackCallback={addTrackCallback} excludedTracks={[]} />
    );
    const searchInput = container.querySelector("input");

    await act(async () => {
      fireEvent(
        searchInput,
        createEvent.change(searchInput, { target: { value: "qqqq" } })
      );
    });

    expect(getByText(/name1/)).toBeTruthy();

    await act(async () => {
      fireEvent.click(getByText("Add"));
    });

    expect(queryByText(/name1/)).toBeFalsy();
    expect(searchInput).toHaveValue("");
    expect(addTrackCallback).toHaveBeenCalledWith({
      id: "1",
      uri: "aaaa:bbbb:cccc",
      name: "name1",
      artists: [{ name: "artist1" }],
      preview_url: undefined,
    });
  });
});

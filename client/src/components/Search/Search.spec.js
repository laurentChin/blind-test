import React from "react";
import { render, fireEvent, createEvent, act } from "@testing-library/react";
import { Search } from "./Search";
import { SpotifyContext } from "../../contexts/Spotify";

describe("<Search />", () => {
  it("should display a list of results", async () => {
    const mockSearch = jest.fn().mockResolvedValue({
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

    const { getByText, queryByText, container, rerender } = render(
      <SpotifyContext.Provider value={{ search: mockSearch }}>
        <Search
          addTrackCallback={jest.fn()}
          excludedTracks={[{ id: "toexclude" }]}
        />
      </SpotifyContext.Provider>
    );
    const searchInput = container.querySelector("input");
    const changeEvent = createEvent.change(searchInput, {
      target: { value: "qqqq" },
    });

    await act(async () => {
      fireEvent(searchInput, changeEvent);
      await process.nextTick(() => {});
      rerender(
        <SpotifyContext.Provider value={{ search: mockSearch }}>
          <Search
            addTrackCallback={jest.fn()}
            excludedTracks={[{ id: "toexclude" }]}
          />
        </SpotifyContext.Provider>
      );
      expect(getByText(/name1/)).toBeTruthy();
      expect(getByText(/name2/)).toBeTruthy();
      expect(queryByText(/name3/)).toBeFalsy();
    });
  });
});

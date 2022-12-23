import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { Result } from "./Result";

import { SpotifyContext } from "../../contexts/Spotify";

describe("<Result />", () => {
  it("should use the props passed", () => {
    const artists = [{ name: "artist1" }, { name: "artist2" }];
    const uri = "a:uri:1234567";
    const name = "name";
    const addTrackCallback = jest.fn();
    const { getByText, container } = render(
      <Result
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

  it('should trigger addTrackCallback on "Add" button click', async () => {
    const addTrackCallback = jest.fn();
    const addTrack = jest.fn().mockResolvedValue({ body: {} });
    const uri = "a:uri:1234567";
    const { getByText } = render(
      <SpotifyContext.Provider value={{ addTrack }}>
        <Result
          artists={[{ name: "artist1" }, { name: "artist2" }]}
          uri={uri}
          name={"name"}
          addTrackCallback={addTrackCallback}
        />
      </SpotifyContext.Provider>
    );

    fireEvent.click(getByText("Add"));

    expect(addTrack).toHaveBeenCalledWith(uri);

    await process.nextTick(() => {});

    expect(addTrackCallback).toHaveBeenCalled();
  });

  it("should display an audio tag if preview is given in props", async () => {
    const addTrackCallback = jest.fn();
    const { container } = render(
      <Result
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

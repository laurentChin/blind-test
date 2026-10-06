import React from "react";
import { render, within } from "@testing-library/react";

import { TrackListDebug } from "./TrackListDebug";

describe("<TrackListDebug />", () => {
  it("should list every selected track in play order with its source and weight", () => {
    const { getByTestId, getAllByRole } = render(
      <TrackListDebug
        tracks={[
          {
            track: {
              uri: "uri:1",
              name: "Take On Me",
              artists: [{ name: "a-ha" }],
              album: { name: "Hunting High and Low", release_date: "1985-06-01" },
            },
            weight: 1,
            editorial: true,
          },
          {
            track: { uri: "uri:2", name: "Africa", artists: [{ name: "Toto" }] },
            weight: 0.6,
          },
        ]}
      />
    );

    expect(getByTestId("track-list-debug-btn").textContent).toContain("2 tracks");

    const [, firstRow, secondRow] = getAllByRole("row", { hidden: true });
    const cells = (row) =>
      within(row)
        .getAllByRole("cell", { hidden: true })
        .map(({ textContent }) => textContent);

    expect(cells(firstRow)).toEqual([
      "1",
      "Take On Me",
      "a-ha",
      "Hunting High and Low",
      "1985",
      "editorial",
      "1.000",
    ]);
    expect(cells(secondRow)).toEqual(["2", "Africa", "Toto", "", "", "search", "0.600"]);
  });
});

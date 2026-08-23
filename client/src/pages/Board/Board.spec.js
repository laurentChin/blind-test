/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, act, fireEvent } from "@testing-library/react";
import io from "socket.io-client";
import { BrowserRouter as Router } from "react-router-dom";

jest.mock("qrcode");
jest.mock("../../helpers/Giphy", () => ({
  getGif: jest.fn().mockResolvedValue({
    images: { original: { url: "https://example.com/gif.gif" } },
    ratio: 1.5,
  }),
}));

import { Board } from "./Board";

describe("<Board />", () => {
  it("should display the QR code without the join url next to it", () => {
    const { container } = render(
      <Router>
        <Board />
      </Router>
    );

    expect(container.querySelector(".qrcode")).toBeTruthy();
    expect(container.querySelector(".join-url")).toBeFalsy();
  });

  it("should open a dialog with the full join url when the QR code is clicked", () => {
    process.env.REACT_APP_URL = "https://blind-test.example.com";

    const { container, getByLabelText } = render(
      <Router>
        <Board />
      </Router>
    );

    const dialog = container.querySelector(".qrcode-dialog");
    expect(dialog.open).toBeFalsy();

    fireEvent.click(
      getByLabelText("Enlarge the QR code and see the full join URL")
    );

    expect(dialog.open).toBeTruthy();
    expect(container.querySelector(".join-url-full").textContent).toMatch(
      /^https:\/\/blind-test\.example\.com\/session\//
    );
  });

  it("should open the result dialog with the challenger's name/color when they buzz in, then swap to the gif once validated", async () => {
    const { container } = render(
      <Router>
        <Board />
      </Router>
    );

    const resultDialog = container.querySelector(".result-dialog");
    expect(resultDialog.open).toBeFalsy();

    await act(async () => {
      io().emit("challengersUpdate", [
        {
          uuid: "player-1",
          name: "Alice",
          score: 0,
          color: { background: "255, 0, 0", text: "255, 255, 255" },
        },
      ]);
      io().emit("lockChallenge", "player-1");
    });

    expect(resultDialog.open).toBeTruthy();
    expect(container.querySelector(".active-challenger-big").textContent).toBe(
      "Alice"
    );
    expect(container.querySelector(".gif-big")).toBeFalsy();
    // The board only shows the challenger's name in the dialog now, not a
    // second time inline in the challenger list.
    expect(container.querySelector(".active-challenger")).toBeFalsy();

    await act(async () => {
      // Validating an answer releases the challenger (resetting
      // challengerUuid) around the same time as the result comes in.
      io().emit("challengeResult", {
        track: { name: "Hallelujah", artists: "Jeff Buckley" },
        score: 1,
      });
      io().emit("challengerRelease", []);
    });

    expect(resultDialog.open).toBeTruthy();
    expect(container.querySelector(".gif-big").src).toBe(
      "https://example.com/gif.gif"
    );
    expect(container.querySelector(".active-challenger-big")).toBeFalsy();

    await act(async () => {
      io().emit("startNewChallenge");
    });

    expect(resultDialog.open).toBeFalsy();
  });

  it("should display the track info inside the result dialog in case of success", async () => {
    const { container, getByText, queryByText, rerender } = render(
      <Router>
        <Board />
      </Router>
    );

    await act(async () => {
      io().emit("challengeResult", {
        track: { name: "Hallelujah", artists: "Jeff Buckley" },
        score: 1,
      });
    });

    expect(getByText("Hallelujah")).toBeTruthy();
    expect(getByText("Jeff Buckley")).toBeTruthy();
    expect(container.querySelector(".result-dialog .track")).toBeTruthy();

    await act(async () => {
      io().emit("challengeResult", {
        track: { name: "Hallelujah", artists: "Jeff Buckley" },
        score: 0,
      });

      rerender(
        <Router>
          <Board />
        </Router>
      );
    });

    expect(queryByText("Hallelujah")).toBeFalsy();
    expect(queryByText("Jeff Buckley")).toBeFalsy();
  });
});

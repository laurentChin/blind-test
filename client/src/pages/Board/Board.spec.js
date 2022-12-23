/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, act } from "@testing-library/react";
import io from "socket.io-client";
import { BrowserRouter as Router } from "react-router-dom";

jest.mock("qrcode");

import { Board } from "./Board";

describe("<Board />", () => {
  it("should display the track info in case of success active challengers", async () => {
    const { getByText, queryByText, rerender } = render(
      <Router>
        <Board />
      </Router>
    );

    await act(async () => {
      io().emit("challengeResult", {
        track: { name: "Hallelujah", artists: "Jeff Buckley" },
        score: 1,
      });

      await process.nextTick(() => {});

      expect(getByText("Hallelujah")).toBeTruthy();
      expect(getByText("Jeff Buckley")).toBeTruthy();
    });

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

      await process.nextTick(() => {});

      expect(queryByText("Hallelujah")).toBeFalsy();
      expect(queryByText("Jeff Buckley")).toBeFalsy();
    });
  });
});

import React from "react";
import { createEvent, render, fireEvent, act } from "@testing-library/react";
import { useParams } from "react-router-dom";
import { Session } from "./Session";

const listeners = {};

jest.mock("react-router-dom");
jest.mock("socket.io-client", () => {
  return jest.fn().mockReturnValue({
    emit: (event, data, callback) => {
      switch (event) {
        case "joinWaitingRoom":
          callback({
            challengers: [],
            colors: ["#e6194B", "#f58231"],
          });
          break;
        case "join":
          callback({
            player: { uuid: "player-12345", color: "#f58231" },
            sessionUuid: "session-12345",
          });
          break;
        case "joinAfterRefresh":
          callback({
            challengers: []
          });
          break;
      }
    },
    on: (event, callback) => {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(callback);
    },
  });
});

describe("<Session />", () => {
  beforeEach(() => {
    useParams.mockReturnValue({ uuid: "session-12345" });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Should display the join session form when user is not in a session", async () => {
    const { getByText } = render(<Session />);

    expect(getByText("Join")).toBeInTheDocument();
  });

  it("Should display the play screen when user is in a session", async () => {
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn().mockReturnValue(JSON.stringify({ uuid: "player-12345", color: "#f58231" }))
      }
    })
    const emit = (event, data) => {
      listeners[event]?.forEach((listener) => listener(data));
    };
    const { getByTestId, getAllByTestId } = render(<Session />);

    expect(getByTestId("challenge-button")).toBeInTheDocument();
  });
});

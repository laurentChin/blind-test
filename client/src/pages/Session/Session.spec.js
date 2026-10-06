import React from "react";
import { createEvent, render, fireEvent, act } from "@testing-library/react";
import { useNavigate, useParams } from "react-router-dom";
import { Session } from "./Session";
import { ToastProvider } from "../../components/Toast/Toast";

const listeners = {};
let joinAfterRefreshResponseOverrides = {};
let joinWaitingRoomResponseOverrides = {};
const navigate = jest.fn();

const storePlayer = () =>
  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    value: {
      getItem: jest.fn((key) => ({
        player: JSON.stringify({
          uuid: "player-12345",
          color: { background: "245, 130, 49" },
        }),
        sessionUuid: "session-12345",
      }[key])),
      removeItem: jest.fn(),
      setItem: jest.fn(),
    },
  });

const renderWithToasts = () =>
  render(
    <ToastProvider>
      <Session />
    </ToastProvider>
  );

const emitFromServer = (event, data) =>
  [...(listeners[event] || [])].forEach((listener) => listener(data));

jest.mock("react-router-dom");
jest.mock("socket.io-client", () => {
  return jest.fn().mockReturnValue({
    emit: (event, data, callback) => {
      switch (event) {
        case "joinWaitingRoom":
          callback({
            challengers: [],
            colors: [
              { background: "230, 25, 75" },
              { background: "245, 130, 49" },
            ],
            ...joinWaitingRoomResponseOverrides,
          });
          break;
        case "leave":
          callback();
          break;
        case "join":
          callback({
            player: {
              uuid: "player-12345",
              color: { background: "245, 130, 49" },
            },
            sessionUuid: "session-12345",
          });
          break;
        case "joinAfterRefresh":
          callback({
            challengers: [],
            ...joinAfterRefreshResponseOverrides,
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
    off: (event, callback) => {
      listeners[event] = (listeners[event] || []).filter(
        (listener) => listener !== callback
      );
    },
  });
});

describe("<Session />", () => {
  beforeEach(() => {
    useParams.mockReturnValue({ uuid: "session-12345" });
    useNavigate.mockReturnValue(navigate);
  });

  afterEach(() => {
    jest.clearAllMocks();
    joinAfterRefreshResponseOverrides = {};
    joinWaitingRoomResponseOverrides = {};
    Object.keys(listeners).forEach((event) => delete listeners[event]);
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: {
        getItem: jest.fn(() => null),
        removeItem: jest.fn(),
        setItem: jest.fn(),
      },
    });
  });

  it("Should display the join session form when user is not in a session", async () => {
    const { getByText } = render(<Session />);

    expect(getByText("Join")).toBeInTheDocument();
  });

  it("Should display the play screen when user is in a session", async () => {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: {
        getItem: jest.fn((key) => ({
          player: JSON.stringify({
            uuid: "player-12345",
            color: { background: "245, 130, 49" },
          }),
          sessionUuid: "session-12345",
        }[key])),
        removeItem: jest.fn(),
      },
    });
    const emit = (event, data) => {
      listeners[event]?.forEach((listener) => listener(data));
    };
    const { getByTestId, getAllByTestId } = render(<Session />);

    expect(getByTestId("challenge-button")).toBeInTheDocument();
  });

  it("Should restore an in-progress lock for a reconnecting player instead of showing a blank interactive button", async () => {
    joinAfterRefreshResponseOverrides = { currentChallenger: "player-12345" };
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: {
        getItem: jest.fn((key) => ({
          player: JSON.stringify({
            uuid: "player-12345",
            color: { background: "245, 130, 49" },
          }),
          sessionUuid: "session-12345",
        }[key])),
        removeItem: jest.fn(),
        setItem: jest.fn(),
      },
    });

    const { getByTestId } = render(<Session />);

    expect(getByTestId("challenge-button")).toBeDisabled();
  });

  it("Should reset the stored player and show the join form when the url points to a different session", async () => {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: {
        getItem: jest.fn((key) => ({
          player: JSON.stringify({
            uuid: "player-12345",
            color: { background: "245, 130, 49" },
          }),
          sessionUuid: "a-previous-session",
        }[key])),
        removeItem: jest.fn(),
      },
    });

    const { getByText, queryByTestId } = render(<Session />);

    expect(queryByTestId("challenge-button")).toBeFalsy();
    expect(getByText("Join")).toBeInTheDocument();
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith("player");
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith(
      "sessionUuid"
    );
  });

  describe("going back to the home page", () => {
    it("Should redirect to home when the player leaves the session", async () => {
      storePlayer();
      window.confirm = () => true;

      const { getByTestId, getByRole } = renderWithToasts();

      fireEvent.click(getByTestId("leave-session-button"));

      expect(navigate).toHaveBeenCalledWith("/", { replace: true });
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith("player");
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith(
        "sessionUuid"
      );
      expect(getByRole("status")).toBeEmptyDOMElement();
    });

    it("Should redirect to home when the session is closed while playing", async () => {
      storePlayer();
      const { getByRole } = renderWithToasts();

      act(() => emitFromServer("sessionClosedByMaster"));

      expect(navigate).toHaveBeenCalledWith("/", { replace: true });
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith("player");
      expect(getByRole("status")).toHaveTextContent(
        "The session has been closed."
      );
    });

    it("Should redirect to home when the session is closed while on the join form", async () => {
      const { getByRole } = renderWithToasts();

      act(() => emitFromServer("sessionClosedByMaster"));

      expect(navigate).toHaveBeenCalledWith("/", { replace: true });
      expect(getByRole("status")).toHaveTextContent(
        "The session has been closed."
      );
    });

    it("Should redirect to home when a stored player reconnects to a session that doesn't exist anymore", async () => {
      joinAfterRefreshResponseOverrides = {
        challengers: undefined,
        error: "sessionNotFound",
      };
      storePlayer();

      const { getByRole } = renderWithToasts();

      expect(navigate).toHaveBeenCalledWith("/", { replace: true });
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith("player");
      expect(getByRole("status")).toHaveTextContent(
        "This session no longer exists."
      );
    });

    it("Should redirect to home when opening the join form of a session that doesn't exist", async () => {
      joinWaitingRoomResponseOverrides = { sessionExists: false };

      const { getByRole } = renderWithToasts();

      expect(navigate).toHaveBeenCalledWith("/", { replace: true });
      expect(getByRole("status")).toHaveTextContent(
        "This session no longer exists."
      );
    });

    it("Should stay on the join form when the session exists", async () => {
      joinWaitingRoomResponseOverrides = { sessionExists: true };

      const { getByText } = renderWithToasts();

      expect(getByText("Join")).toBeInTheDocument();
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});

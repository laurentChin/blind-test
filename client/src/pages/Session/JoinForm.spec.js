import React from "react";
import {
  createEvent,
  render,
  fireEvent,
  act,
  prettyDOM,
} from "@testing-library/react";
import { JoinForm } from "./JoinForm";

let mockSocket;

describe("<JoinForm />", () => {
  beforeEach(() => {
    mockSocket = {
      emit: jest.fn((event, _, callback) => {
        switch (event) {
          case "joinWaitingRoom":
            callback({
              challengers: [
                { uuid: "qqqwqq-qeqeq-qeqw", name: "bob", color: "color" },
              ],
              colors: ["#e6194B", "#f58231"],
            });
            break;
          case "join":
            callback({
              player: { uuid: "player-12345", color: "#f58231" },
              sessionUuid: "session-12345",
            });
            break;
        }
      }),
      on: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Should display join button if the user has given a name and picked a color", async () => {
    const onJoin = jest.fn();

    const { getByText, queryByText, container } = render(
      <JoinForm
        socket={mockSocket}
        onJoin={onJoin}
        sessionUuid="525452ee-5863-412f-b6e2-0cf9385c09e6"
      />
    );

    expect(queryByText("Join")).toBeDisabled();

    const nameInput = container.querySelector("input");
    const changeEvent = createEvent.change(nameInput, {
      target: { value: "John" },
    });

    const colorInput = container.querySelector(".color-button");

    await act(async () => {
      fireEvent(nameInput, changeEvent);
      fireEvent.click(colorInput);
    });

    expect(getByText("Join")).not.toBeDisabled();
  });

  it("Should display join button if the user has selected a team", async () => {
    const onJoin = jest.fn();

    const { getByText, queryByText, container } = render(
      <JoinForm
        socket={mockSocket}
        onJoin={onJoin}
        sessionUuid="525452ee-5863-412f-b6e2-0cf9385c09e6"
      />
    );

    expect(queryByText("Join")).toBeDisabled();
    expect(getByText("Join a team")).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(container.querySelector("select"), {
        target: { value: "qqqwqq-qeqeq-qeqw" },
      });
    });

    expect(getByText("Join")).not.toBeDisabled();
  });

  it("Should call the onJoin props when joining a session", async () => {
    const onJoin = jest.fn();

    const { getByText, queryByText, container } = render(
      <JoinForm
        socket={mockSocket}
        onJoin={onJoin}
        sessionUuid="525452ee-5863-412f-b6e2-0cf9385c09e6"
      />
    );

    expect(queryByText("Join")).toBeDisabled();
    const nameInput = container.querySelector("input");
    const changeEvent = createEvent.change(nameInput, {
      target: { value: "James" },
    });

    const colorInput = container.querySelector(".color-button");

    await act(async () => {
      fireEvent(nameInput, changeEvent);
      fireEvent.click(colorInput);
    });

    fireEvent.click(getByText("Join"));
    expect(onJoin).toHaveBeenCalledWith({
      player: {
        color: "#f58231",
        uuid: "player-12345",
      },
      sessionUuid: 'session-12345'
    });
  });
});

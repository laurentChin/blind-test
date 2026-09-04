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
                {
                  uuid: "qqqwqq-qeqeq-qeqw",
                  name: "bob",
                  color: { background: "230, 25, 75", text: "255, 255, 255" },
                },
              ],
              colors: [
                { background: "230, 25, 75", text: "255, 255, 255" },
                { background: "245, 130, 49", text: "0, 0, 0" },
              ],
            });
            break;
          case "join":
            callback({
              player: {
                uuid: "player-12345",
                color: { background: "245, 130, 49", text: "0, 0, 0" },
              },
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

    const nameInput = container.querySelector(
      "[data-testid='player-name-input']"
    );
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

  it("Should default to the solo mode and disable the team option when no player is registered", async () => {
    mockSocket.emit = jest.fn((event, _, callback) => {
      if (event === "joinWaitingRoom") {
        callback({ challengers: [], colors: [] });
      }
    });

    const { getByLabelText } = render(
      <JoinForm
        socket={mockSocket}
        onJoin={jest.fn()}
        sessionUuid="525452ee-5863-412f-b6e2-0cf9385c09e6"
      />
    );

    expect(getByLabelText("Play solo")).toBeChecked();
    expect(getByLabelText("Join a team")).toBeDisabled();
  });

  it("Should isolate the solo and team forms and display join button once a team is selected", async () => {
    const onJoin = jest.fn();

    const { getByText, getByLabelText, queryByText, queryByTestId, container } =
      render(
        <JoinForm
          socket={mockSocket}
          onJoin={onJoin}
          sessionUuid="525452ee-5863-412f-b6e2-0cf9385c09e6"
        />
      );

    expect(queryByText("Join")).toBeDisabled();
    expect(getByLabelText("Play solo")).toBeChecked();
    expect(queryByTestId("player-name-input")).toBeInTheDocument();
    expect(queryByText("Join a team", { selector: "h2" })).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(getByLabelText("Join a team"));
    });

    expect(queryByTestId("player-name-input")).not.toBeInTheDocument();
    expect(getByText("Join a team", { selector: "h2" })).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(container.querySelector("select"), {
        target: { value: "qqqwqq-qeqeq-qeqw" },
      });
    });

    expect(getByText("Join")).not.toBeDisabled();
  });

  it("Should display the list of already-joined players below the form", () => {
    const { getByText } = render(
      <JoinForm
        socket={mockSocket}
        onJoin={jest.fn()}
        sessionUuid="525452ee-5863-412f-b6e2-0cf9385c09e6"
      />
    );

    expect(getByText("bob")).toBeInTheDocument();
  });

  it("Should let the player pick another color when theirs was just taken", async () => {
    mockSocket.emit = jest.fn((event, _, callback) => {
      switch (event) {
        case "joinWaitingRoom":
          callback({
            challengers: [],
            colors: [
              { background: "230, 25, 75", text: "255, 255, 255" },
              { background: "245, 130, 49", text: "0, 0, 0" },
            ],
          });
          break;
        case "join":
          callback({
            error: "colorTaken",
            colors: [{ background: "245, 130, 49", text: "0, 0, 0" }],
          });
          break;
      }
    });

    const onJoin = jest.fn();
    const { getByText, container } = render(
      <JoinForm
        socket={mockSocket}
        onJoin={onJoin}
        sessionUuid="525452ee-5863-412f-b6e2-0cf9385c09e6"
      />
    );

    const nameInput = container.querySelector(
      "[data-testid='player-name-input']"
    );

    await act(async () => {
      fireEvent(
        nameInput,
        createEvent.change(nameInput, { target: { value: "Jane" } })
      );
      fireEvent.click(container.querySelector(".color-button"));
    });

    fireEvent.click(getByText("Join"));

    expect(onJoin).not.toHaveBeenCalled();
    expect(
      getByText("That color was just taken — please pick another one.")
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".color-button")).toHaveLength(1);
    expect(getByText("Join")).toBeDisabled();
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
    const nameInput = container.querySelector(
      "[data-testid='player-name-input']"
    );
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
        color: { background: "245, 130, 49", text: "0, 0, 0" },
        uuid: "player-12345",
      },
      sessionUuid: 'session-12345'
    });
  });
});

import React from "react";
import { act, render, fireEvent } from "@testing-library/react";
import { ChallengerList } from "./ChallengerList";

describe("<ChallengerList />", () => {
  it("should display the list of challengers with theirs name and score sorted by score", async () => {
    const { getByText, queryByText, container } = render(
      <ChallengerList
        challengers={[
          { uuid: "qwewrw-1232553", name: "name1", score: 1 },
          { uuid: "wuefgeew-82687234", name: "name2", score: 3 },
        ]}
      />
    );

    expect(getByText("name1")).toBeTruthy();
    expect(getByText("name2")).toBeTruthy();
    const challengers = container.querySelectorAll(".challenger-ranking li");
    expect(challengers[0].textContent).toEqual("name2 3");
    expect(challengers[1].textContent).toEqual("name1 1");
  });

  it("should display the current active challengers", async () => {
    const { container } = render(
      <ChallengerList
        challengers={[
          {
            uuid: "qwewrw-1232553",
            name: "currentChallenger",
            score: 1,
            color: { background: "1, 2, 3", text: "255, 255, 255" },
          },
          { uuid: "wuefgeew-82687234", name: "name2", score: 3 },
        ]}
        challengerUuid={"qwewrw-1232553"}
      />
    );

    expect(container.querySelector(".active-challenger").textContent).toEqual(
      "currentChallenger"
    );
  });

  it("should not show the active challenger banner when showActiveChallenger is false", () => {
    const { container } = render(
      <ChallengerList
        challengers={[
          { uuid: "qwewrw-1232553", name: "currentChallenger", score: 1 },
        ]}
        challengerUuid={"qwewrw-1232553"}
        showActiveChallenger={false}
      />
    );

    expect(container.querySelector(".active-challenger")).toBeFalsy();
  });

  it("should not show a Clear button when onClearChallenge isn't provided", () => {
    const { queryByText } = render(
      <ChallengerList
        challengers={[
          {
            uuid: "qwewrw-1232553",
            name: "currentChallenger",
            score: 1,
            color: { background: "1, 2, 3", text: "255, 255, 255" },
          },
        ]}
        challengerUuid={"qwewrw-1232553"}
      />
    );

    expect(queryByText("Clear")).toBeFalsy();
  });

  it("should call onClearChallenge when the Clear button is clicked", () => {
    const onClearChallenge = jest.fn();
    const { getByText } = render(
      <ChallengerList
        challengers={[
          {
            uuid: "qwewrw-1232553",
            name: "currentChallenger",
            score: 1,
            color: { background: "1, 2, 3", text: "255, 255, 255" },
          },
        ]}
        challengerUuid={"qwewrw-1232553"}
        onClearChallenge={onClearChallenge}
      />
    );

    fireEvent.click(getByText("Clear"));

    expect(onClearChallenge).toHaveBeenCalled();
  });
});

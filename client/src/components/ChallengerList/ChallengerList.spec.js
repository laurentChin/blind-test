import React from "react";
import { act, render } from "@testing-library/react";
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
    const challengers = container.querySelectorAll(".challenger-list p");
    expect(challengers[0].textContent).toEqual("name2 3");
    expect(challengers[1].textContent).toEqual("name1 1");
  });

  it("should display the current active challengers", async () => {
    const { container } = render(
      <ChallengerList
        challengers={[
          { uuid: "qwewrw-1232553", name: "currentChallenger", score: 1 },
          { uuid: "wuefgeew-82687234", name: "name2", score: 3 },
        ]}
        challengerUuid={"qwewrw-1232553"}
      />
    );

    expect(container.querySelector(".active-challenger").textContent).toEqual(
      "currentChallenger"
    );
  });
});

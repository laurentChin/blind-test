import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { StepsNavigation } from "./StepsNavigation";

import { STEPS, STEPS_LABELS } from "../constants";

describe("<StepsNavigation />", () => {
  it("should call setStep when clicking on next or previous button", () => {
    const setStep = jest.fn();
    const { getByText } = render(
      <StepsNavigation setStep={setStep} currentStep={STEPS.MANAGE_TRACKS} />
    );

    fireEvent.click(getByText(STEPS_LABELS[STEPS.MANAGE_TRACKS.previous]));
    expect(setStep).toHaveBeenCalledWith(STEPS[STEPS.MANAGE_TRACKS.previous]);
    fireEvent.click(getByText(STEPS_LABELS[STEPS.MANAGE_TRACKS.next]));
    expect(setStep).toHaveBeenCalledWith(STEPS[STEPS.MANAGE_TRACKS.next]);
  });

  it("should not display previous button if there is no previous step", () => {
    const setStep = jest.fn();
    const { queryByTestId, getByTestId } = render(
      <StepsNavigation
        setStep={setStep}
        currentStep={STEPS.CREATE_OR_SELECT_PLAYLIST}
      />
    );

    expect(getByTestId("next-step")).toBeTruthy();
    expect(queryByTestId("previous-step")).toBeFalsy();
  });

  it("should not display next button if there is no next step", () => {
    const setStep = jest.fn();
    const { queryByTestId, getByTestId } = render(
      <StepsNavigation setStep={setStep} currentStep={STEPS.MANAGE_SESSION} />
    );

    expect(queryByTestId("next-step")).toBeFalsy();
    expect(getByTestId("previous-step")).toBeTruthy();
  });
});

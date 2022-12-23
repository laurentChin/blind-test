import React from "react";
import PropTypes from "prop-types";

import { IoMdArrowDropleft, IoMdArrowDropright } from "react-icons/io";

import { STEPS, STEPS_LABELS } from "../constants";

import "./StepsNavigation.css";

const StepsNavigation = ({ currentStep, setStep }) => {
  return (
    <div className="steps-navigation-container">
      {currentStep.previous && (
        <button
          className="previous-step-button"
          data-testid="previous-step"
          onClick={() => setStep(STEPS[currentStep.previous])}
        >
          <IoMdArrowDropleft />
          {STEPS_LABELS[currentStep.previous]}
        </button>
      )}
      {currentStep.next && (
        <button
          className="next-step-button"
          data-testid="next-step"
          onClick={() => setStep(STEPS[currentStep.next])}
        >
          {STEPS_LABELS[currentStep.next]}
          <IoMdArrowDropright />
        </button>
      )}
    </div>
  );
};

StepsNavigation.propTypes = {
  currentStep: PropTypes.object.isRequired,
  setStep: PropTypes.func.isRequired,
};

export { StepsNavigation };

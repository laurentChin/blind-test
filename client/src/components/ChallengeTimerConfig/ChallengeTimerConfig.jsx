import React, { useId } from "react";
import PropTypes from "prop-types";

import "./ChallengeTimerConfig.css";

const DEFAULT_TIMER_SECONDS = 5;
const DEFAULT_COOLDOWN_SECONDS = 2;
const MIN_TIMER_SECONDS = 3;
const MAX_TIMER_SECONDS = 30;
const MIN_COOLDOWN_SECONDS = 0;
const MAX_COOLDOWN_SECONDS = 15;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const ChallengeTimerConfig = ({ timerSeconds, cooldownSeconds, onChange }) => {
  const timerInputId = useId();
  const cooldownInputId = useId();

  return (
    <div className="ChallengeTimerConfig">
      <div className="timer-config-field">
        <label htmlFor={timerInputId}>
          Timer to answer ({MIN_TIMER_SECONDS}-{MAX_TIMER_SECONDS}s)
        </label>
        <input
          id={timerInputId}
          className="field"
          data-testid="timer-seconds-input"
          type="number"
          min={MIN_TIMER_SECONDS}
          max={MAX_TIMER_SECONDS}
          value={timerSeconds}
          onChange={({ currentTarget }) =>
            onChange({
              timerSeconds: clamp(
                parseInt(currentTarget.value, 10) || 0,
                MIN_TIMER_SECONDS,
                MAX_TIMER_SECONDS
              ),
              cooldownSeconds,
            })
          }
        />
      </div>
      <div className="timer-config-field">
        <label htmlFor={cooldownInputId}>
          Cooldown after timeout ({MIN_COOLDOWN_SECONDS}-{MAX_COOLDOWN_SECONDS}s)
        </label>
        <input
          id={cooldownInputId}
          className="field"
          data-testid="cooldown-seconds-input"
          type="number"
          min={MIN_COOLDOWN_SECONDS}
          max={MAX_COOLDOWN_SECONDS}
          value={cooldownSeconds}
          onChange={({ currentTarget }) =>
            onChange({
              timerSeconds,
              cooldownSeconds: clamp(
                parseInt(currentTarget.value, 10) || 0,
                MIN_COOLDOWN_SECONDS,
                MAX_COOLDOWN_SECONDS
              ),
            })
          }
        />
      </div>
    </div>
  );
};

ChallengeTimerConfig.propTypes = {
  timerSeconds: PropTypes.number.isRequired,
  cooldownSeconds: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};

export {
  ChallengeTimerConfig,
  DEFAULT_TIMER_SECONDS,
  DEFAULT_COOLDOWN_SECONDS,
  MIN_TIMER_SECONDS,
  MAX_TIMER_SECONDS,
  MIN_COOLDOWN_SECONDS,
  MAX_COOLDOWN_SECONDS,
};

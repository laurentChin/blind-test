import React, { useEffect, useId, useState } from "react";
import PropTypes from "prop-types";

import "./ChallengeTimerConfig.css";

const DEFAULT_TIMER_SECONDS = 5;
const DEFAULT_COOLDOWN_SECONDS = 2;
const MIN_TIMER_SECONDS = 3;
const MAX_TIMER_SECONDS = 30;
const MIN_COOLDOWN_SECONDS = 0;
const MAX_COOLDOWN_SECONDS = 15;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Typed digit-by-digit (as on a mobile numeric keypad), each keystroke fires
// its own change event. Clamping on every keystroke fights the browser's
// controlled value and can only ever settle on min or max, so the raw text
// is kept in local state and only clamped once the field loses focus.
const TimerNumberField = ({ id, testId, label, min, max, value, onCommit }) => {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <div className="timer-config-field">
      <label htmlFor={id}>
        {label} ({min}-{max}s)
      </label>
      <input
        id={id}
        className="field"
        data-testid={testId}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        onChange={({ currentTarget }) => setDraft(currentTarget.value)}
        onBlur={() => {
          const committed = clamp(parseInt(draft, 10) || 0, min, max);
          setDraft(String(committed));
          onCommit(committed);
        }}
      />
    </div>
  );
};

TimerNumberField.propTypes = {
  id: PropTypes.string.isRequired,
  testId: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
  onCommit: PropTypes.func.isRequired,
};

const ChallengeTimerConfig = ({ timerSeconds, cooldownSeconds, onChange }) => {
  const timerInputId = useId();
  const cooldownInputId = useId();

  return (
    <div className="ChallengeTimerConfig">
      <TimerNumberField
        id={timerInputId}
        testId="timer-seconds-input"
        label="Timer to answer"
        min={MIN_TIMER_SECONDS}
        max={MAX_TIMER_SECONDS}
        value={timerSeconds}
        onCommit={(value) => onChange({ timerSeconds: value, cooldownSeconds })}
      />
      <TimerNumberField
        id={cooldownInputId}
        testId="cooldown-seconds-input"
        label="Cooldown after timeout"
        min={MIN_COOLDOWN_SECONDS}
        max={MAX_COOLDOWN_SECONDS}
        value={cooldownSeconds}
        onCommit={(value) => onChange({ timerSeconds, cooldownSeconds: value })}
      />
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

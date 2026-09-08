import React, { useEffect, useId, useState } from "react";
import PropTypes from "prop-types";

import "./AnswerScoreConfig.css";

const DEFAULT_ALMOST_POINTS = 0.5;
const DEFAULT_FULL_POINTS = 1;
const MIN_POINTS = 0;
const MAX_POINTS = 5;
const POINTS_STEP = 0.5;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Same rationale as ChallengeTimerConfig's TimerNumberField: clamping on
// every keystroke fights the browser's controlled value and can only ever
// settle on min or max, so the raw text is kept in local state and only
// clamped once the field loses focus.
const PointsField = ({ id, testId, label, value, onCommit }) => {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <div className="points-config-field">
      <label htmlFor={id}>
        {label} ({MIN_POINTS}-{MAX_POINTS}pt)
      </label>
      <input
        id={id}
        className="field"
        data-testid={testId}
        type="number"
        inputMode="decimal"
        min={MIN_POINTS}
        max={MAX_POINTS}
        step={POINTS_STEP}
        value={draft}
        onChange={({ currentTarget }) => setDraft(currentTarget.value)}
        onBlur={() => {
          const committed = clamp(parseFloat(draft) || 0, MIN_POINTS, MAX_POINTS);
          setDraft(String(committed));
          onCommit(committed);
        }}
      />
    </div>
  );
};

PointsField.propTypes = {
  id: PropTypes.string.isRequired,
  testId: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  onCommit: PropTypes.func.isRequired,
};

const AnswerScoreConfig = ({ almostPoints, fullPoints, onChange }) => {
  const almostInputId = useId();
  const fullInputId = useId();

  return (
    <div className="AnswerScoreConfig">
      <p className="config-step-hint">
        Players self-report their answer with these three buttons — "Fake
        news" always scores 0, set what "Title or Artist" and "Jackpot" are
        worth.
      </p>
      <PointsField
        id={almostInputId}
        testId="almost-points-input"
        label="Title or Artist"
        value={almostPoints}
        onCommit={(value) => onChange({ almostPoints: value, fullPoints })}
      />
      <PointsField
        id={fullInputId}
        testId="full-points-input"
        label="Jackpot"
        value={fullPoints}
        onCommit={(value) => onChange({ almostPoints, fullPoints: value })}
      />
    </div>
  );
};

AnswerScoreConfig.propTypes = {
  almostPoints: PropTypes.number.isRequired,
  fullPoints: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};

export {
  AnswerScoreConfig,
  DEFAULT_ALMOST_POINTS,
  DEFAULT_FULL_POINTS,
  MIN_POINTS,
  MAX_POINTS,
  POINTS_STEP,
};

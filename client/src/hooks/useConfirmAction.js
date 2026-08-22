import { useEffect, useRef, useState } from "react";

const CONFIRM_TIMEOUT = 3000;

// Drives a two-click confirm pattern for destructive buttons: the first
// run() call arms it (the caller shows the .btn-confirm fill/prompt) and
// starts a timeout that disarms it if it's not confirmed; a second run()
// call while armed clears that timeout and performs the action.
function useConfirmAction() {
  const [isArmed, setArmed] = useState(false);
  const timeoutRef = useRef();

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const run = (action) => {
    if (isArmed) {
      clearTimeout(timeoutRef.current);
      setArmed(false);
      return action();
    }

    setArmed(true);
    timeoutRef.current = setTimeout(() => setArmed(false), CONFIRM_TIMEOUT);
    return undefined;
  };

  return { run, isArmed };
}

export { useConfirmAction };

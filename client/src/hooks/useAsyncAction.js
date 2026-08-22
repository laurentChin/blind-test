import { useState } from "react";

const DONE_DISPLAY_DURATION = 500;

// Drives the .btn-loading / .btn-loading-done CSS states (see base.css) for
// a button that triggers a network call: run() shows the rising fill while
// the action is pending, then briefly shows the completed fill before
// resetting so the caller doesn't have to manage that timing itself.
function useAsyncAction() {
  const [status, setStatus] = useState("idle");

  const run = (action) => {
    setStatus("loading");

    return Promise.resolve(action()).then(
      (result) => {
        setStatus("done");
        setTimeout(() => setStatus("idle"), DONE_DISPLAY_DURATION);
        return result;
      },
      (error) => {
        setStatus("idle");
        throw error;
      }
    );
  };

  const className =
    status === "loading"
      ? "btn-loading"
      : status === "done"
      ? "btn-loading-done"
      : "";

  return { run, className };
}

export { useAsyncAction };

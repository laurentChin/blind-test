import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import PropTypes from "prop-types";
import { MdClose } from "react-icons/md";

import "./Toast.css";

const TOAST_DURATION = 6000;

// No-op outside a <ToastProvider> so a component can call showToast without
// every test having to wrap it in one.
const ToastContext = createContext(() => {});

// A persistent toast stays until dismissed by hand — for errors the user has
// to act on, which shouldn't vanish while they're looking elsewhere.
const Toast = ({ message, persistent = false, onDismiss }) => {
  useEffect(() => {
    if (persistent) return undefined;

    const timeout = setTimeout(onDismiss, TOAST_DURATION);

    return () => clearTimeout(timeout);
  }, [persistent, onDismiss]);

  return (
    <li className="Toast">
      <span>{message}</span>
      <button
        type="button"
        className="Toast-dismiss"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <MdClose aria-hidden="true" />
      </button>
    </li>
  );
};

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  persistent: PropTypes.bool,
  onDismiss: PropTypes.func.isRequired,
};

// Mounted once around the whole app (above the router) so a toast raised by
// a page survives that page navigating away — e.g. a player sent back home
// because their session was closed.
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const region = useRef();
  const nextId = useRef(0);
  // Stable per toast id, so re-rendering the list for a new toast doesn't
  // restart the dismiss timers of the ones already on screen.
  const dismissers = useRef(new Map());

  const showToast = useCallback((message, { persistent = false } = {}) => {
    const id = nextId.current++;

    dismissers.current.set(id, () => {
      dismissers.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    });
    setToasts((current) => [...current, { id, message, persistent }]);
  }, []);

  const hasToasts = toasts.length > 0;

  // A manual popover: it sits in the top layer (above any open <dialog>)
  // without light-dismiss and without stealing focus from the page.
  useEffect(() => {
    region.current?.togglePopover(hasToasts);
  }, [hasToasts]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <ul ref={region} className="Toast-region" popover="manual" role="status">
        {toasts.map(({ id, message, persistent }) => (
          <Toast
            key={id}
            message={message}
            persistent={persistent}
            onDismiss={dismissers.current.get(id)}
          />
        ))}
      </ul>
    </ToastContext.Provider>
  );
};

ToastProvider.propTypes = {
  children: PropTypes.node,
};

const useToast = () => useContext(ToastContext);

export { ToastProvider, useToast, TOAST_DURATION };

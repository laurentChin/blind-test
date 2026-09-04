import { useEffect, useRef, useState } from "react";

// Bootstraps auth for whichever provider is currently selected: logs in on
// mount/provider-change and tracks isAuthenticated. Shared by every session
// creation flow (classic and everybody-plays) since both start from the same
// provider choice.
function useProviderAuth(provider, musicProvider) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    musicProvider.isAuthenticated
  );
  const isFirstProviderRender = useRef(true);

  useEffect(() => {
    if (!provider) return;

    // Skip on the very first mount so a page reload with an already
    // authenticated provider doesn't flash the steps back to locked — only a
    // genuine switch to a different provider should invalidate them.
    if (!isFirstProviderRender.current) {
      setIsAuthenticated(false);
    }
    isFirstProviderRender.current = false;

    // login() resolves `false` when the provider's own session validation
    // fails (e.g. a stored Spotify token that no longer works server-side)
    // instead of unlocking downstream steps against a connection that's
    // actually dead.
    musicProvider.login().then((authenticated) => setIsAuthenticated(!!authenticated));
  }, [provider, musicProvider]);

  return isAuthenticated;
}

export { useProviderAuth };

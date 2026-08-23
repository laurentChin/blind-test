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

    musicProvider.login().then(() => setIsAuthenticated(true));
  }, [provider, musicProvider]);

  return isAuthenticated;
}

export { useProviderAuth };

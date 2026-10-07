export const GAME_MODE = {
  CLASSIC: "classic",
  EVERYBODY_PLAYS: "everybodyPlays",
};

// Error code acked to a client that refers to a session the server no longer
// (or never) knew about, so it can send its user back to the home page.
export const SESSION_NOT_FOUND = "sessionNotFound";

export const DEFAULT_CHALLENGE_TIMER_SECONDS = 5;
export const DEFAULT_CHALLENGE_COOLDOWN_SECONDS = 2;
export const DEFAULT_ALMOST_POINTS = 0.5;
export const DEFAULT_FULL_POINTS = 1;
export const DEFAULT_TOTAL_TRACKS = 0;

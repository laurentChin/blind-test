import {
  GAME_MODE,
  DEFAULT_CHALLENGE_TIMER_SECONDS,
  DEFAULT_CHALLENGE_COOLDOWN_SECONDS,
  DEFAULT_ALMOST_POINTS,
  DEFAULT_FULL_POINTS,
  DEFAULT_TOTAL_TRACKS,
} from "../constants.js";

// Builds a fresh session's in-memory state. `colorPool` is copied rather than
// referenced so each session can hand out and reclaim colors independently of
// every other session sharing the same master palette.
export function createSessionState(
  {
    mode,
    timerSeconds,
    cooldownSeconds,
    almostPoints,
    fullPoints,
    totalTracks,
  },
  colorPool
) {
  return {
    currentChallenger: null,
    challengers: new Map(),
    colors: [...colorPool],
    mode: mode || GAME_MODE.CLASSIC,
    excludedPlayers: new Set(),
    challengeTimerSeconds: timerSeconds ?? DEFAULT_CHALLENGE_TIMER_SECONDS,
    challengeCooldownSeconds:
      cooldownSeconds ?? DEFAULT_CHALLENGE_COOLDOWN_SECONDS,
    almostPoints: almostPoints ?? DEFAULT_ALMOST_POINTS,
    fullPoints: fullPoints ?? DEFAULT_FULL_POINTS,
    cooldowns: new Map(),
    challengeTimeoutHandle: null,
    currentTrack: null,
    // Playlist progress (see the trackReady handler), surfaced to players as
    // a "count/total" indicator.
    totalTracks: totalTracks ?? DEFAULT_TOTAL_TRACKS,
    playedCount: 0,
    // Real playback state, reported by whichever client actually drives the
    // Spotify/Apple Music player — see the playbackStateChanged handler. Not
    // inferred from trackReady/challenge state, which only says a track is
    // cued, not that it's actually being played.
    isPlaying: false,
    // everybodyPlays only: a correct answer was just broadcast to the whole
    // room (see applyScore) and the host hasn't cued the next track yet —
    // lets a reconnecting player know to show that same reveal screen
    // instead of the interactive challenge button.
    roundRevealed: false,
  };
}

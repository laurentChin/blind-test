// Relayed as-is: only the session's playback-hosting client knows the
// newly-current track (it's the one driving the Spotify/Apple Music player),
// so it broadcasts it here for every player's screen to privately cache
// ahead of that player's own "reveal" action.
export function setTrackReady(session, track) {
  session.currentTrack = track;
  session.roundRevealed = false;
  session.playedCount += 1;
}

// Relayed as-is, same reasoning as setTrackReady above: only the client
// driving actual playback knows whether it's really playing or paused, so it
// reports every change here for every player's screen.
export function setPlaybackState(session, isPlaying) {
  session.isPlaying = isPlaying;
}

import { setTrackReady, setPlaybackState } from "../playback/playback.js";

export function registerPlaybackHandlers(io, socket, sessions) {
  // Relayed as-is: only the session's playback-hosting client knows the
  // newly-current track (it's the one driving the Spotify/Apple Music
  // player), so it broadcasts it here for every player's screen to privately
  // cache ahead of that player's own "reveal" action.
  socket.on("trackReady", ({ sessionUuid, track }) => {
    const session = sessions.get(sessionUuid);
    if (session) {
      setTrackReady(session, track);
    }

    io.to(sessionUuid).emit("trackReady", {
      track,
      playedCount: session?.playedCount,
      totalTracks: session?.totalTracks,
    });
  });

  // Relayed as-is, same reasoning as trackReady above: only the client
  // driving actual playback knows whether it's really playing or paused, so
  // it reports every change here for every player's screen.
  socket.on("playbackStateChanged", ({ sessionUuid, isPlaying }) => {
    const session = sessions.get(sessionUuid);
    if (session) {
      setPlaybackState(session, isPlaying);
    }

    io.to(sessionUuid).emit("playbackStateChanged", isPlaying);
  });
}

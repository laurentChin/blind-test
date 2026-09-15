import test from "node:test";
import assert from "node:assert/strict";
import { createSessionState } from "../sessions/session.js";
import { setTrackReady, setPlaybackState } from "./playback.js";

test("setTrackReady stores the track, clears the reveal flag and bumps playedCount", () => {
  const session = createSessionState({}, []);
  session.roundRevealed = true;

  setTrackReady(session, { id: "track-1" });

  assert.deepEqual(session.currentTrack, { id: "track-1" });
  assert.equal(session.roundRevealed, false);
  assert.equal(session.playedCount, 1);
});

test("setPlaybackState records the reported playback state", () => {
  const session = createSessionState({}, []);
  setPlaybackState(session, true);
  assert.equal(session.isPlaying, true);
});

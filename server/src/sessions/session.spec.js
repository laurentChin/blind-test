import test from "node:test";
import assert from "node:assert/strict";
import { createSessionState } from "./session.js";

const colorPool = [{ background: "1, 2, 3", text: "255, 255, 255" }];

test("createSessionState applies the game-mode defaults", () => {
  const session = createSessionState({}, colorPool);

  assert.equal(session.mode, "classic");
  assert.equal(session.challengeTimerSeconds, 5);
  assert.equal(session.challengeCooldownSeconds, 2);
  assert.equal(session.almostPoints, 0.5);
  assert.equal(session.fullPoints, 1);
  assert.equal(session.totalTracks, 0);
  assert.equal(session.playedCount, 0);
  assert.equal(session.isPlaying, false);
  assert.equal(session.roundRevealed, false);
});

test("createSessionState honors explicit overrides", () => {
  const session = createSessionState(
    {
      mode: "everybodyPlays",
      timerSeconds: 10,
      cooldownSeconds: 1,
      almostPoints: 0.25,
      fullPoints: 2,
      totalTracks: 15,
    },
    colorPool
  );

  assert.equal(session.mode, "everybodyPlays");
  assert.equal(session.challengeTimerSeconds, 10);
  assert.equal(session.challengeCooldownSeconds, 1);
  assert.equal(session.almostPoints, 0.25);
  assert.equal(session.fullPoints, 2);
  assert.equal(session.totalTracks, 15);
});

test("createSessionState copies the color pool instead of sharing it", () => {
  const session = createSessionState({}, colorPool);
  session.colors.pop();

  assert.equal(colorPool.length, 1);
  assert.equal(session.colors.length, 0);
});

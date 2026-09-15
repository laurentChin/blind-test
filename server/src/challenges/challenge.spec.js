import test from "node:test";
import assert from "node:assert/strict";
import { createSessionState } from "../sessions/session.js";
import {
  canChallenge,
  lockChallenge,
  releaseChallengeAfterTimeout,
  applyScore,
  markWrongAnswer,
  clearChallenge,
  startNewChallenge,
} from "./challenge.js";

test("canChallenge allows a first buzz-in", () => {
  const session = createSessionState({}, []);
  assert.equal(canChallenge(session, "player-1"), true);
});

test("canChallenge rejects a player still under cooldown", () => {
  const session = createSessionState({}, []);
  session.cooldowns.set("player-1", Date.now() + 10000);
  assert.equal(canChallenge(session, "player-1"), false);
});

test("canChallenge rejects an excluded player in everybodyPlays mode", () => {
  const session = createSessionState({ mode: "everybodyPlays" }, []);
  session.excludedPlayers.add("player-1");
  assert.equal(canChallenge(session, "player-1"), false);
});

test("canChallenge rejects buzzing in over someone else's active challenge", () => {
  const session = createSessionState({}, []);
  session.currentChallenger = "player-1";
  assert.equal(canChallenge(session, "player-2"), false);
});

test("canChallenge allows the current challenger to re-trigger their own lock", () => {
  const session = createSessionState({}, []);
  session.currentChallenger = "player-1";
  assert.equal(canChallenge(session, "player-1"), true);
});

test("lockChallenge assigns the challenger", () => {
  const session = createSessionState({}, []);
  lockChallenge(session, "player-1");
  assert.equal(session.currentChallenger, "player-1");
});

test("releaseChallengeAfterTimeout clears the lock and starts a cooldown in classic mode", () => {
  const session = createSessionState({ cooldownSeconds: 2 }, []);
  session.currentChallenger = "player-1";

  releaseChallengeAfterTimeout(session, "player-1");

  assert.equal(session.currentChallenger, null);
  assert.ok(session.cooldowns.get("player-1") > Date.now());
});

test("releaseChallengeAfterTimeout keeps the lock and skips the cooldown in everybodyPlays mode", () => {
  const session = createSessionState({ mode: "everybodyPlays" }, []);
  session.currentChallenger = "player-1";

  releaseChallengeAfterTimeout(session, "player-1");

  assert.equal(session.currentChallenger, "player-1");
  assert.equal(session.cooldowns.has("player-1"), false);
});

test("applyScore adds the score and releases the lock", () => {
  const session = createSessionState({}, []);
  session.challengers.set("player-1", { uuid: "player-1", score: 1 });
  session.currentChallenger = "player-1";

  const challenger = applyScore(session, "player-1", 0.5);

  assert.equal(challenger.score, 1.5);
  assert.equal(session.currentChallenger, null);
});

test("applyScore flags the round as revealed in everybodyPlays mode", () => {
  const session = createSessionState({ mode: "everybodyPlays" }, []);
  session.challengers.set("player-1", { uuid: "player-1", score: 0 });

  applyScore(session, "player-1", 1);

  assert.equal(session.roundRevealed, true);
});

test("applyScore returns null for an unknown challenger", () => {
  const session = createSessionState({}, []);
  assert.equal(applyScore(session, "ghost", 1), null);
});

test("markWrongAnswer excludes the player and releases the lock", () => {
  const session = createSessionState({}, []);
  session.currentChallenger = "player-1";

  markWrongAnswer(session, "player-1");

  assert.equal(session.excludedPlayers.has("player-1"), true);
  assert.equal(session.currentChallenger, null);
});

test("clearChallenge releases the lock", () => {
  const session = createSessionState({}, []);
  session.currentChallenger = "player-1";

  clearChallenge(session);

  assert.equal(session.currentChallenger, null);
});

test("startNewChallenge resets exclusions, the lock and the reveal flag", () => {
  const session = createSessionState({}, []);
  session.currentChallenger = "player-1";
  session.excludedPlayers.add("player-1");
  session.roundRevealed = true;

  startNewChallenge(session);

  assert.equal(session.currentChallenger, null);
  assert.equal(session.excludedPlayers.size, 0);
  assert.equal(session.roundRevealed, false);
});

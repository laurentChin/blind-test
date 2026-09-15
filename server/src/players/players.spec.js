import test from "node:test";
import assert from "node:assert/strict";
import { createSessionState } from "../sessions/session.js";
import {
  resolvePlayerUuid,
  registerChallenger,
  removeChallenger,
  resolveJoinedPlayerColor,
} from "./players.js";

const colorPool = [
  { background: "1, 2, 3", text: "255, 255, 255" },
  { background: "4, 5, 6", text: "0, 0, 0" },
];

test("resolvePlayerUuid reuses the team's uuid when the player is rejoining", () => {
  assert.equal(resolvePlayerUuid({ teamUuid: "team-1" }), "team-1");
});

test("resolvePlayerUuid generates a fresh uuid for a brand-new player", () => {
  const uuid = resolvePlayerUuid({ teamUuid: "" });
  assert.match(uuid, /^[0-9a-f-]{36}$/);
});

test("registerChallenger claims the requested color and adds the challenger", () => {
  const session = createSessionState({}, colorPool);
  const player = {
    name: "Alice",
    color: { background: "4, 5, 6", text: "0, 0, 0" },
  };

  const challenger = registerChallenger(session, "player-1", player);

  assert.equal(challenger.name, "Alice");
  assert.equal(challenger.score, 0);
  assert.equal(session.colors.length, 1);
  assert.equal(session.colors[0].background, "1, 2, 3");
  assert.equal(session.challengers.get("player-1"), challenger);
});

test("registerChallenger rejects a color that's already taken", () => {
  const session = createSessionState({}, colorPool);
  const player = { name: "Bob", color: { background: "9, 9, 9" } };

  const challenger = registerChallenger(session, "player-1", player);

  assert.equal(challenger, null);
  assert.equal(session.colors.length, 2);
});

test("removeChallenger frees the player's color back into the pool", () => {
  const session = createSessionState({}, colorPool);
  registerChallenger(session, "player-1", {
    name: "Alice",
    color: colorPool[0],
  });

  const removed = removeChallenger(session, "player-1");

  assert.equal(removed.name, "Alice");
  assert.equal(session.challengers.has("player-1"), false);
  assert.equal(session.colors.length, 2);
});

test("removeChallenger is a no-op for an unknown player", () => {
  const session = createSessionState({}, colorPool);
  assert.equal(removeChallenger(session, "ghost"), null);
});

test("resolveJoinedPlayerColor returns the teammate's color for a team join", () => {
  const session = createSessionState({}, colorPool);
  registerChallenger(session, "team-1", { name: "Alice", color: colorPool[0] });

  const color = resolveJoinedPlayerColor(session, { teamUuid: "team-1" });
  assert.deepEqual(color, colorPool[0]);
});

test("resolveJoinedPlayerColor falls back to the player's own color otherwise", () => {
  const session = createSessionState({}, colorPool);
  const color = resolveJoinedPlayerColor(session, {
    teamUuid: "",
    color: colorPool[1],
  });
  assert.deepEqual(color, colorPool[1]);
});

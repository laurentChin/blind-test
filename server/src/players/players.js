import { v4 } from "uuid";

export function resolvePlayerUuid(player) {
  return player.teamUuid !== "" ? player.teamUuid : v4();
}

// Attempts to claim `player`'s chosen color and register them as a
// challenger. Returns null (leaving session.colors untouched) if that color
// is no longer available, or the newly created challenger otherwise.
export function registerChallenger(session, playerUuid, player) {
  const colorIndex = session.colors.findIndex(
    color => color.background === player.color.background
  );
  if (colorIndex === -1) return null;

  session.colors.splice(colorIndex, 1);
  const challenger = { ...player, score: 0, uuid: playerUuid };
  session.challengers.set(playerUuid, challenger);

  return challenger;
}

export function removeChallenger(session, playerUuid) {
  const challenger = session.challengers.get(playerUuid);
  if (!challenger) return null;

  session.colors.push(challenger.color);
  session.challengers.delete(playerUuid);

  return challenger;
}

export function resolveJoinedPlayerColor(session, player) {
  return player.teamUuid !== ""
    ? session.challengers.get(player.teamUuid).color
    : player.color;
}

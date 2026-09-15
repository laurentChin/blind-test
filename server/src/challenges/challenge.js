import { GAME_MODE } from "../constants.js";

// Someone else already holds the lock — without this, a client whose local
// state is out of sync with the server (e.g. it reconnected before catching
// up on the current round) could steal an in-progress challenge from under
// the player who's actually answering.
export function canChallenge(session, playerUuid) {
  const cooldownUntil = session.cooldowns.get(playerUuid);
  if (cooldownUntil && cooldownUntil > Date.now()) return false;

  if (
    session.mode === GAME_MODE.EVERYBODY_PLAYS &&
    session.excludedPlayers.has(playerUuid)
  ) {
    return false;
  }

  if (session.currentChallenger && session.currentChallenger !== playerUuid) {
    return false;
  }

  return true;
}

export function lockChallenge(session, playerUuid) {
  session.currentChallenger = playerUuid;
}

// Classic mode only: the timer running out there means the challenger failed
// to answer, and the cooldown rate-limits re-buzzing. In everybodyPlays, the
// timer running out is the normal trigger for the auto-revealed answer
// screen — not a failure — so no cooldown should outlive the round and block
// this player's next, genuinely new, buzz-in once the track changes.
// currentChallenger is left set too: this player still owns the round until
// they self-score (see applyScore / markWrongAnswer below), which is what
// lets a mid-reveal refresh restore the right screen instead of a fresh,
// unlocked one.
export function releaseChallengeAfterTimeout(session, playerUuid) {
  if (session.mode !== GAME_MODE.EVERYBODY_PLAYS) {
    session.currentChallenger = null;
    session.cooldowns.set(
      playerUuid,
      Date.now() + session.challengeCooldownSeconds * 1000
    );
  }
}

// Classic mode's master scores while the challenge is still locked, so
// session.currentChallenger is still valid there and challengerUuid may be
// omitted by the caller. everybodyPlays scores after its own timer already
// expired, and a player could in theory have reconnected in between —
// relying on session.currentChallenger there would trust a value the client
// can't fully vouch for, so callers identify the challenger explicitly
// instead.
export function applyScore(session, challengerUuid, score) {
  const challenger = session.challengers.get(challengerUuid);
  if (!challenger) return null;

  session.currentChallenger = null;
  if (session.mode === GAME_MODE.EVERYBODY_PLAYS) {
    session.roundRevealed = true;
  }
  challenger.score = parseFloat(challenger.score) + parseFloat(score);

  return challenger;
}

// A player self-reports a wrong answer: unlike applyScore, this never
// advances the track — everyone else still gets a shot at the same song.
// Only relevant to "everybodyPlays" sessions, where there's no game master to
// judge the answer instead.
export function markWrongAnswer(session, playerUuid) {
  session.excludedPlayers.add(playerUuid);
  session.currentChallenger = null;
}

export function clearChallenge(session) {
  session.currentChallenger = null;
}

export function startNewChallenge(session) {
  session.excludedPlayers.clear();
  session.currentChallenger = null;
  session.roundRevealed = false;
}

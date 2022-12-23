const STEPS = {
  CREATE_OR_SELECT_PLAYLIST: {
    name: "CREATE_OR_SELECT_PLAYLIST",
    next: "MANAGE_TRACKS",
  },
  MANAGE_TRACKS: {
    name: "MANAGE_TRACKS",
    previous: "CREATE_OR_SELECT_PLAYLIST",
    next: "MANAGE_SESSION",
  },
  MANAGE_SESSION: {
    name: "MANAGE_SESSION",
    previous: "MANAGE_TRACKS",
  },
};

const STEPS_LABELS = {
  CREATE_OR_SELECT_PLAYLIST: "Create or select a playlist",
  MANAGE_TRACKS: "Manage the tracks",
  MANAGE_SESSION: "Manage the session",
};

export { STEPS, STEPS_LABELS };

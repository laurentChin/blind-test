// Curated theme presets, described by criteria rather than a single free-text
// query: a plain query matches titles, artists and album names alike, which
// is how a "variété française" search ended up full of covers by an artist
// literally named "Variété Française". Each provider turns these criteria
// into whatever its own search supports (see themeQueries() in the provider
// contexts), and playlistGenerator.js checks candidates against them again.
//
// - years: release year range, checked against the album's release date
// - genres: provider genre names (Spotify's `genre:` filter vocabulary)
// - keywords: words the tracks must relate to (soundtrack themes)
// - soundtrack: only keep tracks released on a soundtrack album
// - terms: plain-text fallback for providers without field filters (Apple
//   Music), also used to look up the provider's editorial playlists
const CURRENT_YEAR = new Date().getFullYear();

const THEMES = [
  { id: "80s", label: "80s", years: [1980, 1989], terms: "80s hits" },
  { id: "90s", label: "90s", years: [1990, 1999], terms: "90s hits" },
  { id: "2000s", label: "2000s", years: [2000, 2009], terms: "2000s hits" },
  {
    id: "2010s",
    label: "2010s - now",
    years: [2010, CURRENT_YEAR],
    terms: "2010s hits",
  },
  { id: "rock", label: "Rock", genres: ["rock"], terms: "rock classics" },
  { id: "pop", label: "Pop", genres: ["pop"], terms: "pop hits" },
  {
    id: "hiphop",
    label: "Hip-Hop / Rap",
    genres: ["hip hop", "rap"],
    terms: "hip hop hits",
  },
  {
    id: "french",
    label: "Variété française",
    genres: ["variete francaise", "chanson", "french pop"],
    terms: "variété française",
  },
  {
    id: "disney",
    label: "Disney",
    keywords: ["disney"],
    soundtrack: true,
    terms: "disney",
  },
  {
    id: "marvel",
    label: "Marvel",
    keywords: ["marvel"],
    soundtrack: true,
    terms: "marvel soundtrack",
  },
  {
    id: "movies",
    label: "Films & Séries",
    keywords: ["soundtrack"],
    soundtrack: true,
    terms: "movie soundtrack hits",
  },
];

// A typed-in theme has no criteria to check candidates against: it's sent
// as-is to the provider's search, and marked custom so the generator skips
// the preset-only filters (e.g. an artist-name match is exactly what a
// "Céline Dion" theme wants).
function toCustomTheme(text) {
  return { id: "custom", custom: true, keywords: [text], terms: text };
}

export { THEMES, toCustomTheme };

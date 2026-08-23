// Curated theme presets: each maps to a free-text search query against the
// provider's own search() — there's no genre/mood recommendation API wired
// up on either provider, so this is the same search capability the manual
// "Add a track" flow already uses (see components/Search/Search.jsx).
const THEMES = [
  { id: "80s", label: "80s", query: "80s hits" },
  { id: "90s", label: "90s", query: "90s hits" },
  { id: "2000s", label: "2000s", query: "2000s hits" },
  { id: "2010s", label: "2010s - now", query: "2010s hits" },
  { id: "rock", label: "Rock", query: "rock classics" },
  { id: "pop", label: "Pop", query: "pop hits" },
  { id: "hiphop", label: "Hip-Hop / Rap", query: "hip hop hits" },
  { id: "french", label: "Variété française", query: "variété française" },
  { id: "movies", label: "Films & Séries", query: "movie soundtrack hits" },
];

export { THEMES };

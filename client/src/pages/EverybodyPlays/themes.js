// Themes are described by criteria rather than a free-text query, and only
// by criteria the providers can answer precisely: a release period, a genre,
// or a soundtrack album. Each provider turns them into whatever its own
// search supports (see themeQueries() in the provider contexts), and
// playlistGenerator.js checks candidates against them again.
//
// - years: release year range, checked against the album's release date
// - genres: genre names, as Spotify's `genre:` filter and Apple Music's
//   per-track genreNames both spell them once normalized
// - keywords + soundtrack: tracks released on a soundtrack album, or on an
//   album named after the keyword (Disney)
// - albumPhrases: tracks whose album name holds one of these phrases —
//   soundtrack albums are titled by convention ("Original Motion Picture
//   Soundtrack", "Bande originale du film"), in English for American
//   productions and in French for French ones
// - terms: plain-text query for providers without field filters (Apple
//   Music), also used to look up the provider's editorial playlists
const FIRST_YEAR = 1950;
const CURRENT_YEAR = new Date().getFullYear();

const PERIODS = [
  { id: "60s", label: "60s", years: [1960, 1969], terms: "60s hits" },
  { id: "70s", label: "70s", years: [1970, 1979], terms: "70s hits" },
  { id: "80s", label: "80s", years: [1980, 1989], terms: "80s hits" },
  { id: "90s", label: "90s", years: [1990, 1999], terms: "90s hits" },
  { id: "2000s", label: "2000s", years: [2000, 2009], terms: "2000s hits" },
  { id: "2010s", label: "2010s", years: [2010, 2019], terms: "2010s hits" },
  { id: "2020s", label: "2020s", years: [2020, CURRENT_YEAR], terms: "2020s hits" },
];

const GENRES = [
  { id: "pop", label: "Pop", genres: ["pop"], terms: "pop hits" },
  { id: "rock", label: "Rock", genres: ["rock"], terms: "rock hits" },
  { id: "hiphop", label: "Hip-Hop / Rap", genres: ["hip hop", "rap"], terms: "hip hop hits" },
  { id: "soul", label: "R&B / Soul", genres: ["r&b", "soul"], terms: "r&b soul hits" },
  { id: "metal", label: "Metal", genres: ["metal"], terms: "metal hits" },
  { id: "electro", label: "Electro", genres: ["electronic", "dance"], terms: "dance hits" },
  { id: "reggae", label: "Reggae", genres: ["reggae"], terms: "reggae hits" },
  { id: "country", label: "Country", genres: ["country"], terms: "country hits" },
  { id: "jazz", label: "Jazz", genres: ["jazz"], terms: "jazz classics" },
];

const SOUNDTRACKS = [
  {
    id: "disney",
    label: "Disney",
    keywords: ["disney"],
    soundtrack: true,
    terms: "disney",
  },
  {
    id: "movies-tv",
    label: "Movies & TV Shows (FR and USA)",
    albumPhrases: [
      "motion picture soundtrack",
      "series soundtrack",
      "television soundtrack",
      "bande originale du film",
      "bande originale de la série",
    ],
    terms: "movie and tv soundtrack",
  },
];

const THEME_GROUPS = [
  { id: "periods", label: "Decade", themes: PERIODS },
  { id: "genres", label: "Genre", themes: GENRES },
  { id: "soundtracks", label: "Movies & series", themes: SOUNDTRACKS },
];

const THEMES = THEME_GROUPS.flatMap(({ themes }) => themes);

// Most recent first: the years people actually pick sit at the top.
const YEARS = Array.from(
  { length: CURRENT_YEAR - FIRST_YEAR + 1 },
  (_, index) => CURRENT_YEAR - index
);

// Combines whatever the "your own theme" form holds — a single year or a
// period, a genre, free text — into one theme. Period and genre keep the
// precision of their preset; free text is sent as-is to the provider's
// search, narrowed by the other criteria. Marked custom so the generator
// re-checks even editorial tracks against the combination (a playlist found
// for "Queen" isn't limited to the 80s by itself). Null when nothing is set.
function buildCustomTheme({ text = "", year, periodId, genreId }) {
  const trimmedText = text.trim();
  const period = PERIODS.find(({ id }) => id === periodId);
  const genre = GENRES.find(({ id }) => id === genreId);
  const years = year ? [year, year] : period?.years;

  if (!trimmedText && !years && !genre) {
    return null;
  }

  const criteria = [year || period?.label, genre?.label].filter(Boolean);

  return {
    id: "custom",
    custom: true,
    ...(trimmedText ? { text: trimmedText } : {}),
    ...(years ? { years } : {}),
    ...(genre ? { genres: genre.genres } : {}),
    // "Queen 80s Rock" with free text, "80s Rock hits" without: the
    // closest plain-text equivalent for a provider with no field filters.
    terms: trimmedText
      ? [trimmedText, ...criteria].join(" ")
      : `${criteria.join(" ")} hits`,
  };
}

export { THEMES, THEME_GROUPS, PERIODS, GENRES, YEARS, buildCustomTheme };

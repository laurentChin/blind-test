// Builds an everybody-plays track list from a theme (see themes.js).
//
// Candidates come from two sources: the provider's editorial playlists when
// it exposes them (Apple Music — hand-curated, trusted as-is), then its
// search, queried with whatever field filters it supports (Spotify's
// `year:`/`genre:`/`album:`). Search results are then re-checked against the
// theme's criteria, stripped of covers/karaoke, and deduped by title so only the
// best-ranked version of a song survives — neither provider exposes a
// popularity score anymore (Spotify dropped it in February 2026), so the
// provider's own search ranking is the best proxy for "the original
// recording by the original artist".

const MAX_PAGES_PER_QUERY = 20;
const PAGES_PER_ROUND = 4;
// Collecting a bigger pool than needed keeps the weighted draw below from
// always landing on the very same tracks for a given theme.
const CANDIDATE_POOL_FACTOR = 2;
const MAX_TRACKS_PER_ARTIST = 2;
const EDITORIAL_WEIGHT = 1;
const SEARCH_WEIGHT = 0.6;

const COVER_PATTERN =
  /karaok|tribute|in the style of|made famous|originally performed|cover version|backing track|instrumental version|lullab|berceuse|\bremix\b/i;

const SOUNDTRACK_PATTERN =
  /soundtrack|bande originale|original (motion picture|cast|score|series)|musique du film|\bbof\b|\bost\b|from the (film|movie|series|motion picture)/i;

function normalize(text = "") {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// "Take On Me - 2015 Remaster", "Let It Go (From "Frozen")" and "Let It Go"
// all collapse onto the same key, so a song only counts once however many
// albums/versions it was found on.
function titleKey(name = "") {
  return normalize(
    name.replace(/\s*[([].*?[)\]]/g, "").replace(/\s+-\s+.*$/, "")
  );
}

function artistNames(track) {
  return (track.artists || []).map(({ name }) => name || "");
}

function isCover(track) {
  return [track.name, track.album?.name, ...artistNames(track)].some(
    (value) => value && COVER_PATTERN.test(value)
  );
}

// A plain-text search for "80s hits" happily matches an artist literally
// named "80s Hits" (a compilation/cover act) — never the original singer,
// so a theme's own words showing up as the artist name is a reject.
function artistEchoesTheme(track, { terms, genres = [], keywords = [] }) {
  const themeTerms = normalize(terms);
  const themeWords = [...genres, ...keywords].map(normalize);

  return artistNames(track)
    .map(normalize)
    .some(
      (artist) =>
        (themeTerms && artist.includes(themeTerms)) ||
        themeWords.includes(artist)
    );
}

function releaseYear(track) {
  const year = parseInt(track.album?.release_date, 10);
  return Number.isNaN(year) ? undefined : year;
}

function matchesYears(track, years) {
  const year = releaseYear(track);
  // No release date to check against: the provider's own filter already
  // had its say, so give it the benefit of the doubt.
  return !years || year === undefined || (year >= years[0] && year <= years[1]);
}

// Only Apple Music exposes genres per track; Spotify's genre filter is
// applied server-side (on the artist), so tracks without genres pass.
function matchesGenres(track, genres) {
  if (!genres?.length || !track.genres?.length) {
    return true;
  }

  const trackGenres = track.genres.map(normalize);
  return genres
    .map(normalize)
    .some((genre) => trackGenres.some((trackGenre) => trackGenre.includes(genre)));
}

// Keeps a "Disney" theme to songs actually released on a soundtrack (or an
// album named after the keyword), which rules out e.g. Miley Cyrus' solo
// catalog showing up just because her name is associated with Disney.
// albumPhrases themes are stricter: the album name must hold the phrase.
function matchesAlbum(track, { soundtrack, keywords = [], albumPhrases }) {
  const albumName = track.album?.name || "";
  const normalizedAlbum = normalize(albumName);

  if (albumPhrases?.length) {
    return albumPhrases.some((phrase) => normalizedAlbum.includes(normalize(phrase)));
  }

  return (
    !soundtrack ||
    SOUNDTRACK_PATTERN.test(albumName) ||
    keywords.some((keyword) => normalizedAlbum.includes(normalize(keyword)))
  );
}

// Free text is what the user typed to find (an artist, most likely): its
// own words matching the artist name is then the point, not a reject.
function matchesTheme(track, theme) {
  return (
    (!!theme.text || !artistEchoesTheme(track, theme)) &&
    matchesYears(track, theme.years) &&
    matchesGenres(track, theme.genres) &&
    matchesAlbum(track, theme)
  );
}

// candidates: [{ track, weight, editorial }], in any order. Returns the
// playable pool: theme-matching, no covers, one version per song (the
// heaviest), and — unless free text asked for it — a bounded number of
// songs per artist so a single artist can't take over the whole playlist.
// Editorial tracks are trusted as-is for a preset (the playlist was curated
// for that very theme), but not for a custom combination of criteria.
function selectCandidates(candidates, theme) {
  const byWeight = [...candidates].sort((a, b) => b.weight - a.weight);
  const seenIds = new Set();
  const seenTitles = new Set();
  const perArtist = new Map();

  return byWeight.filter(({ track, editorial }) => {
    if (!track?.uri || seenIds.has(track.id) || isCover(track)) {
      return false;
    }

    if ((!editorial || theme.custom) && !matchesTheme(track, theme)) {
      return false;
    }

    const title = titleKey(track.name);
    if (title && seenTitles.has(title)) {
      return false;
    }

    const artist = normalize(artistNames(track)[0]);
    if (!theme.text && (perArtist.get(artist) || 0) >= MAX_TRACKS_PER_ARTIST) {
      return false;
    }

    seenIds.add(track.id);
    if (title) seenTitles.add(title);
    perArtist.set(artist, (perArtist.get(artist) || 0) + 1);

    return true;
  });
}

// Top search results are the provider's best matches (relevance and
// popularity combined), so weight decays with rank: deep results can still
// be drawn, just less often.
function searchWeight(rank) {
  return SEARCH_WEIGHT / Math.sqrt(1 + rank);
}

async function collectCandidates(musicProvider, theme, count) {
  const target = count * CANDIDATE_POOL_FACTOR;
  const candidates = [];
  const hasEnough = () => selectCandidates(candidates, theme).length >= target;

  if (musicProvider.getEditorialTracks && theme.terms) {
    const editorialTracks = await musicProvider
      .getEditorialTracks(theme.terms)
      .catch(() => []);

    editorialTracks.forEach((track) =>
      candidates.push({ track, weight: EDITORIAL_WEIGHT, editorial: true })
    );

    if (hasEnough()) {
      return candidates;
    }
  }

  const queries = musicProvider.themeQueries(theme);
  const pageSize = musicProvider.searchPageSize;
  const exhausted = new Set();

  // Pages are fetched a few at a time, in parallel across every query: the
  // offsets are known up front (pageSize is the provider's own ceiling), and
  // stopping between rounds avoids hammering the API once the pool is full.
  for (let firstPage = 0; firstPage < MAX_PAGES_PER_QUERY; firstPage += PAGES_PER_ROUND) {
    const requests = queries
      .filter((query) => !exhausted.has(query))
      .flatMap((query) =>
        Array.from(
          { length: Math.min(PAGES_PER_ROUND, MAX_PAGES_PER_QUERY - firstPage) },
          (_, index) => ({ query, page: firstPage + index })
        )
      );

    if (requests.length === 0) {
      break;
    }

    const pages = await Promise.all(
      requests.map(({ query, page }) =>
        musicProvider
          .search(query, { limit: pageSize, offset: page * pageSize })
          .then((result) => ({ query, page, items: result?.items || [] }))
      )
    );

    pages.forEach(({ query, page, items }) => {
      if (items.length < pageSize) {
        exhausted.add(query);
      }

      items.forEach((track, index) => {
        const rank = page * pageSize + index;
        candidates.push({ track, weight: searchWeight(rank) });
      });
    });

    if (hasEnough()) {
      break;
    }
  }

  return candidates;
}

// Weighted random sampling without replacement (Efraimidis–Spirakis): each
// item draws random^(1/weight) and the highest keys win, so heavier
// (editorial, top-ranked) tracks are favored without the pick being fixed.
function weightedSample(candidates, count) {
  return candidates
    .map((candidate) => ({
      candidate,
      key: Math.random() ** (1 / candidate.weight),
    }))
    .sort((a, b) => b.key - a.key)
    .slice(0, count)
    .map(({ candidate }) => candidate);
}

// Fisher-Yates: the sample above comes out heaviest-first, so the play order
// is reshuffled to not front-load every big hit.
function shuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Resolves with up to `count` picked candidates ({ track, weight,
// editorial }) in play order — fewer means the theme didn't have enough
// matching songs, which the caller reports. Weight and source are kept
// alongside each track for the dev-only track list (TrackListDebug).
async function generateThemePlaylist(musicProvider, theme, count) {
  const candidates = await collectCandidates(musicProvider, theme, count);
  const pool = selectCandidates(candidates, theme);

  return shuffle(weightedSample(pool, count));
}

export { generateThemePlaylist, selectCandidates, titleKey };

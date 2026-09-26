import { selectCandidates, titleKey } from "./playlistGenerator";
import { THEMES, toCustomTheme } from "./themes";

const theme = (id) => THEMES.find((preset) => preset.id === id);

let nextId = 0;
const track = ({ name, artist, album = "Album", releaseDate = "1985-01-01", genres }) => ({
  id: `id-${nextId}`,
  uri: `uri:${nextId++}`,
  name,
  artists: [{ name: artist }],
  album: { name: album, release_date: releaseDate },
  genres,
});

const fromSearch = (tracks) =>
  tracks.map((candidate, rank) => ({ track: candidate, weight: 1 / (1 + rank) }));

const names = (selected) => selected.map(({ track: { name } }) => name);

describe("titleKey", () => {
  it("collapses remasters, featurings and soundtrack mentions onto the same song", () => {
    expect(titleKey("Take On Me - 2015 Remaster")).toBe("take on me");
    expect(titleKey('Let It Go (From "Frozen")')).toBe("let it go");
    expect(titleKey("Ça plane pour moi")).toBe("ca plane pour moi");
  });
});

describe("selectCandidates", () => {
  it("drops karaoke, tribute and 'made famous by' versions", () => {
    const selected = selectCandidates(
      fromSearch([
        track({ name: "Take On Me", artist: "a-ha" }),
        track({ name: "Africa", artist: "The Karaoke Channel" }),
        track({ name: "Jump", artist: "Hit Crew", album: "Made Famous by Van Halen" }),
        track({ name: "Billie Jean (Tribute Version)", artist: "Studio Band" }),
      ]),
      theme("80s")
    );

    expect(names(selected)).toEqual(["Take On Me"]);
  });

  it("drops artists named after the theme itself (compilation/cover acts)", () => {
    const selected = selectCandidates(
      fromSearch([
        track({ name: "Les Lacs du Connemara", artist: "Variété Française" }),
        track({ name: "Foule sentimentale", artist: "Alain Souchon" }),
      ]),
      theme("french")
    );

    expect(names(selected)).toEqual(["Foule sentimentale"]);
  });

  it("keeps only the best-ranked version of a song found several times", () => {
    const selected = selectCandidates(
      fromSearch([
        track({ name: "Girls Just Want to Have Fun", artist: "Cyndi Lauper" }),
        track({ name: "Girls Just Want to Have Fun - Remastered", artist: "Some Cover Band" }),
      ]),
      theme("80s")
    );

    expect(selected.map(({ track: { artists } }) => artists[0].name)).toEqual([
      "Cyndi Lauper",
    ]);
  });

  it("drops songs released outside of a decade theme's years", () => {
    const selected = selectCandidates(
      fromSearch([
        track({ name: "Smooth Operator", artist: "Sade", releaseDate: "1984-07-16" }),
        track({ name: "Flowers", artist: "Miley Cyrus", releaseDate: "2023-01-13" }),
      ]),
      theme("80s")
    );

    expect(names(selected)).toEqual(["Smooth Operator"]);
  });

  it("only keeps soundtrack albums for a soundtrack theme", () => {
    const selected = selectCandidates(
      fromSearch([
        track({
          name: "Let It Go",
          artist: "Idina Menzel",
          album: "Frozen (Original Motion Picture Soundtrack)",
        }),
        track({ name: "Flowers", artist: "Miley Cyrus", album: "Endless Summer Vacation" }),
        track({ name: "Hakuna Matata", artist: "Nathan Lane", album: "Disney Hits" }),
      ]),
      theme("disney")
    );

    expect(names(selected)).toEqual(["Let It Go", "Hakuna Matata"]);
  });

  it("checks track genres when the provider exposes them", () => {
    const selected = selectCandidates(
      fromSearch([
        track({ name: "Juicy", artist: "The Notorious B.I.G.", genres: ["Hip-Hop/Rap"] }),
        track({ name: "Wonderwall", artist: "Oasis", genres: ["Rock"] }),
      ]),
      theme("hiphop")
    );

    expect(names(selected)).toEqual(["Juicy"]);
  });

  it("caps songs per artist on presets, but not on a custom artist theme", () => {
    const tracks = ["Hello", "Skyfall", "Rolling in the Deep"].map((name) =>
      track({ name, artist: "Adele", releaseDate: "2011-01-01" })
    );

    expect(selectCandidates(fromSearch(tracks), theme("2010s"))).toHaveLength(2);
    expect(selectCandidates(fromSearch(tracks), toCustomTheme("Adele"))).toHaveLength(3);
  });

  it("trusts editorial tracks over the theme criteria, but still drops covers", () => {
    const selected = selectCandidates(
      [
        {
          track: track({ name: "Take On Me", artist: "a-ha", releaseDate: "2015-01-01" }),
          weight: 1,
          editorial: true,
        },
        {
          track: track({ name: "Africa", artist: "Karaoke Hits Band" }),
          weight: 1,
          editorial: true,
        },
      ],
      theme("80s")
    );

    expect(names(selected)).toEqual(["Take On Me"]);
  });
});

import LogoMusicProvider, { MUSIC_PROVIDER_IDS } from "./LogoMusicProvider";

export default {
  title: "Design system/Logos/LogoMusicProvider",
  component: LogoMusicProvider,
  argTypes: {
    provider: { control: "inline-radio", options: MUSIC_PROVIDER_IDS },
    alt: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Logo of a music provider (Figma: `Logo/Music provider`). Used in " +
          "`Card/Music selection` through `Card/Logo container`. The accessible " +
          'name defaults to "Logo <provider>"; pass `alt=""` when the provider ' +
          "is already written next to the logo.",
      },
    },
  },
};

export const Spotify = { args: { provider: "spotify" } };

export const Deezer = { args: { provider: "deezer" } };

export const AppleMusic = { args: { provider: "appleMusic" } };

export const YouTubeMusic = { args: { provider: "youtubeMusic" } };

// Every provider side by side, the way the selection cards line them up.
export const AllProviders = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "flex", gap: "var(--gap-md)", flexWrap: "wrap" }}>
      {MUSIC_PROVIDER_IDS.map((provider) => (
        <LogoMusicProvider key={provider} provider={provider} />
      ))}
    </div>
  ),
};

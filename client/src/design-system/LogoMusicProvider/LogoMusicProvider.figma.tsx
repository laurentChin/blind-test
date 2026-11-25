import figma from "@figma/code-connect";
import LogoMusicProvider from "@design-systems/LogoMusicProvider/LogoMusicProvider";

figma.connect(
  LogoMusicProvider,
  "https://www.figma.com/design/xMZfJlAcIUSF0m3glBlrG3/App-blind-test-Final?node-id=4049-40599",
  {
    props: {
      // Keys are the Figma variant values. `YouTube` there carries the
      // YouTube Music mark, which is the name the component gives it.
      provider: figma.enum("Provider", {
        Spotify: "spotify",
        Deezer: "deezer",
        "Apple Music": "appleMusic",
        YouTube: "youtubeMusic",
      }),
    },
    example: ({ provider }) => <LogoMusicProvider provider={provider} />,
  },
);

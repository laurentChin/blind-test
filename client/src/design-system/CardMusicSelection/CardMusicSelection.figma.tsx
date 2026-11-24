import figma from "@figma/code-connect";
import CardMusicSelection from "./CardMusicSelection";

figma.connect(
  CardMusicSelection,
  "https://www.figma.com/design/xMZfJlAcIUSF0m3glBlrG3/App-blind-test-Final?node-id=199-8679",
  {
    props: {
      label: figma.string("Label"),
      // Hover and Pressed are browser states handled in CSS, so Selected is
      // the only value of `State` that reaches the props.
      selected: figma.enum("State", { Selected: true }),
      // The provider rides on the nested logo the node exposes.
      logo: figma.nestedProps("Logo/Music provider", {
        provider: figma.enum("Provider", {
          Spotify: "spotify",
          Deezer: "deezer",
          "Apple Music": "appleMusic",
          YouTube: "youtubeMusic",
        }),
      }),
    },
    example: ({ label, selected, logo }) => (
      <CardMusicSelection
        provider={logo.provider}
        label={label}
        selected={selected}
      />
    ),
  },
);

import { useState } from "react";

import CardMusicSelection from "@design-systems/CardMusicSelection/CardMusicSelection";
import {
  MUSIC_PROVIDER_IDS,
  MUSIC_PROVIDER_NAMES,
} from "@design-systems/LogoMusicProvider/LogoMusicProvider";

// The card fills the width it is given, so every story puts it in the grid of
// sources it belongs to rather than letting it span the docs page.
const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 160px))",
  gap: "var(--gap-grid-mobile)",
};

export default {
  title: "Design system/Cards/CardMusicSelection",
  component: CardMusicSelection,
  argTypes: {
    provider: { control: "inline-radio", options: MUSIC_PROVIDER_IDS },
    label: { control: "text" },
    selected: { control: "boolean" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Card picking the music source of a session (Figma: " +
          "`Card/Music selection`). A `<button>` with `aria-pressed`: hover, " +
          "pressed and focus are browser states, so `selected` is its only " +
          "state prop. The label defaults to the provider's name.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={grid}>
        <Story />
      </div>
    ),
  ],
};

export const Default = { args: { provider: "spotify" } };

export const Selected = { args: { provider: "spotify", selected: true } };

// The label is the provider's name unless a caller says otherwise.
export const CustomLabel = {
  args: { provider: "appleMusic", label: "Ma bibliothèque" },
};

// The four sources side by side, as the selection screen lines them up.
export const EveryProvider = {
  parameters: { controls: { disable: true } },
  render: () => (
    <>
      {MUSIC_PROVIDER_IDS.map((provider) => (
        <CardMusicSelection key={provider} provider={provider} />
      ))}
    </>
  ),
};

// One source at a time, the way the screen uses the card.
export const SingleSelection = {
  parameters: { controls: { disable: true } },
  render: () => {
    const [chosen, setChosen] = useState("spotify");

    return MUSIC_PROVIDER_IDS.map((provider) => (
      <CardMusicSelection
        key={provider}
        provider={provider}
        selected={chosen === provider}
        onClick={() => setChosen(provider)}
        aria-label={`Choisir ${MUSIC_PROVIDER_NAMES[provider]}`}
      />
    ));
  },
};

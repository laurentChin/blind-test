import PropTypes from "prop-types";

import LogoMusicProvider, {
  MUSIC_PROVIDER_IDS,
  MUSIC_PROVIDER_NAMES,
} from "@design-systems/LogoMusicProvider/LogoMusicProvider";

import "@design-systems/CardMusicSelection/CardMusicSelection.css";

// What the band writes, which is not always the brand name: "YouTube Music"
// runs onto a second line at the width of the card, so the band says
// "YouTube" — the wording the Figma variant uses too. The logo keeps the full
// name for the places that read it out.
const CARD_LABELS = { ...MUSIC_PROVIDER_NAMES, youtubeMusic: "YouTube" };

/**
 * The card that picks the music source of a session (Figma:
 * `Card/Music selection`): the provider's logo over a dark label band.
 *
 * It is a native `<button>` carrying `aria-pressed`, so a screen reader
 * announces the source and whether it is the chosen one, and the keyboard
 * gets activation and focus for free. Hover, pressed and focus stay browser
 * states handled in CSS; only `selected` comes in as a prop.
 *
 * The label defaults to the name the band writes for that provider — the
 * Figma node asks the logo and the label to name the same source — so pass
 * `label` only to word it differently.
 *
 * The card takes the width it is given: a grid cell sizes it, and its square
 * logo area keeps the proportion of the node at any width.
 */
const CardMusicSelection = ({
  provider,
  label,
  selected = false,
  ...buttonProps
}) => (
  <button
    {...buttonProps}
    type="button"
    className="card-music-selection"
    data-provider={provider}
    aria-pressed={selected}
  >
    <span className="card-music-selection-logo">
      {/* The provider is written right below, so the logo has nothing to add
          to the button's name. */}
      <LogoMusicProvider provider={provider} alt="" />
    </span>
    <span className="card-music-selection-label">
      {label ?? CARD_LABELS[provider]}
    </span>
  </button>
);

CardMusicSelection.propTypes = {
  provider: PropTypes.oneOf(MUSIC_PROVIDER_IDS).isRequired,
  label: PropTypes.string,
  selected: PropTypes.bool,
};

export default CardMusicSelection;

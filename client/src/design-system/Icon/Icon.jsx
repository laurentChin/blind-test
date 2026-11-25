import PropTypes from "prop-types";

import AddShape from "@design-systems/Icon/assets/add.svg?react";
import CheckShape from "@design-systems/Icon/assets/check.svg?react";
import ChevronLeftShape from "@design-systems/Icon/assets/chevron-left.svg?react";
import ChevronRightShape from "@design-systems/Icon/assets/chevron-right.svg?react";
import CloseShape from "@design-systems/Icon/assets/close.svg?react";
import PauseShape from "@design-systems/Icon/assets/pause.svg?react";
import PlayShape from "@design-systems/Icon/assets/play.svg?react";
import SearchShape from "@design-systems/Icon/assets/search.svg?react";
import SettingsShape from "@design-systems/Icon/assets/settings.svg?react";
import ShareShape from "@design-systems/Icon/assets/share.svg?react";
import SkipShape from "@design-systems/Icon/assets/skip.svg?react";
import WarningShape from "@design-systems/Icon/assets/warning.svg?react";

import "@design-systems/Icon/Icon.css";

// One entry per `Icon/*` component of the Figma file — the design system has a
// single component for all of them, the icon being a value rather than a
// component of its own. The key is the Figma name without its `Icon/` prefix,
// lowercased and hyphenated (`Icon/Chevron left` → `chevron-left`), and is also
// the name of the asset it points at.
//
// The `?react` suffix is what makes the bundler inline the asset as SVG markup
// instead of handing back a URL: the shape then sits in the DOM, where its
// `fill="currentColor"` resolves against the text color of the parent.
const ICONS = {
  add: AddShape,
  check: CheckShape,
  "chevron-left": ChevronLeftShape,
  "chevron-right": ChevronRightShape,
  close: CloseShape,
  pause: PauseShape,
  play: PlayShape,
  search: SearchShape,
  settings: SettingsShape,
  share: ShareShape,
  skip: SkipShape,
  warning: WarningShape,
};

// Exported so callers, stories and tests iterate over the same list the
// component accepts. An icon the design doesn't carry yet is drawn in Figma and
// exported to `assets/` — never drawn here, and never pulled from an icon
// library.
const ICON_NAMES = Object.keys(ICONS);

// The two steps of the image scale an icon renders at: `xs` is the size every
// Figma icon node binds, `2xs` the one that lines up with a `caption` text —
// the icon of an error message.
const ICON_SIZES = ["xs", "2xs"];

/**
 * One of the icons of the design system, filled with the text color of its
 * parent: the hosting component sets the color through its own text token
 * (`--color-text-on-dark`, `--color-text-on-light`, `--color-action-destructive`).
 *
 * The icon is always decorative, so it stays out of the accessibility tree: it
 * either sits next to a label that already names the action, or inside a button
 * which carries the `aria-label` itself.
 */
const Icon = ({ name, size = "xs" }) => {
  const Shape = ICONS[name];

  return (
    <Shape
      className="icon"
      data-name={name}
      data-size={size}
      aria-hidden="true"
    />
  );
};

Icon.propTypes = {
  name: PropTypes.oneOf(ICON_NAMES).isRequired,
  size: PropTypes.oneOf(ICON_SIZES),
};

export default Icon;
export { ICON_NAMES, ICON_SIZES };

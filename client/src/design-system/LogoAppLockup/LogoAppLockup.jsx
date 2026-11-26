import PropTypes from "prop-types";

import LogoApp from "@design-systems/LogoApp/LogoApp";

import wordmark from "@design-systems/LogoAppLockup/assets/app-wordmark.svg";

import "@design-systems/LogoAppLockup/LogoAppLockup.css";

// The same spelling as `LogoApp`, kept local rather than imported from it: the
// lockup already renders that component, and a string is not worth coupling
// the two modules over.
const APP_NAME = "C-KOI";

// The `Orientation` variants of the Figma component set. Vertical stacks the
// name under the mark, horizontal sets it beside — the proportions of each
// live in the stylesheet, derived from the Figma nodes.
const LOCKUP_ORIENTATIONS = ["vertical", "horizontal"];

/**
 * The logo of the app with its name (Figma: `Logo/App lockup`).
 *
 * It renders `LogoApp` rather than a flattened copy of it, the way the Figma
 * component places an instance of `Logo/App` next to the `C-KOI` vector: the
 * mark is drawn in one place, and a change to it reaches the lockup. Only the
 * wordmark is an asset of its own, as vector outlines rather than live text,
 * so the letters never wait on a font and cannot be re-spaced by one.
 *
 * It takes the width of the element that hosts it and derives its height from
 * the orientation, so the gap between the mark and the name stays in
 * proportion at every size — the thing a `gap` in a fixed length could not do.
 *
 * `alt` defaults to the app name alone — "C-KOI", not "Logo C-KOI": the name
 * is part of the image. Pass `alt=""` where it is already written beside it,
 * and the whole lockup leaves the accessibility tree.
 */
const LogoAppLockup = ({ orientation = "vertical", alt = APP_NAME }) => {
  const decorative = alt === "";

  return (
    <div
      className="logo-app-lockup"
      data-orientation={orientation}
      // The mark and the name are one image to a screen reader, named once,
      // rather than two neighbours it would read in turn.
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? "true" : undefined}
    >
      <LogoApp alt="" />
      <img className="logo-app-lockup-wordmark" src={wordmark} alt="" />
    </div>
  );
};

LogoAppLockup.propTypes = {
  orientation: PropTypes.oneOf(LOCKUP_ORIENTATIONS),
  alt: PropTypes.string,
};

export default LogoAppLockup;
export { LOCKUP_ORIENTATIONS };

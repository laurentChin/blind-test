import PropTypes from "prop-types";

import appLogo from "@design-systems/LogoApp/assets/app.svg";

import "@design-systems/LogoApp/LogoApp.css";

// The brand name, as the lockup writes it, so the accessible name of the
// logo is spelled in one place. It is not the name of the repository: the
// product is C-KOI, "blind test" is what it plays.
const APP_NAME = "C-KOI";

/**
 * The logo of the app (Figma: `Logo/App`) — the rounded square mark, gradient,
 * dot grid and glyph baked into the asset.
 *
 * It is the one component of the design system that binds no size token: it
 * fills the element that hosts it, so the same asset serves the splash screen,
 * the top bar and a favicon-sized slot. The parent owns the size, the logo
 * only fits inside it.
 *
 * `alt` defaults to "Logo C-KOI". Pass `alt=""` where the app name is
 * already written next to the mark — `Logo/App lockup` does — so a screen
 * reader doesn't say it twice.
 */
const LogoApp = ({ alt = `Logo ${APP_NAME}` }) => (
  <img className="logo-app" src={appLogo} alt={alt} />
);

LogoApp.propTypes = {
  alt: PropTypes.string,
};

export default LogoApp;
export { APP_NAME };

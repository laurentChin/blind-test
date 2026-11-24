import PropTypes from "prop-types";

import appleMusicLogo from "./assets/apple-music.png";
import deezerLogo from "./assets/deezer.png";
import spotifyLogo from "./assets/spotify.png";
import youtubeMusicLogo from "./assets/youtube-music.png";

import "./LogoMusicProvider.css";

// One entry per `Provider` variant of the Figma component set. `name` is the
// logo's default accessible name; the brand shape, its colors and its corner
// radius all live inside the asset, so the component only has to size it.
const PROVIDERS = {
  spotify: { name: "Spotify", src: spotifyLogo },
  deezer: { name: "Deezer", src: deezerLogo },
  appleMusic: { name: "Apple Music", src: appleMusicLogo },
  youtubeMusic: { name: "YouTube Music", src: youtubeMusicLogo },
};

// Exported so callers, stories and tests iterate over the same list the
// component accepts. Ids match `MUSIC_PROVIDERS` in contexts/MusicProvider.
const MUSIC_PROVIDER_IDS = Object.keys(PROVIDERS);

/**
 * The logo of a music provider, at the single size of the Figma component.
 *
 * `alt` defaults to the provider name. Pass `alt=""` where the name is already
 * written next to the logo, so a screen reader doesn't announce it twice.
 */
const LogoMusicProvider = ({ provider, alt }) => {
  const { name, src } = PROVIDERS[provider];

  return (
    <img
      className="logo-music-provider"
      data-provider={provider}
      src={src}
      alt={alt ?? name}
    />
  );
};

LogoMusicProvider.propTypes = {
  provider: PropTypes.oneOf(MUSIC_PROVIDER_IDS).isRequired,
  alt: PropTypes.string,
};

export default LogoMusicProvider;
export { MUSIC_PROVIDER_IDS };

import Color from "colorjs.io";

const COUNT = 24;

// How far each hue's swatch sits from the sRGB gamut's peak-chroma point for
// that hue (1 = right on the peak, i.e. neon). Pulled back a bit so the
// palette reads as vivid-but-friendly rather than eye-searing.
const CHROMA_SCALE = 0.75;

// Blends each hue's peak lightness toward a shared center so extremes (very
// light yellows, very dark blues) are softened while the hue-to-hue
// lightness variation — which is what makes text-color choice vary at all —
// is preserved.
const LIGHTNESS_CENTER = 0.6;
const LIGHTNESS_BLEND = 0.3;

const WHITE = new Color("white");
const BLACK = new Color("black");

// Binary search for the most saturated in-gamut OKLCH chroma at a given
// lightness/hue: the sRGB gamut boundary is convex in chroma, so this
// converges cleanly.
function maxChromaInGamut(lightness, hue) {
  let low = 0;
  let high = 0.4;

  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    if (
      new Color("oklch", [lightness, mid, hue]).inGamut("srgb", { epsilon: 0 })
    ) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return low;
}

// The sRGB gamut's peak chroma sits at a different lightness per hue (e.g.
// yellow peaks much lighter than blue) — walking lightness and keeping the
// hue's most saturated point is what makes some swatches naturally end up
// light and others dark, instead of every hue being forced to the same
// lightness.
function peakChromaForHue(hue) {
  let bestLightness = 0.5;
  let bestChroma = 0;

  for (let lightness = 0.05; lightness <= 0.97; lightness += 0.01) {
    const chroma = maxChromaInGamut(lightness, hue);
    if (chroma > bestChroma) {
      bestChroma = chroma;
      bestLightness = lightness;
    }
  }

  return { lightness: bestLightness, chroma: bestChroma };
}

function toRgbTriplet(color) {
  const [r, g, b] = color
    .to("srgb")
    .coords.map(value => Math.round(Math.min(1, Math.max(0, value)) * 255));
  return `${r}, ${g}, ${b}`;
}

// WCAG 2.1 contrast against both black and white is exact and cheap to
// compute, so rather than guessing from lightness, each background just
// picks whichever of the two actually reads better on it.
function bestTextColor(background) {
  const whiteContrast = Math.abs(background.contrast(WHITE, "WCAG21"));
  const blackContrast = Math.abs(background.contrast(BLACK, "WCAG21"));
  return whiteContrast >= blackContrast ? WHITE : BLACK;
}

function generateSessionColors(count = COUNT) {
  const colors = [];

  for (let i = 0; i < count; i++) {
    const hue = (360 / count) * i;
    const { lightness: peakLightness, chroma: peakChroma } =
      peakChromaForHue(hue);
    const lightness =
      peakLightness * (1 - LIGHTNESS_BLEND) +
      LIGHTNESS_CENTER * LIGHTNESS_BLEND;
    const chroma = peakChroma * CHROMA_SCALE;
    const background = new Color("oklch", [lightness, chroma, hue]).toGamut({
      space: "srgb",
    });

    colors.push({
      background: toRgbTriplet(background),
      text: toRgbTriplet(bestTextColor(background)),
    });
  }

  return colors;
}

export { generateSessionColors };

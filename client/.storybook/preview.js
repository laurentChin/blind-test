// Same global stylesheet as the app: fonts, design tokens and base styles.
import "@/index.css";
// The design-system tokens, which the app does not load yet: they collide by
// name with the legacy styles/tokens.css, so wiring them in globally would
// restyle the screens in production. Imported last so they win here, where
// only design-system components are shown.
import "@design-systems/tokens/index.css";
// Montserrat and Montserrat Alternates, which the typography tokens name and
// the app does not serve yet.
import "./fonts.css";

export default {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
  tags: ["autodocs"],
};

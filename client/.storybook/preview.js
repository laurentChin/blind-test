// Same global stylesheet as the app: fonts, design tokens and base styles.
import "../src/index.css";

export default {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
  tags: ["autodocs"],
};

import react from "eslint-plugin-react";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default [
  { ignores: ["build/**", "eslint.config.mjs"] },
  react.configs.flat.recommended,
  prettierConfig,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.es6,
        ...globals.node,
        ...globals.browser,
      },
    },
    settings: {
      // Hardcoded because "detect" crashes under ESLint 10: eslint-plugin-react's
      // auto-detection relies on a legacy context.getFilename() API ESLint 10 removed.
      react: {
        version: "19.2.8",
      },
    },
  },
];

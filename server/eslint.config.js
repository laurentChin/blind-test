import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
  },
];

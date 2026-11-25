export default {
  roots: ["<rootDir>/src"],
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.jsx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "ecmascript", jsx: true },
          transform: { react: { runtime: "automatic" } },
        },
      },
    ],
    "^.+\\.(png|jpe?g|gif|webp|avif)$":
      "<rootDir>/config/jest/fileTransform.cjs",
    "^.+\\.svg$": "<rootDir>/config/jest/svgrTransform.cjs",
  },
  moduleNameMapper: {
    "\\.css$": "identity-obj-proxy",
    // Jest resolves a module path, not a bundler query: drop the `?react` the
    // SVGR plugin matches on so the file itself is found, then transformed.
    "^(.*)\\.svg\\?react$": "$1.svg",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{js,jsx}",
    "<rootDir>/src/**/*.{spec,test}.{js,jsx}",
  ],
};

// Keep in sync with resolve.alias in rsbuild.config.mjs and jsconfig.json.
const aliases = {
  "@": "src",
  "@components": "src/components",
  "@contexts": "src/contexts",
  "@design-systems": "src/design-system",
  "@helpers": "src/helpers",
  "@pages": "src/pages",
  "@styles": "src/styles",
};

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
    // Order matters: stylesheets must be stubbed before the aliases resolve them.
    "\\.css$": "identity-obj-proxy",
    // Jest resolves a module path, not a bundler query: drop the `?react` the
    // SVGR plugin matches on so the file itself is found, then transformed. A
    // mapped path is not mapped again, so each alias needs its own rule.
    ...Object.fromEntries(
      Object.entries(aliases).map(([alias, dir]) => [
        `^${alias}/(.*)\\.svg\\?react$`,
        `<rootDir>/${dir}/$1.svg`,
      ]),
    ),
    "^(.*)\\.svg\\?react$": "$1.svg",
    // Any other SVG import is a URL, like a PNG: it stands in for one here
    // rather than being transformed into a component. It has to sit above the
    // aliases, which would otherwise resolve it to the file itself and hand it
    // to `svgrTransform` after all.
    "\\.svg$": "<rootDir>/config/jest/svgUrlStub.cjs",
    ...Object.fromEntries(
      Object.entries(aliases).map(([alias, dir]) => [
        `^${alias}/(.*)$`,
        `<rootDir>/${dir}/$1`,
      ]),
    ),
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{js,jsx}",
    "<rootDir>/src/**/*.{spec,test}.{js,jsx}",
  ],
};

import { defineConfig, loadEnv } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginBasicSsl } from "@rsbuild/plugin-basic-ssl";

const { publicVars } = loadEnv({ prefixes: ["REACT_APP_"] });

export default defineConfig({
  plugins: [pluginReact(), pluginBasicSsl()],
  html: {
    template: "./public/index.html",
  },
  source: {
    define: publicVars,
  },
  output: {
    distPath: {
      root: "build",
    },
  },
});

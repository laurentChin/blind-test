// Bundlers turn an imported image into its URL; Jest has no such loader. This
// stands in for one, giving each asset its file name so a component importing
// several of them still gets a distinct value per file.
const path = require("node:path");

module.exports = {
  process(_sourceText, sourcePath) {
    return {
      code: `module.exports = ${JSON.stringify(path.basename(sourcePath))};`,
    };
  },
  // Jest caches transform output per file; the output only depends on the name.
  getCacheKey(_sourceText, sourcePath) {
    return `fileTransform:${path.basename(sourcePath)}`;
  },
};

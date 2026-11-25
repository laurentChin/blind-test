// An SVG imported with the `?react` suffix is handed to SVGR by the bundler,
// which turns the file into a React component; Jest has no such loader. This
// stands in for one: it renders an <svg> tagged with the file it came from, so
// a component importing a dozen icons still gets a distinct element per file,
// and the props it passes down land on that element the way SVGR's own output
// spreads them.
const path = require("node:path");

const component = (sourcePath) => `
  const { createElement } = require("react");

  const SvgrStub = (props) =>
    createElement("svg", {
      ...props,
      "data-asset": ${JSON.stringify(path.basename(sourcePath))},
    });

  module.exports = SvgrStub;
  module.exports.default = SvgrStub;
  module.exports.__esModule = true;
`;

module.exports = {
  process(_sourceText, sourcePath) {
    return { code: component(sourcePath) };
  },
  // Jest caches transform output per file; the output only depends on the name.
  getCacheKey(_sourceText, sourcePath) {
    return `svgrTransform:${path.basename(sourcePath)}`;
  },
};

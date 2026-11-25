// Pass 1: cruft and number formatting only.
//
// Every plugin that rewrites geometry is left out on purpose. `mergePaths`
// and `convertPathData` both move anti-aliased edges — measured at up to
// 65/255 on the mark and 84/255 on the wordmark — which is not something a
// logo should pay for a few kilobytes. `removeViewBox` is out too: the logo
// is sized by CSS, and without a viewBox `object-fit` has no ratio to work
// with. Ids keep their Figma names so the file stays diffable against a
// fresh export.
export default {
  multipass: true,
  plugins: [
    "removeDoctype",
    "removeXMLProcInst",
    "removeComments",
    "removeMetadata",
    "removeEditorsNSData",
    "removeDesc",
    "removeTitle",
    "removeUselessDefs",
    "removeEmptyAttrs",
    "removeEmptyText",
    "removeEmptyContainers",
    "removeUnusedNS",
    "cleanupAttrs",
    "convertColors",
    { name: "cleanupNumericValues", params: { floatPrecision: 5 } },
  ],
};

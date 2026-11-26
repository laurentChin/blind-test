// Pass 2: path data, applied only to the long paths the optimiser hands over
// — never to the wordmark, whose letters stay exactly as Figma drew them.
//
// `makeArcs` and `straightCurves` re-describe curves with a tolerance, which
// is what shifts an edge; `floatPrecision: 4` on a 338-unit viewBox is a
// thousandth of a pixel at any size the logo is ever drawn.
export default {
  multipass: true,
  plugins: [
    {
      name: "convertPathData",
      params: {
        floatPrecision: 4,
        makeArcs: false,
        straightCurves: false,
        curveSmoothShorthands: false,
      },
    },
  ],
};

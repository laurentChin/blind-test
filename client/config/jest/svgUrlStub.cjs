// An SVG imported without the `?react` suffix is a URL, the way a PNG is: the
// bundler hands back a path, and the component feeds it to an <img>. Jest has
// no such loader, and `svgrTransform` can't stand in for this one — it makes
// the file a React component, which React drops when it lands on `src`.
//
// So the plain form is mapped here instead, to one shared value: a component
// importing a single SVG as an image gets a usable `src`, which is what its
// test asserts. A component importing several would need them told apart;
// give it the per-file treatment of `fileTransform` then.
module.exports = "svg-url-stub";

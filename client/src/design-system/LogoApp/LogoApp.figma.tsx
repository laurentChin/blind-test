import figma from "@figma/code-connect";
import LogoApp from "@design-systems/LogoApp/LogoApp";

figma.connect(
  LogoApp,
  "https://www.figma.com/design/xMZfJlAcIUSF0m3glBlrG3/App-blind-test-Final?node-id=157-4753",
  {
    // The node carries no variant, and no size prop either: the mark fills the
    // element that hosts it, so a Figma instance resized on the canvas maps
    // onto the same call with a differently sized host.
    example: () => <LogoApp />,
  },
);

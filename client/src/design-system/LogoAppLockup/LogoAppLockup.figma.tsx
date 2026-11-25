import figma from "@figma/code-connect";
import LogoAppLockup from "@design-systems/LogoAppLockup/LogoAppLockup";

figma.connect(
  LogoAppLockup,
  "https://www.figma.com/design/xMZfJlAcIUSF0m3glBlrG3/App-blind-test-Final?node-id=4094-41031",
  {
    props: {
      // The one variant of the component set. The instance of `Logo/App` it
      // contains is not mapped: the component renders it itself, which is the
      // whole point of composing the lockup rather than flattening it.
      orientation: figma.enum("Orientation", {
        Vertical: "vertical",
        Horizontal: "horizontal",
      }),
    },
    example: ({ orientation }) => <LogoAppLockup orientation={orientation} />,
  },
);

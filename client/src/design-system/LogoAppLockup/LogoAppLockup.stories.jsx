import LogoAppLockup, {
  LOCKUP_ORIENTATIONS,
} from "@design-systems/LogoAppLockup/LogoAppLockup";

export default {
  title: "Design system/Logos/LogoAppLockup",
  component: LogoAppLockup,
  argTypes: {
    orientation: { control: "inline-radio", options: LOCKUP_ORIENTATIONS },
    alt: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Logo of the app with its name (Figma: `Logo/App lockup`), in the " +
          "two orientations of the component set. It renders `LogoApp` rather " +
          "than a flattened copy, the way the Figma component places an " +
          "instance of `Logo/App` beside the `C-KOI` vector — only the " +
          "wordmark is an asset of its own. It takes the width of its host " +
          "and derives its height, so the gap between mark and name stays in " +
          'proportion at every size. The accessible name defaults to "C-KOI"; ' +
          'pass `alt=""` where the name is already written beside it.',
      },
    },
  },
};

export const Vertical = {
  args: { orientation: "vertical" },
  render: (args) => (
    <div style={{ inlineSize: "var(--image-size-xl)" }}>
      <LogoAppLockup {...args} />
    </div>
  ),
};

export const Horizontal = {
  args: { orientation: "horizontal" },
  render: (args) => (
    <div style={{ inlineSize: "var(--image-size-2xl)" }}>
      <LogoAppLockup {...args} />
    </div>
  ),
};

// The proportions are the point: at three sizes an order of magnitude apart,
// the gap between the mark and the name has to stay the same share of the
// logo. A fixed gap would be visible here.
export const Proportions = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--gap-xl)" }}
    >
      {LOCKUP_ORIENTATIONS.map((orientation) => (
        <div
          key={orientation}
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "var(--gap-lg)",
          }}
        >
          {["--image-size-sm", "--image-size-lg", "--image-size-2xl"].map(
            (size) => (
              <div key={size} style={{ inlineSize: `var(${size})` }}>
                <LogoAppLockup orientation={orientation} />
              </div>
            ),
          )}
        </div>
      ))}
    </div>
  ),
};

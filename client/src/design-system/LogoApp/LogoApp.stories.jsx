import LogoApp from "@design-systems/LogoApp/LogoApp";

export default {
  title: "Design system/Logos/LogoApp",
  component: LogoApp,
  argTypes: {
    alt: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Logo of the app (Figma: `Logo/App`). The one component of the " +
          "design system that binds no size token: it fills the element that " +
          "hosts it, so the same asset serves a splash screen and a top bar. " +
          'The accessible name defaults to "Logo C-KOI"; pass `alt=""` ' +
          "where the app name is already written next to the mark.",
      },
    },
  },
};

// The logo on its own: the story host gives it the size, as a screen would.
export const Default = {
  render: (args) => (
    <div style={{ inlineSize: "var(--image-size-2xl)" }}>
      <LogoApp {...args} />
    </div>
  ),
};

// The same component at the three sizes the mockups use it at, to show that
// the size is the host's decision and nothing about the logo changes with it.
export const Sizes = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "var(--gap-md)",
      }}
    >
      {["--image-size-xs", "--image-size-lg", "--image-size-2xl"].map(
        (size) => (
          <div key={size} style={{ inlineSize: `var(${size})` }}>
            <LogoApp />
          </div>
        ),
      )}
    </div>
  ),
};

// A host wider than it is tall: the mark fits inside and stays square rather
// than stretching to fill it.
export const InANonSquareHost = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div
      style={{
        inlineSize: "var(--image-size-2xl)",
        blockSize: "var(--image-size-lg)",
        outline:
          "var(--border-width-default) dashed var(--color-border-default)",
      }}
    >
      <LogoApp />
    </div>
  ),
};

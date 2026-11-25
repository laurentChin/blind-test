import Icon, { ICON_NAMES, ICON_SIZES } from "./Icon";

// The icon has no color of its own: every story has to sit on a surface that
// gives it one, through the text token of that surface.
const surface = {
  display: "flex",
  alignItems: "center",
  gap: "var(--gap-sm)",
  padding: "var(--padding-md)",
  borderRadius: "var(--radius-md)",
};

const onDark = {
  ...surface,
  background: "var(--color-background-default)",
  color: "var(--color-text-on-dark)",
};

const onLight = {
  ...surface,
  background: "var(--color-background-surface)",
  color: "var(--color-text-on-light)",
};

const gallery = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
  gap: "var(--gap-md)",
  padding: "var(--padding-md)",
  background: "var(--color-background-default)",
  color: "var(--color-text-on-dark)",
  borderRadius: "var(--radius-md)",
};

const cell = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "var(--gap-xs)",
  font: "var(--font-caption)",
  textAlign: "center",
};

export default {
  title: "Design system/Icons/Icon",
  component: Icon,
  argTypes: {
    name: { control: "select", options: ICON_NAMES },
    size: { control: "inline-radio", options: ICON_SIZES },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Every icon of the design system, in one component (Figma: " +
          "`Icon/Add`, `Icon/Check`, `Icon/Chevron left`…) — the icon is the " +
          "`name` prop, not a component of its own. The shape is filled with " +
          "`currentColor`, so it takes the text color of whatever hosts it, " +
          "and it is always decorative: the label beside it, or the " +
          "`aria-label` of the button around it, names the action.",
      },
    },
  },
};

// A surface has to give the icon a color: the component never names one.
const onDarkSurface = (Story) => (
  <div style={onDark}>
    <Story />
  </div>
);

export const Default = {
  args: { name: "close" },
  decorators: [onDarkSurface],
};

// Beside a `caption` text — the icon of an error message — at the size that
// lines up with it.
export const BesideACaption = {
  parameters: { controls: { disable: true } },
  render: () => (
    <p
      style={{
        ...onLight,
        font: "var(--font-caption)",
        color: "var(--color-feedback-error)",
        margin: 0,
      }}
    >
      <Icon name="warning" size="2xs" />
      Ce pseudo est déjà pris
    </p>
  ),
};

// The same icon on the three text colors it is used with: the color comes from
// the parent, the component never names one.
export const TakesTheTextColor = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "grid", gap: "var(--gap-sm)" }}>
      <span style={onDark}>
        <Icon name="check" />
        text/on-dark
      </span>
      <span style={onLight}>
        <Icon name="check" />
        text/on-light
      </span>
      <span style={{ ...onLight, color: "var(--color-action-destructive)" }}>
        <Icon name="close" />
        action/destructive
      </span>
    </div>
  ),
};

// What a hosting button looks like: the icon is hidden from screen readers and
// the button carries the name of the action.
export const InsideAButton = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={onDark}>
      <button
        type="button"
        aria-label="Fermer"
        style={{
          display: "flex",
          padding: "var(--padding-xs)",
          color: "inherit",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <Icon name="close" />
      </button>
      <button
        type="button"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--gap-xs)",
          padding: "var(--padding-xs)",
          font: "var(--font-caption)",
          color: "inherit",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <Icon name="share" />
        Partager la partie
      </button>
    </div>
  ),
};

// Every icon with its name, the way the Figma sheet lines them up.
export const EveryIcon = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={gallery}>
      {ICON_NAMES.map((name) => (
        <span key={name} style={cell}>
          <Icon name={name} />
          {name}
        </span>
      ))}
    </div>
  ),
};

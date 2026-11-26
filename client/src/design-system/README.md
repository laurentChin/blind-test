# Design system

Home of the reusable UI primitives of the client, built from the **COMPONENTS** section of the
[Figma file](https://www.figma.com/design/xMZfJlAcIUSF0m3glBlrG3/App-blind-test-Final?node-id=228-24238).

This folder is for design-system components only: pieces that are generic, reusable and own no game
logic. Feature components that orchestrate state or talk to a context stay in
[`client/src/components`](../components) and consume what lives here.

## Folder layout

One folder per component, named after it in PascalCase:

```
design-system/
  README.md
  tokens/           the design tokens, one file per category
  Button/
    Button.jsx          markup, props and interactivity
    Button.css          positioning and visuals
    Button.spec.js      tests
    Button.stories.jsx  Storybook stories, one per variant / state
    Button.figma.tsx    Code Connect mapping to the Figma component
    assets/             the images it imports, when it has any
```

A component's images go in its own `assets/` folder, all in the same format and all at the same
size — twice the size the component renders them at, so they stay sharp on a dense screen.

The logo is the exception: a vector, so one file covers every size. It comes out of Figma at around
46 KB, almost all of it a dot grid written as 441 separate circles, and goes through
[`config/svg/optimise-logo.py`](../../config/svg/optimise-logo.py) — which tiles that grid as a
`<pattern>` and runs SVGO with every geometry-rewriting plugin turned off. That leaves a tenth of
the export, 1.3 KB over the wire, with no pixel off by more than 11/255 at the sizes the mark is
drawn and none at all at whole-number scales. **Re-run it on a fresh export**: Figma writes the 441
circles again every time.

Grouped Figma families (`Icon/*`, `Logo/*`, `Card/*`…) keep the family as a prefix in the folder
name — `IconClose`, `CardMusicSelection` — so the file tree stays flat and greppable.

## Tokens

[`tokens/`](tokens) holds the design tokens, one file per category. Figma is the source of truth:
no value changes here without changing it there.

| File                                      | Holds                                                                             |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| [`colors.css`](tokens/colors.css)         | the palette primitives, then brand, backgrounds, actions, text, borders, feedback |
| [`typography.css`](tokens/typography.css) | families, weights and sizes, then one whole style per Figma text style            |
| [`spacing.css`](tokens/spacing.css)       | the 4/8 scale, then `padding-*`, `gap-*` and the screen-level steps               |
| [`radius.css`](tokens/radius.css)         | the raw radii, then `radius-sm` / `md` / `full`                                   |
| [`borders.css`](tokens/borders.css)       | the raw widths, then `border-width-default` / `-selected` / `-focus`              |
| [`shadows.css`](tokens/shadows.css)       | card halos and the button shadow                                                  |
| [`gradients.css`](tokens/gradients.css)   | the two brand gradients                                                           |
| [`sizes.css`](tokens/sizes.css)           | the one image scale — icons, avatars, logos — and the content width               |
| [`index.css`](tokens/index.css)           | imports them all, in dependency order                                             |

Four rules hold the system together:

- **Two layers.** Primitives (`--primitive-*`, `--font-family-*`, `--font-weight-*`, `--font-size-*`,
  `--space-*`, `--radius-4/12/9999`, `--border-width-1/3`) are raw values and are never used in a
  component; a primitive never changes value, a new value means a new primitive. The semantic tokens
  below them (`--color-*`, `--padding-*`, `--gap-*`, `--radius-sm…`, `--border-width-default…`,
  `--font-<style>`, `--shadow-*`, `--gradient-*`) carry the decision and are what components use.
- **Colors are the only raw values.** Gradients and shadows are composed from them with `var()` and
  `color-mix()`, so changing a color reaches them. Keep it that way.
- **A whole text style at a time** — `font: var(--font-heading-md)` — never a size or a weight on
  its own.
- **`padding` inside, `gap` between.** There is no margin token: the parent owns the space.

A component has one version, the same on mobile and desktop; a bigger one is a size of its own
(`--image-size-md` / `--image-size-lg`), not a breakpoint. Only the tokens suffixed `-mobile` /
`-desktop` depend on the screen, and the component picks between them in its own media query — the
token files hold no media query at all:

```css
.screen {
  max-width: var(--layout-max-width);
  padding: var(--padding-screen-y-mobile) var(--padding-screen-x-mobile);
  gap: var(--gap-xl);
}
.screen-title {
  font: var(--font-heading-xl-mobile);
}

@media (width >= 1024px) {
  .screen {
    padding: var(--padding-screen-y-desktop) var(--padding-screen-x-desktop);
  }
  .screen-title {
    font: var(--font-heading-xl-desktop);
  }
}
```

Three things are still open on the token source, to settle with the first coded screens: the desktop
breakpoint (1024px proposed, mockups are 393 / 1280), the unit (`px` as in Figma, or `rem`), and
whether very large screens get their own `-wide` tokens.

Every component here takes all of its values from these tokens, and no raw value goes in a component
file. A value the tokens don't carry yet is added to `tokens/` first.

[`LogoApp`](LogoApp) is the one component that binds no token at all, and the exception is the
point: the logo is a specific element rather than a systemic one. Its gradient, hues and corner
radius live inside its asset, so nothing recolors it, and its size is the host's — `100%` on both
axes with `object-fit: contain` — so the same mark serves a splash screen and a top bar without a
size of its own. A component that is _not_ a logo takes its size from the image scale above.

[`.storybook/preview.js`](../../.storybook/preview.js) imports `tokens/index.css` last, so the
stories render with them. The app doesn't import them yet, and does not need to while no screen
consumes a design-system component: the current [`styles/tokens.css`](../styles/tokens.css) holds
several of the same names with different values (`--space-4` is `4px` here and `1rem` there, plus
`--radius-sm/md`, `--font-size-*`, `--color-text-muted`, `--radius-full`), so both files loaded at
once would restyle screens already in production. Retire the old file as the pages migrate, then
wire `tokens/index.css` in above the components.

## Rules

Everything in [`CLAUDE.md`](../../../CLAUDE.md) applies; the points that matter most here:

- **HTML** carries the semantics. Native elements first (`<button>`, `<dialog>`, `<input>`, the
  Popover API) before any custom markup; a component is only accessible if its DOM says what it is.
- **CSS** owns positioning and visuals. Every value comes from the tokens in [`tokens/`](tokens)
  — no raw colors, spacings or radii in a component file. Responsive behaviour goes through media
  queries and container queries.
- **JS** handles interactivity and data. Visual changes it triggers are passed down as CSS custom
  properties rather than ad-hoc inline styles, and native browser APIs come before any library.
- Variants and states from Figma map to **props → data attributes or classes**, not to separate
  components: `<Button variant="primary" size="large">`, styled via `[data-variant="primary"]`.
- Each component ships with a `.spec.js` covering its states and its accessible API.
- Each component ships with a `.figma.tsx` so Figma links the design node to the real code (see
  below).

## Storybook

Components are showcased in [Storybook](https://storybook.js.org) (`.storybook/`), which loads every
`design-system/**/*.stories.jsx` and the app's global stylesheet (fonts, tokens, base styles).
It also loads [`.storybook/fonts.css`](../../.storybook/fonts.css), the Montserrat and Montserrat
Alternates the typography tokens name: the app still serves the legacy families, so without that
file the components here render in a fallback. Drop it once the app serves them.

```bash
yarn storybook        # dev server on http://localhost:6006
yarn build-storybook  # static build in storybook-static/
```

Docs pages are generated from the stories (`autodocs`) and the a11y addon audits each one.

## Figma Code Connect

`<Name>.figma.tsx` is the bridge between a Figma node and its implementation: once published, Figma
Dev Mode shows our actual JSX for that component instead of generated markup, and the MCP server
returns it too, which keeps generated code aligned with this folder.

```tsx
// Button/Button.figma.tsx
import figma from "@figma/code-connect";
import Button from "@design-systems/Button/Button";

figma.connect(Button, "<url of the Figma node>", {
  props: {
    // map Figma variants and layers onto the component props
    label: figma.string("Label"),
  },
  example: (props) => <Button>{props.label}</Button>,
});
```

The file is `.tsx` because Code Connect only parses that extension; it is read by the Figma CLI and
never bundled into the app, so it brings no TypeScript into the build. Jest only matches `.js` /
`.jsx` and ESLint only lints `.js` / `.mjs` / `.cjs`, so neither picks these files up.
[`figma.config.json`](../../figma.config.json) tells the CLI where they are; publishing a mapping
also needs `@figma/code-connect`, which is not installed yet.

## Component tracking

Status: ⬜ to do · ✅ done

Only the variants and states carried by the markup are listed, so a component counts as done once
all of them are covered. Interaction states (hover, pressed, focus) are not tracked: they belong to
every interactive component and are handled in CSS through the matching pseudo-classes.

### Buttons

| Component             | Figma name                | Variants / states                  | Status |
| --------------------- | ------------------------- | ---------------------------------- | ------ |
| Button                | `Button`                  | 3 styles × 2 sizes (large, medium) | ⬜     |
| ButtonIconAdd         | `Button/Icon/Add`         | —                                  | ⬜     |
| ButtonIconGameControl | `Button/Icon/GameControl` | —                                  | ⬜     |

### Icons

Figma has one component per icon; the code has one component for all of them, the icon being a
value rather than a component of its own — `<Icon name="chevron-left" />`, never `IconChevronLeft`.
`name` is the Figma name without its `Icon/` prefix, lowercased and hyphenated, and is also the name
of the asset in [`Icon/assets`](Icon/assets).

| Component | Figma name                                                                                                                                                                              | Variants / states                                    | Status |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------ |
| Icon      | `Icon/Add`, `Icon/Check`, `Icon/Chevron left`, `Icon/Chevron right`, `Icon/Close`, `Icon/Pause`, `Icon/Play`, `Icon/Search`, `Icon/Settings`, `Icon/Share`, `Icon/Skip`, `Icon/Warning` | 12 icons × 2 sizes (`xs` 30, `2xs` beside a caption) | ✅     |

### Forms

| Component     | Figma name        | Variants / states     | Status |
| ------------- | ----------------- | --------------------- | ------ |
| FormTextField | `Form/Text field` | —                     | ⬜     |
| FormField     | `Form/Form field` | error × filled, empty | ⬜     |
| FormSwitch    | `Form/Switch`     | selected true, false  | ⬜     |

### Cards

| Component                 | Figma name                      | Variants / states               | Status |
| ------------------------- | ------------------------------- | ------------------------------- | ------ |
| CardLogoContainer         | `Card/Logo container`           | —                               | ⬜     |
| CardTextContent           | `Card/Text content`             | —                               | ⬜     |
| CardMusicSelection        | `Card/Music selection`          | selected                        | ✅     |
| CardMusicSelectionLabel   | `Card/Music selection/Label`    | —                               | ⬜     |
| CardGameSelection         | `Card/Game selection`           | selected                        | ⬜     |
| CardThemeSelection        | `Card/Theme selection`          | vertical, horizontal × selected | ⬜     |
| CardThemeSelectionSeeMore | `Card/Theme selection see more` | selected                        | ⬜     |

### Navigation

| Component        | Figma name           | Variants / states        | Status |
| ---------------- | -------------------- | ------------------------ | ------ |
| NavigationTopBar | `Navigation/Top bar` | default, music connected | ⬜     |
| NavigationFooter | `Navigation/Footer`  | light, dark              | ⬜     |

### Overlays

| Component      | Figma name        | Variants / states   | Status |
| -------------- | ----------------- | ------------------- | ------ |
| OverlayPopover | `Overlay/Popover` | left, middle, right | ⬜     |
| OverlayScrim   | `Overlay/Scrim`   | —                   | ⬜     |

### Avatars and players

| Component        | Figma name          | Variants / states | Status |
| ---------------- | ------------------- | ----------------- | ------ |
| AvatarImage      | `Avatar/Image`      | —                 | ⬜     |
| AvatarSelectable | `Avatar/Selectable` | selected          | ⬜     |
| AvatarGrid       | `Avatar/Grid`       | —                 | ⬜     |
| ListPlayerItem   | `List/Player item`  | —                 | ⬜     |

### Game

| Component       | Figma name          | Variants / states | Status |
| --------------- | ------------------- | ----------------- | ------ |
| GameInfosManche | `Game/Infos manche` | —                 | ⬜     |
| GameControl     | `Game/Game control` | playing, paused   | ⬜     |
| Vinyle          | `Vinyle`            | —                 | ⬜     |

### Images

| Component   | Figma name      | Variants / states                                                                                                         | Status |
| ----------- | --------------- | ------------------------------------------------------------------------------------------------------------------------- | ------ |
| ImagePlayer | `Image/Player`  | —                                                                                                                         | ⬜     |
| ImageHost   | `Image/Host`    | —                                                                                                                         | ⬜     |
| ImageTheme  | `Image/Theme`   | 12 themes (default, Disney, disco, 80/90s, TV series, film music, French variety, rap, electro, rock, summer hit, reggae) | ⬜     |
| ImageQrCode | `Image/QR code` | —                                                                                                                         | ⬜     |

### Logos

| Component         | Figma name            | Variants / states                                         | Status |
| ----------------- | --------------------- | --------------------------------------------------------- | ------ |
| LogoApp           | `Logo/App`            | — (no size: fills its host)                               | ✅     |
| LogoAppLockup     | `Logo/App lockup`     | —                                                         | ⬜     |
| LogoMusicProvider | `Logo/Music provider` | 4 providers (Spotify, Deezer, Apple Music, YouTube Music) | ✅     |

### Templates

Page-level layouts in Figma, not design-system components. They are assembled in
[`client/src/pages`](../pages) from the components above; listed here only to keep the mapping with
Figma complete.

| Template | Figma name          | Breakpoints     | Status |
| -------- | ------------------- | --------------- | ------ |
| Screen 1 | `Template/Screen 1` | mobile, desktop | ⬜     |
| Screen 2 | `Template/Screen 2` | mobile, desktop | ⬜     |
| Panel    | `Template/Panel`    | mobile, desktop | ⬜     |

## Adding a component

1. Open its node in Figma and read its variants and states.
2. Create `design-system/<Name>/` with `<Name>.jsx`, `<Name>.css`, `<Name>.spec.js`,
   `<Name>.stories.jsx` and `<Name>.figma.tsx`.
3. Map every variant to a prop, every token to a custom property from `tokens/`; add a new
   token there rather than hardcoding a value.
4. Point `<Name>.figma.tsx` at the node URL and map its variants to the props.
5. Check keyboard navigation, focus visibility and contrast.
6. Flip its row above to ✅ in the same commit.

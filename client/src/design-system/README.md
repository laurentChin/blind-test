# Design system

Home of the reusable UI primitives of the client, built from the **COMPONENTS** section of the
[Figma file](https://www.figma.com/design/InmNwDuG3QcIKWYQYDQXCM/App-blind-test-Final?node-id=228-24238).

This folder is for design-system components only: pieces that are generic, reusable and own no game
logic. Feature components that orchestrate state or talk to a context stay in
[`client/src/components`](../components) and consume what lives here.

## Folder layout

One folder per component, named after it in PascalCase:

```
design-system/
  README.md
  Button/
    Button.jsx        markup, props and interactivity
    Button.css        positioning and visuals
    Button.spec.js    tests
    Button.stories.jsx Storybook stories, one per variant / state
    Button.figma.tsx  Code Connect mapping to the Figma component
```

Grouped Figma families (`Icon/*`, `Logo/*`, `Card/*`…) keep the family as a prefix in the folder
name — `IconClose`, `CardMusicSelection` — so the file tree stays flat and greppable.

## Rules

Everything in [`CLAUDE.md`](../../../CLAUDE.md) applies; the points that matter most here:

- **HTML** carries the semantics. Native elements first (`<button>`, `<dialog>`, `<input>`, the
  Popover API) before any custom markup; a component is only accessible if its DOM says what it is.
- **CSS** owns positioning and visuals. Every value comes from the tokens in
  [`styles/tokens.css`](../styles/tokens.css) — no raw colors, spacings or durations in a component
  file. Responsive behaviour goes through media queries and container queries.
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
import figma from '@figma/code-connect';
import Button from './Button';

figma.connect(Button, '<url of the Figma node>', {
  props: {
    // map Figma variants and layers onto the component props
    label: figma.string('Label'),
  },
  example: (props) => <Button>{props.label}</Button>,
});
```

The file is `.tsx` because Code Connect only parses that extension; it is read by the Figma CLI and
never bundled into the app, so it brings no TypeScript into the build. The file is skipped by Jest
and ESLint if their config does not pick it up — wire that up when the first mapping lands, along
with the `figma.config.json` holding the file key.

## Component tracking

Status: ⬜ to do · ✅ done

Only the variants and states carried by the markup are listed, so a component counts as done once
all of them are covered. Interaction states (hover, pressed, focus) are not tracked: they belong to
every interactive component and are handled in CSS through the matching pseudo-classes.

### Buttons

| Component | Figma name | Variants / states | Status |
| --- | --- | --- | --- |
| Button | `Button` | 3 styles × 2 sizes (large, medium) | ⬜ |
| ButtonIconAdd | `Button/Icon/Add` | — | ⬜ |
| ButtonIconGameControl | `Button/Icon/GameControl` | — | ⬜ |

### Icons

| Component | Figma name | Variants / states | Status |
| --- | --- | --- | --- |
| IconAdd | `Icon/Add` | — | ⬜ |
| IconCheck | `Icon/Check` | — | ⬜ |
| IconChevronLeft | `Icon/Chevron left` | — | ⬜ |
| IconChevronRight | `Icon/Chevron right` | — | ⬜ |
| IconClose | `Icon/Close` | — | ⬜ |
| IconPause | `Icon/Pause` | — | ⬜ |
| IconPlay | `Icon/Play` | — | ⬜ |
| IconSearch | `Icon/Search` | — | ⬜ |
| IconSettings | `Icon/Settings` | — | ⬜ |
| IconShare | `Icon/Share` | — | ⬜ |
| IconSkip | `Icon/Skip` | — | ⬜ |
| IconWarning | `Icon/Warning` | — | ⬜ |

### Forms

| Component | Figma name | Variants / states | Status |
| --- | --- | --- | --- |
| FormTextField | `Form/Text field` | — | ⬜ |
| FormField | `Form/Form field` | error × filled, empty | ⬜ |
| FormSwitch | `Form/Switch` | selected true, false | ⬜ |

### Cards

| Component | Figma name | Variants / states | Status |
| --- | --- | --- | --- |
| CardLogoContainer | `Card/Logo container` | — | ⬜ |
| CardTextContent | `Card/Text content` | — | ⬜ |
| CardMusicSelection | `Card/Music selection` | selected | ⬜ |
| CardMusicSelectionLabel | `Card/Music selection/Label` | — | ⬜ |
| CardGameSelection | `Card/Game selection` | selected | ⬜ |
| CardThemeSelection | `Card/Theme selection` | vertical, horizontal × selected | ⬜ |
| CardThemeSelectionSeeMore | `Card/Theme selection see more` | selected | ⬜ |

### Navigation

| Component | Figma name | Variants / states | Status |
| --- | --- | --- | --- |
| NavigationTopBar | `Navigation/Top bar` | default, music connected | ⬜ |
| NavigationFooter | `Navigation/Footer` | light, dark | ⬜ |

### Overlays

| Component | Figma name | Variants / states | Status |
| --- | --- | --- | --- |
| OverlayPopover | `Overlay/Popover` | left, middle, right | ⬜ |
| OverlayScrim | `Overlay/Scrim` | — | ⬜ |

### Avatars and players

| Component | Figma name | Variants / states | Status |
| --- | --- | --- | --- |
| AvatarImage | `Avatar/Image` | — | ⬜ |
| AvatarSelectable | `Avatar/Selectable` | selected | ⬜ |
| AvatarGrid | `Avatar/Grid` | — | ⬜ |
| ListPlayerItem | `List/Player item` | — | ⬜ |

### Game

| Component | Figma name | Variants / states | Status |
| --- | --- | --- | --- |
| GameInfosManche | `Game/Infos manche` | — | ⬜ |
| GameControl | `Game/Game control` | playing, paused | ⬜ |
| Vinyle | `Vinyle` | — | ⬜ |

### Images

| Component | Figma name | Variants / states | Status |
| --- | --- | --- | --- |
| ImagePlayer | `Image/Player` | — | ⬜ |
| ImageHost | `Image/Host` | — | ⬜ |
| ImageTheme | `Image/Theme` | 12 themes (default, Disney, disco, 80/90s, TV series, film music, French variety, rap, electro, rock, summer hit, reggae) | ⬜ |
| ImageQrCode | `Image/QR code` | — | ⬜ |

### Logos

| Component | Figma name | Variants / states | Status |
| --- | --- | --- | --- |
| LogoApp | `Logo/App` | — | ⬜ |
| LogoAppLockup | `Logo/App lockup` | — | ⬜ |
| LogoSpotify | `Logo/Spotify` | — | ⬜ |
| LogoDeezer | `Logo/Deezer` | — | ⬜ |
| LogoAppleMusic | `Logo/Apple Music` | — | ⬜ |
| LogoYouTube | `Logo/YouTube` | — | ⬜ |

### Templates

Page-level layouts in Figma, not design-system components. They are assembled in
[`client/src/pages`](../pages) from the components above; listed here only to keep the mapping with
Figma complete.

| Template | Figma name | Breakpoints | Status |
| --- | --- | --- | --- |
| Screen 1 | `Template/Screen 1` | mobile, desktop | ⬜ |
| Screen 2 | `Template/Screen 2` | mobile, desktop | ⬜ |
| Panel | `Template/Panel` | mobile, desktop | ⬜ |

## Adding a component

1. Open its node in Figma and read its variants and states.
2. Create `design-system/<Name>/` with `<Name>.jsx`, `<Name>.css`, `<Name>.spec.js`,
   `<Name>.stories.jsx` and `<Name>.figma.tsx`.
3. Map every variant to a prop, every token to a custom property from `styles/tokens.css`; add a new
   token there rather than hardcoding a value.
4. Point `<Name>.figma.tsx` at the node URL and map its variants to the props.
5. Check keyboard navigation, focus visibility and contrast.
6. Flip its row above to ✅ in the same commit.

---
name: build-design-system-component
description: This skill should be used when the user asks to "create a design system component", "generate a design system component", "update a design system component", "modify a design system component".
version: 1.0.0
---

# Build Design System Component

Generates or update a design system component defined in [https://www.figma.com/design/xMZfJlAcIUSF0m3glBlrG3/App-blind-test-Final?node-id=228-24238](https://www.figma.com/design/xMZfJlAcIUSF0m3glBlrG3/App-blind-test-Final?node-id=228-24238).

## Structure

Every design system component have to be defined in a folder named after the component, inside the `client/src/design-system` folder with the following structure:

```
    my-component/
      |_ my-component.figma.jsx
      |_ MyComponent.stories.jsx
      |_ MyComponent.test.jsx
      |_ MyComponent.jsx
      |_ assets/
        |_ my-component.svg
        |_ my-component.png
```

## Building rules
- native browser APIs and semantic element must always be favored
- no redundant props like `showIcon` with an `icon` prop, use an `icon` prop only instead and just make it optional
- no `hover` or `focus` kind of props they should be handled by the component itself as browser's element state when existing
- for `figma.instance` props cast them as `figma.instance<ReactNode>` not with `as`
- a11y must be a first class citizen using html attributes and proper html element 
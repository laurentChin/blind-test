# blind-test

## Client — règles HTML/CSS/JS (durable)

Séparation stricte des responsabilités entre HTML, CSS et JavaScript dans `client/`.

- **HTML** structure la page : sémantique des tags, profondeur du DOM, accessibilité sont fondamentaux. Utiliser les éléments récents (`<dialog>`, Popover API, etc.) quand le support cross-navigateur est bon.
- **CSS** est responsable du positionnement et du visuel. S'appuyer sur les nouveautés CSS. Le responsive se gère prioritairement via **media queries** et **container queries**.
- **JavaScript** gère l'interactivité et le calcul des données. Les changements visuels qu'il déclenche passent de préférence par des **CSS custom properties** plutôt que du style inline ad hoc. Favoriser les **API natives du navigateur** plutôt que des bibliothèques quand une solution native existe.
- **Imports** : jamais d'import relatif dans `client/src`. Utiliser les alias : `@components`, `@contexts`, `@design-systems` (→ `design-system/`), `@helpers`, `@pages`, `@styles` pour leurs dossiers respectifs, et `@/` (→ `client/src/`) pour le reste (`hooks`, `App`, etc.), ex. `import Toast from "@components/Toast/Toast"`. Alias déclaré dans `rsbuild.config.mjs` (`resolve.alias`), `jest.config.mjs` (`moduleNameMapper`) et `jsconfig.json` ; à garder synchronisés.

## Commits

Toujours en anglais (messages de commit, titres/corps de PR), même si la conversation est en français.

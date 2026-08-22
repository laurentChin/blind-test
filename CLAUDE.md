# blind-test

## Client — règles HTML/CSS/JS (durable)

Séparation stricte des responsabilités entre HTML, CSS et JavaScript dans `client/`.

- **HTML** structure la page : sémantique des tags, profondeur du DOM, accessibilité sont fondamentaux. Utiliser les éléments récents (`<dialog>`, Popover API, etc.) quand le support cross-navigateur est bon.
- **CSS** est responsable du positionnement et du visuel. S'appuyer sur les nouveautés CSS. Le responsive se gère prioritairement via **media queries** et **container queries**.
- **JavaScript** gère l'interactivité et le calcul des données. Les changements visuels qu'il déclenche passent de préférence par des **CSS custom properties** plutôt que du style inline ad hoc. Favoriser les **API natives du navigateur** plutôt que des bibliothèques quand une solution native existe.

## Commits

Toujours en anglais (messages de commit, titres/corps de PR), même si la conversation est en français.

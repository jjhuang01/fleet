# Theme tokens leak in four directions at once

Light mode looked broken in ways that had four unrelated causes, and a naive audit
script reported "clean" while the sidebar was still painting dark. Notes here so the
next theme change does not re-learn them.

## 1. Nested `var()` on `:root` resolves against the *initial* values

`index.css` declares the dark Fleet theme on `:root`, including glass aliases written
as `color-mix(in srgb, var(--fleet-bg) 40%, transparent)`. Custom properties are
substituted where they are *declared*, not where they are used, so redefining
`--fleet-bg` on the App root left `--fleet-glass-chrome` holding the dark value.
Every surface that paints with a glass token (sidebar, agent cards, pane headers)
stayed dark while the rest of the window went light.

Fix: `getAppThemeCssVars` publishes the glass tokens as resolved values alongside the
base tokens, so both are overridden at the same cascade level.

## 2. Portals do not inherit from the App root

Radix menus, dialogs and toasts mount under `document.body`, outside the element that
carries the theme vars. They fell back to the dark `:root` defaults. The App now also
writes the resolved vars onto `document.documentElement`.

## 3. An unlayered helper class outranks every Tailwind utility

`fleet-accent-bg` is a plain rule in `index.css`, so it is *unlayered*, and unlayered
styles beat anything in `@layer utilities` regardless of specificity. A primary button
written as `fleet-accent-bg ... disabled:bg-fleet-surface-2 disabled:text-fleet-text-subtle`
therefore kept its accent fill when disabled, and only the text went gray - 1.04:1
contrast on the label. Nothing in the lint or type check can see this.

Rule: do not combine `fleet-accent-*` helpers with a `disabled:bg-*` utility. Disable
with `disabled:opacity-*`, which is what the rest of the app already does.

## 4. `getComputedStyle` returns `oklch()`, not `rgb()`

A contrast-audit script that parsed colors with a `rgb()` regex saw `null` for every
Tailwind v4 color and silently skipped it, so it reported zero dark surfaces on a
screen that was visibly dark. Resolve colors by painting them into a 1x1 canvas and
reading the pixel - that handles `oklch`, `color-mix` and alpha correctly.

## Also worth remembering

- Hardcoded `neutral-*` markup does not follow the theme. Overlays and modals that
  were written that way stayed dark in light mode; they now use `fleet-*` tokens.
- highlight.js shipped `atom-one-dark.css` globally, so light-mode fenced code blocks
  were dark panels with light borders. Light is the default import now, with the dark
  palette scoped to `.dark` in `assets/hljs-atom-one-dark.css`.
- A renderer that must choose a palette React cannot express as a class (the diff
  viewer's Shiki theme) has to receive the resolved kind as a prop. Reading the root
  `.dark` class during render lags one render behind the layout effect that sets it.

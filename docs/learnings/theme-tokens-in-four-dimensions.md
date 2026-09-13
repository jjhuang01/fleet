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
- CodeMirror is the same shape of problem, one layer lower. `oneDark` ships its own
  `.cm-editor { background: #282c34 }`, and it is imported *after* `index.css`, so a
  `bg-fleet-*` class on the container never reaches the editor the user sees - the
  pane is light and the writing surface is a dark slab. `.fleet-editor` in `index.css`
  is unlayered, which is what it takes to win, and `FileEditorPane` swaps the syntax
  palette through a `Compartment` so the swap does not cost undo history.
  Where the two disagree, CodeMirror decides by style-module mount order, and the
  *earlier* extension is the one that wins - so the editor's own `EditorView.theme()`
  has to sit before the `Compartment`, not after it. Measured: with it after, a dark
  theme left the text in `oneDark`'s `#abb2bf`; with it before, the same pane reports
  `--fleet-text` and `--fleet-text-subtle` in both modes (17.2:1 and 4.6:1 on the dark
  surface). Deleting the `index.css` rule entirely, for the same reason, put
  `rgb(40, 44, 52)` back as the surface, so that half stays as the two-class guarantee.
  `EditorView.baseTheme` also outlines the focused editor with `1px dotted #212121`,
  invisible on the old dark slab and loud on a light one; the editor theme turns it off.
- xterm 6 moved the terminal background off `.xterm-viewport` and onto the
  `.xterm-scrollable-element` it added, as an *inline* style carrying the active
  theme colour. `--fleet-term-bg` was still only reaching the viewport, so the pane's
  16px of padding kept `inactiveBackground` while the interior stayed in the active
  colour: a 1.05:1 seam, invisible on dark presets and obvious on light ones. Both
  elements are cleared in `index.css` now, and the pane's own ground shows through.
- A grep for dark surfaces only finds `bg-*` classes. Two light-mode leftovers were
  style objects instead: the image viewer's checkerboard (`#111` / `#1c1c1c`) and the
  PDF page's `shadow-black/40`. Both are tokenised / mode-split now, but the audit
  needs a pass over inline `style` and `shadow-*` too, not just class names.

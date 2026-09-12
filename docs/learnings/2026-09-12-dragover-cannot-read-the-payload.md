# A drag never carries a readable payload until it is dropped

## What happened

Dragging a terminal pane by its header lit up a drop preview on the pane being dragged itself, so
the pane you were moving offered to accept its own drop. Releasing there did nothing, which made the
gesture look broken rather than inert. The tab drag in the sidebar had no such problem even though
both read the same kind of payload.

## The actual cause

HTML drag and drop puts the `DataTransfer` in "protected mode" for every event except `dragstart`
and `drop`: `getData()` returns the empty string during `dragenter` / `dragover` / `dragleave`. Only
`types` can be read before the drop.

The pane check was

```ts
event.dataTransfer.types.includes('application/x-fleet-pane-id') &&
  event.dataTransfer.getData('application/x-fleet-pane-id') !== paneId;
```

so the second half compared `'' !== paneId` and was always true - the payload check never ran. The
sidebar never had this bug because it identifies the dragged tab from React state (`dragIndex`), not
from the data transfer.

## The fix

The pane frame tracks whether it is the drag source, using `dragstart` / `dragend` (both bubble from
the header), and refuses drops while it is. `acceptsPane` now only checks `types`; the payload is
still read in `drop`, where it is legal.

```tsx
onDragStartCapture = { handleDragStart }; // setIsDragSource(true)
onDragEndCapture = { handleDragEnd }; // setIsDragSource(false)
```

## How it was verified

Driving a real OS-level drag through CDP (`page.mouse.down/move`) on a two-pane tab, the preview
overlay is queried by its classes:

```
before: dragging pane 0 over itself   -> preview present: true   rect 196,32 247x760
after:  dragging pane 0 over itself   -> preview present: false
after:  dragging pane 0 onto pane 1   -> preview present: true   rect 945,32 247x760 (right half)
```

The cross-pane drop still reorders the tree, and the `.xterm` count is unchanged, so the fix did not
cost the gesture it was guarding.

## Guardrail

In `dragenter` / `dragover` only `dataTransfer.types` is real. Anything that needs the dragged
identity as the cursor moves has to come from app state; the payload is a drop-time value. A
synthetic `DragEvent` will not reproduce this - a hand-built `DataTransfer` answers `getData` in
every phase, so the bug only shows up under a real drag.

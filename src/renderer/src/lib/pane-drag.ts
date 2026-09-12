/**
 * The drag type a pane's title bar stamps onto the drag payload.
 *
 * A drag's data is unreadable while it is in flight - `getData` only answers on
 * the drop - so every drop target decides whether it is looking at a pane by
 * checking for this type. One constant, so a target can never agree with a
 * source that spells it differently.
 */
export const PANE_DRAG_MIME = 'application/x-fleet-pane-id';

export function hasPanePayload(event: { dataTransfer: DataTransfer }): boolean {
  return event.dataTransfer.types.includes(PANE_DRAG_MIME);
}

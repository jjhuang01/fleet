import { Command as CommandPrimitive } from 'cmdk';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { dialogFadeAnim } from '../../lib/motion';

/** Root command menu. Forwards all cmdk Command props (shouldFilter, value, onValueChange, filter, loop, onKeyDown). */
export const Command = CommandPrimitive;

type CommandDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name of the dialog. Rendered as a hidden `DialogTitle`. */
  label: string;
  /** Accessible description, announced once when the dialog opens. */
  description: string;
  children: React.ReactNode;
  /** Forwarded to the root Command (e.g. onKeyDown, value, onValueChange, shouldFilter). */
  commandProps?: React.ComponentProps<typeof CommandPrimitive>;
};

/**
 * Fleet-themed cmdk dialog. cmdk renders a Radix Dialog internally, giving us
 * focus trap, focus restore, and scroll lock. We style its overlay/content via
 * the [cmdk-overlay] / [cmdk-dialog] data attributes.
 */
export function CommandDialog({
  open,
  onOpenChange,
  label,
  description,
  children,
  commandProps
}: CommandDialogProps): React.JSX.Element {
  return (
    <CommandPrimitive.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label={label}
      // cmdk applies data-state on the dialog; reuse the app's fade convention.
      // Reduced-motion is neutralized globally in index.css.
      overlayClassName={`fixed inset-0 z-50 bg-black/25 dark:bg-black/60 ${dialogFadeAnim}`}
      contentClassName={`fixed left-1/2 top-[18vh] z-50 w-[640px] max-w-[90vw] -translate-x-1/2 overflow-hidden rounded-xl border border-fleet-border-strong bg-fleet-surface shadow-2xl ${dialogFadeAnim} motion-reduce:transition-none`}
      {...commandProps}
    >
      {/* cmdk's Dialog points DialogContent's `aria-labelledby` at a
          DialogTitle it never renders, so the palette had no accessible name
          at all and Radix said so on every open. Both nodes are hidden: the
          input is the heading a sighted user reads. */}
      <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
      <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
      {children}
    </CommandPrimitive.Dialog>
  );
}

export function CommandInput(
  props: React.ComponentProps<typeof CommandPrimitive.Input>
): React.JSX.Element {
  return (
    <div className="flex items-center border-b border-fleet-border px-4">
      <CommandPrimitive.Input
        {...props}
        className="h-12 w-full bg-transparent text-[15px] text-fleet-text outline-none placeholder:text-fleet-text-subtle focus-ring"
      />
    </div>
  );
}

export function CommandList(
  props: React.ComponentProps<typeof CommandPrimitive.List>
): React.JSX.Element {
  return (
    <CommandPrimitive.List
      {...props}
      className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2"
    />
  );
}

export function CommandEmpty(
  props: React.ComponentProps<typeof CommandPrimitive.Empty>
): React.JSX.Element {
  return (
    <CommandPrimitive.Empty
      {...props}
      className="py-8 text-center text-sm text-fleet-text-subtle"
    />
  );
}

export function CommandGroup(
  props: React.ComponentProps<typeof CommandPrimitive.Group>
): React.JSX.Element {
  return (
    <CommandPrimitive.Group
      {...props}
      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fleet-text-subtle"
    />
  );
}

export function CommandItem(
  props: React.ComponentProps<typeof CommandPrimitive.Item>
): React.JSX.Element {
  return (
    <CommandPrimitive.Item
      {...props}
      className="flex h-12 cursor-pointer select-none items-center gap-2 rounded-lg px-3 text-sm text-fleet-text-secondary outline-none data-[selected=true]:bg-fleet-surface-3 data-[selected=true]:text-fleet-text data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
    />
  );
}

export const CommandSeparator = CommandPrimitive.Separator;

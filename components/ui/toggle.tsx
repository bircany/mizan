import { cn } from "@/lib/utils";

type ToggleProps = {
  checked: boolean;
  className?: string;
  description?: string;
  disabled?: boolean;
  id: string;
  label: string;
  name: string;
  onCheckedChange: (checked: boolean) => void;
};

export function Toggle({ checked, className, description, disabled = false, id, label, name, onCheckedChange }: ToggleProps) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", disabled && "cursor-not-allowed opacity-60", className)} htmlFor={id}>
      <span className="relative mt-0.5 block h-6 w-11 shrink-0 [-webkit-tap-highlight-color:transparent]">
        <input
          checked={checked}
          className="peer sr-only"
          disabled={disabled}
          id={id}
          name={name}
          onChange={(event) => onCheckedChange(event.target.checked)}
          type="checkbox"
        />
        <span className="absolute inset-0 m-auto h-2 rounded-full bg-outline-variant transition-colors peer-checked:bg-primary/45" />
        <span className="absolute inset-y-0 start-0 m-auto size-6 rounded-full bg-on-surface-variant shadow-sm transition-[inset-inline-start,background-color] peer-checked:start-5 peer-checked:bg-primary" />
      </span>
      <span className="text-sm text-on-surface-variant">
        <span className="block font-medium text-on-surface">{label}</span>
        {description ? <span className="mt-0.5 block">{description}</span> : null}
      </span>
    </label>
  );
}

import { QurbaniIcon } from "./qurbani-icon";

export function DonationCategoryIcon({ name = "category", className = "" }: { name?: string; className?: string }) {
  return name === "qurbani"
    ? <QurbaniIcon className={`inline-block size-[1em] shrink-0 ${className}`} />
    : <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
}

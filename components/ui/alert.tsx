import { AlertCircle, Info } from "lucide-react";

import { cn } from "@/lib/utils";

type AlertProps = {
  children: React.ReactNode;
  className?: string;
  tone?: "error" | "info";
};

export function Alert({ children, className, tone = "info" }: AlertProps) {
  const Icon = tone === "error" ? AlertCircle : Info;

  return (
    <div className={cn("border-2 p-4 shadow-[4px_4px_0_0] shadow-black", tone === "error" ? "border-error/40 bg-error/10 text-error" : "border-primary/30 bg-primary/10 text-primary", className)} role="alert">
      <div className="flex items-start gap-3">
        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <strong className="block flex-1 leading-tight font-semibold">{children}</strong>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
import { AlertTriangle, Info, CheckCircle2, X } from "lucide-react";

type Tone = "error" | "warn" | "info" | "success";

const STYLES: Record<Tone, string> = {
  error: "bg-[rgba(107,31,10,0.06)] border-[rgba(107,31,10,0.35)] text-[var(--c-danger)]",
  warn: "bg-[rgba(122,74,26,0.08)] border-[rgba(122,74,26,0.35)] text-[var(--c-warn)]",
  info: "bg-[var(--color-forest-dew)] border-[var(--color-stone-moss)] text-[var(--color-valley-green)]",
  success: "bg-[var(--color-forest-dew)] border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)]",
};

const ICONS = {
  error: AlertTriangle,
  warn: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};

export default function InlineBanner({
  tone = "info",
  children,
  onDismiss,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const Icon = ICONS[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 p-3 rounded-xl border text-sm",
        STYLES[tone],
        className
      )}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-0.5 rounded hover:opacity-70"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

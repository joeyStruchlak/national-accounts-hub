import { cn } from "@/lib/utils";

type AIStatusProps = {
  status: "cleared" | "review" | "flagged";
  className?: string;
};

const statusConfig = {
  cleared: { label: "Cleared", dotClass: "bg-success" },
  review: { label: "Needs Review", dotClass: "bg-warning" },
  flagged: { label: "Flagged", dotClass: "bg-destructive" },
};

export function AIStatusBadge({ status, className }: AIStatusProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "cleared" && "bg-success/10 text-success",
        status === "review" && "bg-warning/10 text-warning",
        status === "flagged" && "bg-destructive/10 text-destructive",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      {config.label}
    </span>
  );
}

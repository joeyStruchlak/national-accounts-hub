import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: string;
  variant?: "default" | "outline";
  className?: string;
};

const variantMap: Record<string, string> = {
  "Pending Review": "bg-warning/10 text-warning border-warning/20",
  "Flagged": "bg-destructive/10 text-destructive border-destructive/20 animate-pulse-glow",
  "Cleared": "bg-accent/10 text-accent border-accent/20",
  "In Progress": "bg-accent/10 text-accent border-accent/20",
  "Completed": "bg-accent/10 text-accent border-accent/20",
  "Overdue": "bg-destructive/10 text-destructive border-destructive/20",
  "Reconciled": "bg-accent/10 text-accent border-accent/20",
  "Outstanding": "bg-warning/10 text-warning border-warning/20",
  "Discrepancy": "bg-destructive/10 text-destructive border-destructive/20",
  "Compliant": "bg-accent/10 text-accent border-accent/20",
  "Non-Compliant": "bg-destructive/10 text-destructive border-destructive/20",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2.5 py-0.5 text-xs font-medium",
        variantMap[status] || "bg-muted text-muted-foreground border-border",
        className
      )}
    >
      {status}
    </span>
  );
}

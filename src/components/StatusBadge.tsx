import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: string;
  variant?: "default" | "outline";
  className?: string;
};

const variantMap: Record<string, string> = {
  "Pending Review": "bg-warning/10 text-warning border-warning/20",
  "Flagged": "bg-destructive/10 text-destructive border-destructive/20",
  "Cleared": "bg-success/10 text-success border-success/20",
  "In Progress": "bg-accent/10 text-accent border-accent/20",
  "Completed": "bg-success/10 text-success border-success/20",
  "Overdue": "bg-destructive/10 text-destructive border-destructive/20",
  "Reconciled": "bg-success/10 text-success border-success/20",
  "Outstanding": "bg-warning/10 text-warning border-warning/20",
  "Discrepancy": "bg-destructive/10 text-destructive border-destructive/20",
  "Compliant": "bg-success/10 text-success border-success/20",
  "Non-Compliant": "bg-destructive/10 text-destructive border-destructive/20",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantMap[status] || "bg-muted text-muted-foreground border-border",
        className
      )}
    >
      {status}
    </span>
  );
}

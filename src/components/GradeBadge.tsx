import { cn } from "@/lib/utils";

type GradeBadgeProps = {
  grade: "Bronze" | "Silver" | "Gold" | "Platinum";
  className?: string;
};

const gradeStyles: Record<string, string> = {
  Bronze: "bg-amber-800/10 text-amber-800 border-amber-800/20",
  Silver: "bg-slate-400/10 text-slate-500 border-slate-400/20",
  Gold: "bg-accent/10 text-accent border-accent/20",
  Platinum: "bg-primary/10 text-primary border-primary/20",
};

export function GradeBadge({ grade, className }: GradeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        gradeStyles[grade],
        className
      )}
    >
      {grade}
    </span>
  );
}

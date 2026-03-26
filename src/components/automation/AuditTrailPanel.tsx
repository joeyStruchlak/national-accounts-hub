import { cn } from "@/lib/utils";

const auditEvents = [
  { time: "09:17am", text: "Report saved to database", color: "bg-accent" },
  { time: "09:16am", text: "3 issues flagged — Meridian Property Group", color: "bg-warning" },
  { time: "09:15am", text: "BAS Review triggered by Sarah M.", color: "bg-accent" },
  { time: "09:14am", text: "Xero OAuth 2.0 token refreshed", color: "bg-muted-foreground" },
  { time: "08:00am", text: "Weekly Productivity Report completed", color: "bg-accent" },
];

export function AuditTrailPanel() {
  return (
    <div className="mt-6 rounded-md border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
        Audit Trail
      </h3>
      <div className="space-y-2.5">
        {auditEvents.map((e, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className={cn("h-2 w-2 rounded-full shrink-0", e.color)} />
            <span className="text-muted-foreground font-mono text-xs w-16 shrink-0">{e.time}</span>
            <span className="text-foreground">{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

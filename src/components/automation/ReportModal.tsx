import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type AutomationType = "bas" | "payroll" | "productivity";

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: AutomationType | null;
  report: string | null;
}

const reportData: Record<AutomationType, {
  title: string;
  summary: { label: string; value: string }[];
  flagged: { item: string; severity: "high" | "medium" | "low"; detail: string }[];
  actions: string[];
}> = {
  bas: {
    title: "BAS / GST Review Report",
    summary: [
      { label: "Returns Analysed", value: "287" },
      { label: "Issues Detected", value: "12" },
      { label: "Clients Affected", value: "8" },
      { label: "Compliance Rate", value: "95.8%" },
    ],
    flagged: [
      { item: "Meridian Property Group", severity: "high", detail: "3 missing tax codes on Q3 transactions" },
      { item: "Coastal Builders Pty Ltd", severity: "high", detail: "GST-free supplies miscoded as taxable" },
      { item: "Sydney Tech Solutions", severity: "medium", detail: "2 BAS lodgement dates at risk" },
      { item: "Harbour View Dental", severity: "low", detail: "Minor rounding variance ($12.40)" },
    ],
    actions: [
      "Review Meridian Property Group tax codes before lodgement",
      "Schedule client advisory for Coastal Builders recurring miscoding",
      "Verify BAS lodgement dates for at-risk clients",
      "Run follow-up review after corrections applied",
    ],
  },
  payroll: {
    title: "Payroll Reconciliation Report",
    summary: [
      { label: "Records Checked", value: "142" },
      { label: "Discrepancies", value: "0" },
      { label: "STP Verified", value: "Yes" },
      { label: "Match Rate", value: "100%" },
    ],
    flagged: [],
    actions: [
      "No action required — all records reconciled successfully",
      "STP lodgements verified and compliant",
    ],
  },
  productivity: {
    title: "Weekly Productivity Report",
    summary: [
      { label: "Staff Reviewed", value: "16" },
      { label: "Avg Utilisation", value: "78%" },
      { label: "Weekly Revenue", value: "$71,250" },
      { label: "Overdue Items", value: "23" },
    ],
    flagged: [
      { item: "Michael R.", severity: "high", detail: "Utilisation at 45% — well below 60% target" },
      { item: "David K.", severity: "medium", detail: "Utilisation at 65% — borderline" },
      { item: "Emma L.", severity: "low", detail: "Utilisation at 78% — within range but declining" },
    ],
    actions: [
      "Schedule capacity review with Michael R.",
      "Monitor David K. utilisation next fortnight",
      "Partner summary ready for download",
    ],
  },
};

const severityConfig = {
  high: { className: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle },
  medium: { className: "bg-warning/10 text-warning border-warning/30", icon: Info },
  low: { className: "bg-accent/10 text-accent border-accent/30", icon: CheckCircle2 },
};

export function ReportModal({ open, onOpenChange, type, report }: ReportModalProps) {
  if (!type) return null;
  const data = reportData[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{data.title}</DialogTitle>
          <DialogDescription>Generated just now · All data verified</DialogDescription>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3 mt-2">
          {data.summary.map((s) => (
            <div key={s.label} className="rounded-md border border-border bg-muted/40 p-3 text-center">
              <p className="text-lg font-bold text-primary">{s.value}</p>
              <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Flagged Items */}
        {data.flagged.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-primary mb-2">Flagged Items</h4>
            <div className="border border-border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left px-3 py-2 font-semibold">Item</th>
                    <th className="text-left px-3 py-2 font-semibold">Severity</th>
                    <th className="text-left px-3 py-2 font-semibold">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data.flagged.map((f, i) => {
                    const sev = severityConfig[f.severity];
                    return (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 font-medium">{f.item}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={cn("text-[10px] uppercase", sev.className)}>
                            {f.severity}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{f.detail}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-primary mb-2">Recommended Actions</h4>
          <ul className="space-y-1.5">
            {data.actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                {a}
              </li>
            ))}
          </ul>
        </div>

        {/* Export Button */}
        <div className="mt-5 flex justify-end">
          <Button className="gradient-amber text-primary font-semibold">
            <Download className="mr-2 h-4 w-4" />
            Export to PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

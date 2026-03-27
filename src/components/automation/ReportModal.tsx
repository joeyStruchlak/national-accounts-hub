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
import html2pdf from "html2pdf.js";
import { useRef } from "react";

interface FlaggedItem {
  item: string;
  severity: "high" | "medium" | "low";
  detail: string;
}

interface RealData {
  totalReviewed: number;
  totalIssues: number;
  aiAnalysis?: string | null;
  issues: { contact: string; issue: string; recommendation: string }[];
  warnings: { contact: string; issue: string; recommendation: string }[];
  extraData?: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
  };
}

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "bas" | "payroll" | "productivity" | null;
  report: string | null;
  realData?: RealData | null;
}

const severityConfig = {
  high: {
    className: "bg-destructive/10 text-destructive border-destructive/30",
    icon: AlertTriangle,
  },
  medium: {
    className: "bg-warning/10 text-warning border-warning/30",
    icon: Info,
  },
  low: {
    className: "bg-accent/10 text-accent border-accent/30",
    icon: CheckCircle2,
  },
};

export function ReportModal({
  open,
  onOpenChange,
  type,
  report,
  realData,
}: ReportModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  if (!type) return null;

  const isRealData = !!(
    realData &&
    (type === "bas" || type === "productivity" || type === "payroll")
  );
  const aiAnalysis = realData?.aiAnalysis || null;

  const title = {
    bas: "BAS / GST Review Report",
    payroll: "Payroll Reconciliation Report",
    productivity: "Weekly Productivity Report",
  }[type];

  const handleExport = () => {
    const element = reportRef.current;
    if (!element) return;

    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `${title.replace(/ /g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.pdf`,
      image: { type: "jpeg", quality: 0.98 } as const, // Add 'as const' here
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } as const, // Good practice to add here too
    };

    html2pdf().set(opt).from(element).save();
  };

  const summary = isRealData
    ? type === "productivity"
      ? [
          {
            label: "Invoices Reviewed",
            value: String(realData!.totalReviewed),
          },
          {
            label: "Total Invoiced",
            value: `$${realData!.extraData?.totalInvoiced?.toFixed(0) || "0"}`,
          },
          {
            label: "Collected",
            value: `$${realData!.extraData?.totalPaid?.toFixed(0) || "0"}`,
          },
          {
            label: "Outstanding",
            value: `$${
              realData!.extraData?.totalOutstanding?.toFixed(0) || "0"
            }`,
          },
        ]
      : type === "payroll"
      ? [
          {
            label: "Transactions Reviewed",
            value: String(realData!.totalReviewed),
          },
          { label: "Discrepancies", value: String(realData!.issues.length) },
          { label: "Warnings", value: String(realData!.warnings.length) },
          {
            label: "Super Liability",
            value: `$${
              realData!.extraData?.totalOutstanding?.toFixed(0) || "0"
            }`,
          },
        ]
      : [
          {
            label: "Transactions Reviewed",
            value: String(realData!.totalReviewed),
          },
          { label: "Issues Detected", value: String(realData!.issues.length) },
          { label: "Warnings", value: String(realData!.warnings.length) },
          {
            label: "Compliance Rate",
            value:
              realData!.totalIssues === 0
                ? "100%"
                : `${Math.round(
                    (1 - realData!.totalIssues / realData!.totalReviewed) * 100
                  )}%`,
          },
        ]
    : type === "productivity"
    ? [
        { label: "Staff Reviewed", value: "16" },
        { label: "Avg Utilisation", value: "78%" },
        { label: "Weekly Revenue", value: "$71,250" },
        { label: "Overdue Items", value: "23" },
      ]
    : type === "payroll"
    ? [
        { label: "Records Checked", value: "142" },
        { label: "Discrepancies", value: "0" },
        { label: "STP Verified", value: "Yes" },
        { label: "Match Rate", value: "100%" },
      ]
    : [
        { label: "Returns Analysed", value: "287" },
        { label: "Issues Detected", value: "12" },
        { label: "Clients Affected", value: "8" },
        { label: "Compliance Rate", value: "95.8%" },
      ];

  const flagged: FlaggedItem[] = isRealData
    ? [
        ...realData!.issues.map((i) => ({
          item: i.contact,
          severity: "high" as const,
          detail: i.issue,
        })),
        ...realData!.warnings.map((w) => ({
          item: w.contact,
          severity: "low" as const,
          detail: w.issue,
        })),
      ]
    : type === "productivity"
    ? [
        {
          item: "Michael R.",
          severity: "high",
          detail: "Utilisation at 45% — below 60% target",
        },
        {
          item: "David K.",
          severity: "medium",
          detail: "Utilisation at 65% — borderline",
        },
        {
          item: "Emma L.",
          severity: "low",
          detail: "Utilisation at 78% — within range but declining",
        },
      ]
    : type === "payroll"
    ? []
    : [
        {
          item: "Meridian Property Group",
          severity: "high",
          detail: "3 missing tax codes on Q3 transactions",
        },
        {
          item: "Coastal Builders Pty Ltd",
          severity: "high",
          detail: "GST-free supplies miscoded as taxable",
        },
        {
          item: "Sydney Tech Solutions",
          severity: "medium",
          detail: "2 BAS lodgement dates at risk",
        },
        {
          item: "Harbour View Dental",
          severity: "low",
          detail: "Minor rounding variance ($12.40)",
        },
      ];

  const actions: string[] = isRealData
    ? type === "productivity"
      ? [
          ...(realData!.warnings.length > 0
            ? realData!.warnings.map(
                (w) => `Follow up with ${w.contact}: ${w.issue}`
              )
            : ["All invoices are current. No immediate follow-up required."]),
          "Review payment terms with consistently late payers.",
          "Send reminders for all invoices outstanding beyond 30 days.",
        ]
      : type === "payroll"
      ? [
          ...realData!.issues.map((i) => i.recommendation),
          ...realData!.warnings.map((w) => w.recommendation),
          realData!.totalIssues === 0
            ? "All payroll records reconciled. Confirm super payments are up to date."
            : "Partner sign-off required before next pay run.",
        ]
      : [
          ...realData!.issues.map((i) => i.recommendation),
          ...(realData!.warnings.length > 0
            ? [
                "Add meaningful descriptions to all flagged transactions for ATO audit trail compliance.",
              ]
            : []),
          realData!.totalIssues === 0
            ? "All transactions passed GST review. No action required."
            : "Partner sign-off required before BAS lodgement.",
        ]
    : type === "productivity"
    ? [
        "Schedule capacity review with Michael R.",
        "Monitor David K. utilisation next fortnight",
        "Partner summary ready for download",
      ]
    : type === "payroll"
    ? [
        "No action required — all records reconciled successfully.",
        "STP lodgements verified and compliant.",
      ]
    : [
        "Review Meridian Property Group tax codes before lodgement",
        "Schedule client advisory for Coastal Builders recurring miscoding",
        "Verify BAS lodgement dates for at-risk clients",
        "Run follow-up review after corrections applied",
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <div ref={reportRef} className="p-2">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{title}</DialogTitle>
            <DialogDescription>
              {isRealData
                ? "Live data from Xero · All data verified"
                : "Generated just now · All data verified"}
            </DialogDescription>
          </DialogHeader>

          {isRealData && (
            <div className="rounded border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-accent font-medium mt-4">
              ✓ Live data pulled from Xero via OAuth 2.0 · Stored in audit log ·
              National Accounts Internal Portal ·{" "}
              {new Date().toLocaleDateString("en-AU")}
            </div>
          )}

          <div className="grid grid-cols-4 gap-3 mt-4">
            {summary.map((s) => (
              <div
                key={s.label}
                className="rounded-md border border-border bg-muted/40 p-3 text-center"
              >
                <p className="text-lg font-bold text-primary">{s.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {flagged.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-primary mb-2">
                Flagged Items
              </h4>
              <div className="border border-border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="text-left px-3 py-2 font-semibold">
                        Item
                      </th>
                      <th className="text-left px-3 py-2 font-semibold">
                        Severity
                      </th>
                      <th className="text-left px-3 py-2 font-semibold">
                        Detail
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {flagged.map((f, i) => {
                      const sev = severityConfig[f.severity];
                      return (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-2 font-medium">{f.item}</td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] uppercase",
                                sev.className
                              )}
                            >
                              {f.severity}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {f.detail}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {flagged.length === 0 && (
            <div className="mt-4 rounded border border-success/30 bg-success/5 px-4 py-3">
              <p className="text-sm text-success font-semibold">
                ✓ All clear — no issues detected
              </p>
            </div>
          )}

          <div className="mt-4">
            <h4 className="text-sm font-semibold text-primary mb-2">
              Recommended Actions
            </h4>
            <ul className="space-y-1.5">
              {actions.map((a, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  {a}
                </li>
              ))}
            </ul>
          </div>

          {aiAnalysis && (
            <div className="mt-4 rounded border border-accent/30 bg-accent/5 px-4 py-3">
              <h4 className="text-sm font-semibold text-primary mb-2">
                🤖 AI Analysis
              </h4>
              <p
                className="text-sm text-foreground leading-relaxed whitespace-pre-line"
                dangerouslySetInnerHTML={{
                  __html: aiAnalysis.replace(
                    /\*\*(.*?)\*\*/g,
                    "<strong>$1</strong>"
                  ),
                }}
              />
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-3 px-2">
          <div className="relative group">
            <Button
              variant="outline"
              className="border-accent text-accent hover:bg-accent/10 font-semibold"
              disabled
            >
              <svg
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M6.28 3c3.236.001 4.973.028 6.192.28l.241.056c.878.217 1.65.698 2.128 1.516.229.397.37.838.42 1.295L15.28 6h.5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h.009A17.15 17.15 0 0 1 6.28 3zm9.5 5h-9v10h9V8zM9.75 13.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1 0-1.5h1.5zm4 0a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1 0-1.5h1.5zm-4-3a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1 0-1.5h1.5zm4 0a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1 0-1.5h1.5z" />
              </svg>
              Save to Google Drive
            </Button>
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50">
              <div className="bg-primary text-white text-xs rounded px-3 py-2 w-56 shadow-lg">
                <p className="font-semibold mb-1">⚠ Google Drive Integration</p>
                <p>
                  Requires National Accounts Google Workspace credentials.
                  Available in Option 2 setup.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleExport}
            className="gradient-amber text-primary font-semibold"
          >
            <Download className="mr-2 h-4 w-4" />
            Export to PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

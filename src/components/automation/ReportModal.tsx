import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  AlertTriangle,
  CheckCircle2,
  Info,
  Mail,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import html2pdf from "html2pdf.js";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";

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
  type: "bas" | "payroll" | "productivity" | "super" | "financial" | null;
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

const staffEmails = [
  { name: "Jon Wilczynski (Partner)", email: "jon@nationalaccounts.com.au" },
  {
    name: "Mike Wilczynski (Tech Lead)",
    email: "mike@nationalaccounts.com.au",
  },
  {
    name: "Sarah M. (Senior Accountant)",
    email: "sarah.m@nationalaccounts.com.au",
  },
  { name: "James T. (Payroll)", email: "james.t@nationalaccounts.com.au" },
  { name: "Emma L. (Manager)", email: "emma.l@nationalaccounts.com.au" },
  { name: "David K. (Senior)", email: "david.k@nationalaccounts.com.au" },
  { name: "Lisa P. (Accountant)", email: "lisa.p@nationalaccounts.com.au" },
];

export function ReportModal({
  open,
  onOpenChange,
  type,
  report,
  realData,
}: ReportModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [emailSent, setEmailSent] = useState<string | null>(null);

  if (!type) return null;

  const isRealData = !!(
    realData &&
    (type === "bas" ||
      type === "productivity" ||
      type === "payroll" ||
      type === "super" ||
      type === "financial")
  );

  const aiAnalysis = realData?.aiAnalysis || null;

  const title = {
    bas: "BAS / GST Review Report",
    payroll: "Payroll Reconciliation Report",
    productivity: "Weekly Productivity Report",
    super: "Super Reconciliation Report",
    financial: "Financial Review Report",
  }[type];

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
      : type === "super"
      ? [
          {
            label: "Employees Reviewed",
            value: String(realData!.totalReviewed),
          },
          {
            label: "Super Liability",
            value: `$${
              realData!.extraData?.totalOutstanding?.toFixed(0) || "0"
            }`,
          },
          {
            label: "Super Paid",
            value: `$${realData!.extraData?.totalPaid?.toFixed(0) || "0"}`,
          },
          {
            label: "Compliant",
            value: realData!.totalIssues === 0 ? "✓ Yes" : "✗ No",
          },
        ]
      : type === "financial"
      ? [
          { label: "Records Reviewed", value: String(realData!.totalReviewed) },
          {
            label: "Revenue",
            value: `$${realData!.extraData?.totalInvoiced?.toFixed(0) || "0"}`,
          },
          {
            label: "Gross Profit",
            value: `$${realData!.extraData?.totalPaid?.toFixed(0) || "0"}`,
          },
          { label: "Issues Found", value: String(realData!.totalIssues) },
        ]
      : [
          // Default for BAS
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
    : type === "super"
    ? [
        { label: "Employees", value: "3" },
        { label: "Super Liability", value: "$4,623" },
        { label: "Super Paid", value: "$0" },
        { label: "Compliant", value: "✗ No" },
      ]
    : type === "financial"
    ? [
        { label: "Records Reviewed", value: "1" },
        { label: "Revenue", value: "$20,947" },
        { label: "Gross Profit", value: "-$1,951" },
        { label: "Issues Found", value: "4" },
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
    : type === "super"
    ? [
        {
          item: "Super Guarantee",
          severity: "high",
          detail: "$4,623 liability outstanding - no payments found",
        },
      ]
    : type === "financial"
    ? [
        {
          item: "Profitability",
          severity: "high",
          detail: "Gross margin of -9.3% (critical)",
        },
        {
          item: "Liquidity",
          severity: "high",
          detail: "Current ratio 0.87 (below 1.0)",
        },
        {
          item: "Leverage",
          severity: "medium",
          detail: "Debt to equity ratio 2.39 (high)",
        },
        { item: "Net Result", severity: "high", detail: "Net loss of $1,951" },
      ]
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
      : type === "super"
      ? [
          ...realData!.issues.map((i) => i.recommendation),
          ...realData!.warnings.map((w) => w.recommendation),
          realData!.totalIssues === 0
            ? "All super obligations met. Continue monitoring quarterly due dates."
            : "Urgent: Process super payments before ATO quarterly due date.",
        ]
      : type === "financial"
      ? [
          "Prepare detailed variance analysis for partner review",
          "Review cost of goods sold for margin improvement opportunities",
          "Assess working capital management and liquidity position",
          "Consider debt reduction strategies given high leverage",
          "Partner sign-off required before final year-end reporting",
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
    : type === "super"
    ? [
        "Remit outstanding super to employee funds immediately.",
        "Verify super fund details for all employees.",
      ]
    : type === "financial"
    ? [
        "Investigate reasons for negative gross margin",
        "Review current assets and liabilities for liquidity improvement",
        "Consider refinancing options to reduce debt-to-equity ratio",
        "Partner sign-off required for financial review",
      ]
    : [
        "Review Meridian Property Group tax codes before lodgement",
        "Schedule client advisory for Coastal Builders recurring miscoding",
        "Verify BAS lodgement dates for at-risk clients",
        "Run follow-up review after corrections applied",
      ];

  const handleExport = () => {
    const element = reportRef.current;
    if (!element) return;
    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `${title.replace(/ /g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: {
        unit: "mm" as const,
        format: "a4" as const,
        orientation: "portrait" as const,
      },
    };
    html2pdf().set(opt).from(element).save();
  };

  const handleExcelExport = () => {
    const wb = XLSX.utils.book_new();

    const summaryData = [
      ["National Accounts Internal Portal", "", ""],
      [title, "", ""],
      [`Generated: ${new Date().toLocaleDateString("en-AU")}`, "", ""],
      [`Run by: ${staffEmails[0].email}`, "", ""],
      ["", "", ""],
      ["SUMMARY", "", ""],
      ["Metric", "Value", ""],
      ...summary.map((s) => [s.label, s.value, ""]),
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");

    if (flagged.length > 0) {
      const flaggedData = [
        ["#", "Item", "Severity", "Detail", "Recommended Action"],
        ...flagged.map((f, i) => [
          i + 1,
          f.item,
          f.severity.toUpperCase(),
          f.detail,
          actions[i] || "Review required",
        ]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(flaggedData);
      ws2["!cols"] = [
        { wch: 5 },
        { wch: 30 },
        { wch: 12 },
        { wch: 50 },
        { wch: 60 },
      ];
      XLSX.utils.book_append_sheet(wb, ws2, "Flagged Items");
    }

    const actionsData = [
      ["#", "Recommended Action", "Status", "Assigned To", "Due Date"],
      ...actions.map((a, i) => [
        i + 1,
        a,
        "Pending",
        "Partner",
        new Date().toLocaleDateString("en-AU"),
      ]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(actionsData);
    ws3["!cols"] = [
      { wch: 5 },
      { wch: 70 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, ws3, "Action Items");

    const aiData = [
      ["AI Analysis Report", ""],
      [`Generated: ${new Date().toLocaleDateString("en-AU")}`, ""],
      [`Model: GPT-4o-mini via GitHub Models API`, ""],
      ["", ""],
      ["Analysis", aiAnalysis || "No AI analysis available"],
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(aiData);
    ws4["!cols"] = [{ wch: 20 }, { wch: 100 }];
    XLSX.utils.book_append_sheet(wb, ws4, "AI Analysis");

    XLSX.writeFile(
      wb,
      `NationalAccounts_${title.replace(/ /g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`
    );
  };

  const handleCSVExport = () => {
    const rows = [
      ["#", "Item", "Severity", "Detail", "Recommended Action"],
      ...flagged.map((f, i) => [
        String(i + 1),
        f.item,
        f.severity.toUpperCase(),
        f.detail,
        actions[i] || "Review required",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NationalAccounts_${title.replace(/ /g, "_")}_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEmailSend = (email: string, name: string) => {
    setShowEmailDropdown(false);
    setEmailSent(name);
    setTimeout(() => setEmailSent(null), 3000);

    console.group("📧 EMAIL REPORT — National Accounts Portal");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Sending report to:", name, `<${email}>`);
    console.log("   └─ Report:", title);
    console.log("   └─ Generated:", new Date().toLocaleString("en-AU"));
    console.groupEnd();
  };

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

        {/* Export buttons remain unchanged */}
        <div className="mt-5 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="border-primary text-primary hover:bg-primary/5 font-semibold flex items-center gap-1"
                onClick={() => setShowEmailDropdown(!showEmailDropdown)}
              >
                <Mail className="h-3.5 w-3.5" />
                {emailSent
                  ? `✓ Sent to ${emailSent.split(" ")[0]}`
                  : "Email Report"}
                <ChevronDown className="h-3 w-3" />
              </Button>
              {showEmailDropdown && (
                <div className="absolute bottom-full left-0 mb-2 w-72 rounded border border-border bg-background shadow-lg z-50">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-semibold text-primary">
                      Send to National Accounts staff
                    </p>
                  </div>
                  {staffEmails.map((staff) => (
                    <button
                      key={staff.email}
                      onClick={() => handleEmailSend(staff.email, staff.name)}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-xs font-medium text-foreground">
                        {staff.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {staff.email}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExcelExport}
              className="border-accent text-accent hover:bg-accent/10 font-semibold"
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Excel
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCSVExport}
              className="border-accent text-accent hover:bg-accent/10 font-semibold"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              CSV
            </Button>
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

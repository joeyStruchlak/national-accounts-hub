import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ShieldCheck,
  Users,
  BarChart3,
  Play,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lock,
  FileText,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { OrchestrationFlow } from "@/components/automation/OrchestrationFlow";
import { ReportModal } from "@/components/automation/ReportModal";
import { AuditTrailPanel } from "@/components/automation/AuditTrailPanel";
import { OnboardingBanner } from "@/components/automation/OnboardingBanner";

type AutomationType = "bas" | "payroll" | "productivity";

type HistoryEntry = {
  id: string;
  type: AutomationType;
  label: string;
  runBy: string;
  dateTime: string;
  records: number;
  issues: number;
  status: "Completed" | "Issues Found" | "Failed";
  report: string;
};

type RunState = {
  running: boolean;
  phase: string;
  done: boolean;
  report: string | null;
  activeStep?: number;
};

type RealData = {
  totalReviewed: number;
  totalIssues: number;
  issues: { contact: string; issue: string; recommendation: string }[];
  warnings: { contact: string; issue: string; recommendation: string }[];
  aiAnalysis?: string;
  extraData?: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
  };
} | null;

const initialHistory: HistoryEntry[] = [
  {
    id: "1",
    type: "bas",
    label: "BAS / GST Review",
    runBy: "Sarah M.",
    dateTime: "24 Mar 2026 · 09:15am",
    records: 287,
    issues: 12,
    status: "Issues Found",
    report: "12 GST miscoding issues detected across 8 clients.",
  },
  {
    id: "2",
    type: "payroll",
    label: "Payroll Reconciliation",
    runBy: "James T.",
    dateTime: "23 Mar 2026 · 02:30pm",
    records: 142,
    issues: 0,
    status: "Completed",
    report: "All 142 payroll records reconciled successfully.",
  },
  {
    id: "3",
    type: "productivity",
    label: "Weekly Productivity Report",
    runBy: "Emma L.",
    dateTime: "21 Mar 2026 · 08:00am",
    records: 16,
    issues: 3,
    status: "Issues Found",
    report: "3 staff members below 60% utilisation target.",
  },
  {
    id: "4",
    type: "bas",
    label: "BAS / GST Review",
    runBy: "Sarah M.",
    dateTime: "17 Mar 2026 · 09:10am",
    records: 295,
    issues: 8,
    status: "Issues Found",
    report: "8 issues across 5 clients.",
  },
  {
    id: "5",
    type: "payroll",
    label: "Payroll Reconciliation",
    runBy: "James T.",
    dateTime: "16 Mar 2026 · 02:30pm",
    records: 140,
    issues: 2,
    status: "Issues Found",
    report: "2 discrepancies found.",
  },
  {
    id: "6",
    type: "productivity",
    label: "Weekly Productivity Report",
    runBy: "Emma L.",
    dateTime: "14 Mar 2026 · 08:05am",
    records: 16,
    issues: 0,
    status: "Completed",
    report: "All staff within utilisation targets.",
  },
  {
    id: "7",
    type: "bas",
    label: "BAS / GST Review",
    runBy: "David K.",
    dateTime: "10 Mar 2026 · 09:20am",
    records: 280,
    issues: 0,
    status: "Completed",
    report: "All 280 returns reviewed. No coding errors detected.",
  },
  {
    id: "8",
    type: "payroll",
    label: "Payroll Reconciliation",
    runBy: "James T.",
    dateTime: "9 Mar 2026 · 02:35pm",
    records: 138,
    issues: 0,
    status: "Completed",
    report: "Clean reconciliation across all clients.",
  },
  {
    id: "9",
    type: "bas",
    label: "BAS / GST Review",
    runBy: "Sarah M.",
    dateTime: "3 Mar 2026 · 09:12am",
    records: 292,
    issues: 15,
    status: "Issues Found",
    report: "15 issues — highest count this quarter.",
  },
  {
    id: "10",
    type: "productivity",
    label: "Weekly Productivity Report",
    runBy: "Lisa P.",
    dateTime: "28 Feb 2026 · 08:00am",
    records: 16,
    issues: 1,
    status: "Completed",
    report: "1 staff member flagged.",
  },
];

const phases: Record<AutomationType, string[]> = {
  bas: [
    "Connecting to Xero…",
    "Pulling transaction data…",
    "Analysing GST codes…",
    "Checking compliance rules…",
    "Generating report…",
  ],
  payroll: [
    "Connecting to Xero…",
    "Pulling bank transactions…",
    "Cross-checking payroll module…",
    "Flagging discrepancies…",
    "Generating report…",
  ],
  productivity: [
    "Connecting to practice manager…",
    "Pulling invoice data…",
    "Calculating collections…",
    "Aggregating revenue figures…",
    "Generating report…",
  ],
};

const reportOutputs: Record<AutomationType, string> = {
  bas: "Review complete. 287 returns analysed. 12 GST miscoding issues detected across 8 clients.",
  payroll:
    "Reconciliation complete. 142 payroll records checked. No discrepancies detected.",
  productivity:
    "Report generated. 16 staff reviewed. Average utilisation: 78%.",
};

const automations = [
  {
    key: "bas" as AutomationType,
    icon: ShieldCheck,
    title: "BAS / GST Review",
    subtitle:
      "Analyse all transactions for GST miscoding issues, missing tax codes, and compliance risks",
    stat: "200–300 returns per quarter",
    lastRun: "24 Mar 2026 · 09:15am",
    lastResult: "12 issues found",
    lastResultType: "warning" as const,
    connected: true,
  },
  {
    key: "payroll" as AutomationType,
    icon: Users,
    title: "Payroll Reconciliation",
    subtitle:
      "Cross-check payroll bank transactions against payroll module figures and flag discrepancies",
    stat: "Fortnightly automated check",
    lastRun: "23 Mar 2026 · 02:30pm",
    lastResult: "All clear",
    lastResultType: "success" as const,
    connected: true,
  },
  {
    key: "productivity" as AutomationType,
    icon: BarChart3,
    title: "Weekly Productivity Report",
    subtitle:
      "Revenue, collections, overdue items and staff capacity summary for partner review",
    stat: "Saves 30–45 mins every week",
    lastRun: "21 Mar 2026 · 08:00am",
    lastResult: "3 staff flagged",
    lastResultType: "warning" as const,
    connected: true,
  },
];

export default function AIAutomation() {
  const [runStates, setRunStates] = useState<Record<AutomationType, RunState>>({
    bas: { running: false, phase: "", done: false, report: null },
    payroll: { running: false, phase: "", done: false, report: null },
    productivity: { running: false, phase: "", done: false, report: null },
  });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showOnboarding] = useState(false);
  const [reportModal, setReportModal] = useState<{
    open: boolean;
    type: AutomationType | null;
  }>({ open: false, type: null });
  const [realData, setRealData] = useState<RealData>(null);

  const runAutomation = useCallback(async (type: AutomationType) => {
    const steps = phases[type];
    setRunStates((prev) => ({
      ...prev,
      [type]: {
        running: true,
        phase: steps[0],
        done: false,
        report: null,
        activeStep: 0,
      },
    }));

    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i < steps.length - 1) {
        setRunStates((prev) => ({
          ...prev,
          [type]: { ...prev[type], phase: steps[i], activeStep: i },
        }));
      }
    }, 1200);

    try {
      if (type === "bas") {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bas-review`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        clearInterval(interval);

        if (data.success) {
          const issueCount = data.issues?.length || 0;
          const warningCount = data.warnings?.length || 0;
          const total = issueCount + warningCount;
          const reportText =
            total > 0
              ? `Review complete. ${
                  data.totalReviewed
                } transactions reviewed. ${issueCount} critical issues and ${warningCount} warnings found. ${data.warnings
                  ?.map(
                    (w: { contact: string; issue: string }) =>
                      `${w.contact}: ${w.issue}`
                  )
                  .join(". ")}`
              : `Review complete. ${data.totalReviewed} transactions reviewed. No issues found. All clear.`;

          setRunStates((prev) => ({
            ...prev,
            [type]: {
              running: false,
              phase: "",
              done: true,
              report: reportText,
              activeStep: 4,
            },
          }));

          setRealData({
            totalReviewed: data.totalReviewed,
            totalIssues: data.totalIssues,
            issues: data.issues || [],
            warnings: data.warnings || [],
            aiAnalysis: data.aiAnalysis || "",
          });
        } else {
          throw new Error(data.error || "Unknown error");
        }
      } else if (type === "productivity") {
        const response = await fetch(
          `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/productivity-report`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        clearInterval(interval);

        if (data.success) {
          const reportText = `Report complete. ${
            data.recordsReviewed
          } invoices reviewed. Total invoiced: $${data.totalInvoiced.toFixed(
            0
          )}. Collected: $${data.totalPaid.toFixed(
            0
          )}. Outstanding: $${data.totalOutstanding.toFixed(0)}. ${
            data.overdueCount > 0
              ? `${data.overdueCount} overdue invoices need attention.`
              : "No overdue invoices."
          }`;

          setRunStates((prev) => ({
            ...prev,
            [type]: {
              running: false,
              phase: "",
              done: true,
              report: reportText,
              activeStep: 4,
            },
          }));

          setRealData({
            totalReviewed: data.recordsReviewed,
            totalIssues: data.flags?.length || 0,
            issues: data.flags || [],
            warnings:
              data.overdueClients?.map(
                (c: {
                  client: string;
                  amount: number;
                  daysOverdue: number;
                }) => ({
                  contact: c.client,
                  issue: `$${c.amount} overdue by ${c.daysOverdue} days`,
                  recommendation: "Follow up immediately",
                })
              ) || [],
            aiAnalysis: data.aiAnalysis || "",
            extraData: {
              totalInvoiced: data.totalInvoiced,
              totalPaid: data.totalPaid,
              totalOutstanding: data.totalOutstanding,
            },
          });
        } else {
          throw new Error(data.error || "Unknown error");
        }
      } else if (type === "payroll") {
        const response = await fetch(
          `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/payroll-reconciliation`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        clearInterval(interval);

        if (data.success) {
          const reportText = `Reconciliation complete. ${
            data.totalReviewed
          } payroll transactions reviewed. ${
            data.employees.length
          } employees. Total gross: $${data.totalGross.toFixed(
            0
          )}. PAYG withheld: $${data.totalPayg.toFixed(
            0
          )}. Estimated super: $${data.estimatedSuper.toFixed(0)}. ${
            data.totalIssues > 0
              ? `${data.totalIssues} items need review.`
              : "All clear."
          }`;

          setRunStates((prev) => ({
            ...prev,
            [type]: {
              running: false,
              phase: "",
              done: true,
              report: reportText,
              activeStep: 4,
            },
          }));

          setRealData({
            totalReviewed: data.totalReviewed,
            totalIssues: data.totalIssues,
            issues: data.issues || [],
            warnings: data.warnings || [],
            aiAnalysis: data.aiAnalysis || "",
            extraData: {
              totalInvoiced: data.totalGross,
              totalPaid: data.totalPayg,
              totalOutstanding: data.estimatedSuper,
            },
          });
        } else {
          throw new Error(data.error || "Unknown error");
        }
      } else {
        clearInterval(interval);
        setRunStates((prev) => ({
          ...prev,
          [type]: {
            running: false,
            phase: "",
            done: true,
            report: reportOutputs[type],
            activeStep: 4,
          },
        }));
      }
    } catch (error) {
      clearInterval(interval);
      setRunStates((prev) => ({
        ...prev,
        [type]: {
          running: false,
          phase: "",
          done: true,
          report: `Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          activeStep: -1,
        },
      }));
    }
  }, []);

  return (
    <AppLayout>
      <div className="mb-6 rounded-md border border-accent/20 bg-primary px-5 py-3 flex items-center gap-3">
        <Lock className="h-4 w-4 text-accent shrink-0" />
        <p className="text-xs text-accent font-medium tracking-wide">
          All automation runs are logged and audited. Data processed securely
          via Xero OAuth 2.0. Australian data sovereignty maintained.
        </p>
      </div>

      {showOnboarding && <OnboardingBanner onConnect={() => {}} />}

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-display">
          AI Automation Hub
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mission control for automated reviews, reconciliations and reporting
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {automations.map((a) => {
          const state = runStates[a.key];
          return (
            <Card
              key={a.key}
              className="shadow-premium-lg border-border border-t-2 border-t-warning relative overflow-hidden flex flex-col"
            >
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="flex items-start gap-4 mb-4">
                  <div className="rounded-lg p-3 border border-warning/30 bg-warning/5">
                    <a.icon
                      className="h-7 w-7 text-warning"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-primary leading-tight">
                      {a.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-snug">
                      {a.subtitle}
                    </p>
                  </div>
                </div>

                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 mb-4">
                  <p className="text-xs font-semibold text-primary/80">
                    {a.stat}
                  </p>
                </div>

                <Button
                  onClick={() => runAutomation(a.key)}
                  disabled={state.running}
                  className="w-full gradient-amber text-primary font-semibold h-11 text-sm hover:opacity-90 mb-4"
                >
                  {state.running ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running…
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run{" "}
                      {a.key === "bas"
                        ? "Review"
                        : a.key === "payroll"
                        ? "Check"
                        : "Report"}
                    </>
                  )}
                </Button>

                {state.running && (
                  <div className="rounded-md border border-accent/20 bg-accent/5 px-4 py-3 mb-4 flex items-center gap-3">
                    <Loader2 className="h-4 w-4 text-accent animate-spin shrink-0" />
                    <p className="text-sm font-medium text-primary animate-pulse">
                      {state.phase}
                    </p>
                  </div>
                )}

                {state.done && state.report && (
                  <Button
                    variant="outline"
                    onClick={() => setReportModal({ open: true, type: a.key })}
                    className="w-full border-primary text-warning hover:bg-primary/5 font-semibold mb-4"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Full Report
                  </Button>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      a.connected
                        ? "bg-accent animate-pulse"
                        : "bg-muted-foreground"
                    )}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    <span className={a.connected ? "text-accent" : ""}>
                      {a.connected
                        ? "Connected to Xero OAuth 2.0"
                        : "Disconnected"}
                    </span>
                  </span>
                </div>

                <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    Last run: {a.lastRun}
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-semibold",
                      a.lastResultType === "success"
                        ? "text-accent"
                        : "text-warning"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        a.lastResultType === "success"
                          ? "bg-accent"
                          : "bg-warning"
                      )}
                    />
                    {a.lastResult}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <OrchestrationFlow runStates={runStates} />

      <ReportModal
        open={reportModal.open}
        onOpenChange={(open) => setReportModal({ ...reportModal, open })}
        type={reportModal.type}
        report={reportModal.type ? runStates[reportModal.type].report : null}
        realData={
          reportModal.type === "bas" ||
          reportModal.type === "productivity" ||
          reportModal.type === "payroll"
            ? realData
            : null
        }
      />

      <Card className="shadow-premium border-border mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Automation History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider">
                  Automation
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">
                  Run by
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">
                  Date / Time
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                  Records
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                  Issues
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialHistory.map((entry) => (
                <>
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() =>
                      setExpandedRow(expandedRow === entry.id ? null : entry.id)
                    }
                  >
                    <TableCell className="font-medium text-sm">
                      {entry.label}
                    </TableCell>
                    <TableCell className="text-sm">{entry.runBy}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.dateTime}
                    </TableCell>
                    <TableCell className="text-sm text-right font-semibold">
                      {entry.records}
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      <span
                        className={cn(
                          "font-semibold",
                          entry.issues > 0 ? "text-warning" : "text-accent"
                        )}
                      >
                        {entry.issues}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={entry.status} />
                    </TableCell>
                    <TableCell>
                      {expandedRow === entry.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedRow === entry.id && (
                    <TableRow key={`${entry.id}-expanded`}>
                      <TableCell colSpan={7} className="bg-muted/20 px-6 py-4">
                        <p className="text-xs font-semibold text-primary mb-1">
                          Report Output
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {entry.report}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AuditTrailPanel />
    </AppLayout>
  );
}

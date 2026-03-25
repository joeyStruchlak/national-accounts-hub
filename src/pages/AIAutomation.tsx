import { useState, useEffect, useCallback } from "react";
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

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
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
};

/* ------------------------------------------------------------------ */
/* Mock history data                                                   */
/* ------------------------------------------------------------------ */
const initialHistory: HistoryEntry[] = [
  { id: "1", type: "bas", label: "BAS / GST Review", runBy: "Sarah M.", dateTime: "24 Mar 2026 · 09:15am", records: 287, issues: 12, status: "Issues Found", report: "12 GST miscoding issues detected across 8 clients. 3 missing tax codes on Meridian Property Group. 2 BAS lodgement dates flagged as at risk. Recommended: manual review of flagged items before lodgement." },
  { id: "2", type: "payroll", label: "Payroll Reconciliation", runBy: "James T.", dateTime: "23 Mar 2026 · 02:30pm", records: 142, issues: 0, status: "Completed", report: "All 142 payroll records reconciled successfully. No discrepancies between bank transactions and payroll module. STP lodgements verified." },
  { id: "3", type: "productivity", label: "Weekly Productivity Report", runBy: "Emma L.", dateTime: "21 Mar 2026 · 08:00am", records: 16, issues: 3, status: "Issues Found", report: "3 staff members below 60% utilisation target. Michael R. at 45% — requires attention. Revenue on track at $285k against $300k monthly target. 23 overdue items, down from 28 last week." },
  { id: "4", type: "bas", label: "BAS / GST Review", runBy: "Sarah M.", dateTime: "17 Mar 2026 · 09:10am", records: 295, issues: 8, status: "Issues Found", report: "8 issues across 5 clients. GST-free supplies miscoded as taxable on 3 records. Coastal Builders Pty Ltd has recurring miscoding pattern — recommend client advisory." },
  { id: "5", type: "payroll", label: "Payroll Reconciliation", runBy: "James T.", dateTime: "16 Mar 2026 · 02:30pm", records: 140, issues: 2, status: "Issues Found", report: "2 discrepancies found. Blue Ocean Imports — $1,240 variance between bank and payroll. Harbour View Dental — super guarantee shortfall of $380. Both flagged for manual review." },
  { id: "6", type: "productivity", label: "Weekly Productivity Report", runBy: "Emma L.", dateTime: "14 Mar 2026 · 08:05am", records: 16, issues: 0, status: "Completed", report: "All staff within utilisation targets. Revenue at $310k — above monthly target. 28 overdue items. Team capacity well-balanced." },
  { id: "7", type: "bas", label: "BAS / GST Review", runBy: "David K.", dateTime: "10 Mar 2026 · 09:20am", records: 280, issues: 0, status: "Completed", report: "All 280 returns reviewed. No coding errors detected. All tax codes correctly applied. Ready for lodgement." },
  { id: "8", type: "payroll", label: "Payroll Reconciliation", runBy: "James T.", dateTime: "9 Mar 2026 · 02:35pm", records: 138, issues: 0, status: "Completed", report: "Clean reconciliation across all clients. No variances detected." },
  { id: "9", type: "bas", label: "BAS / GST Review", runBy: "Sarah M.", dateTime: "3 Mar 2026 · 09:12am", records: 292, issues: 15, status: "Issues Found", report: "15 issues — highest count this quarter. Recommend team training session on GST coding. Top offenders: Meridian (5), Coastal Builders (4), Sydney Tech (3)." },
  { id: "10", type: "productivity", label: "Weekly Productivity Report", runBy: "Lisa P.", dateTime: "28 Feb 2026 · 08:00am", records: 16, issues: 1, status: "Completed", report: "1 staff member flagged — Michael R. at 52%. All others above 65%. Revenue tracking at $275k." },
];

const phases: Record<AutomationType, string[]> = {
  bas: ["Connecting to Xero…", "Pulling transaction data…", "Analysing GST codes…", "Checking compliance rules…", "Generating report…"],
  payroll: ["Connecting to Xero…", "Pulling bank transactions…", "Cross-checking payroll module…", "Flagging discrepancies…", "Generating report…"],
  productivity: ["Connecting to practice manager…", "Pulling timesheet data…", "Calculating utilisation…", "Aggregating revenue figures…", "Generating report…"],
};

const reportOutputs: Record<AutomationType, string> = {
  bas: "Review complete. 287 returns analysed. 12 GST miscoding issues detected across 8 clients. 3 missing tax codes flagged on Meridian Property Group. 2 BAS lodgement dates at risk. All flagged items require manual review before lodgement.",
  payroll: "Reconciliation complete. 142 payroll records checked. All bank transactions matched against payroll module figures. No discrepancies detected. STP lodgements verified and compliant.",
  productivity: "Report generated. 16 staff reviewed. Average utilisation: 78%. 3 staff below target (Michael R. 45%, David K. 65%, Emma L. 78%). Weekly revenue: $71,250. 23 overdue items. Partner summary ready for download.",
};

/* ------------------------------------------------------------------ */
/* Automation cards config                                             */
/* ------------------------------------------------------------------ */
const automations = [
  {
    key: "bas" as AutomationType,
    icon: ShieldCheck,
    title: "BAS / GST Review",
    subtitle: "Analyse all transactions for GST miscoding issues, missing tax codes, and compliance risks",
    stat: "200–300 returns per quarter",
    lastRun: "24 Mar 2026 · 09:15am",
    lastResult: "12 issues found",
    lastResultType: "warning" as const,
  },
  {
    key: "payroll" as AutomationType,
    icon: Users,
    title: "Payroll Reconciliation",
    subtitle: "Cross-check payroll bank transactions against payroll module figures and flag discrepancies",
    stat: "Fortnightly automated check",
    lastRun: "23 Mar 2026 · 02:30pm",
    lastResult: "All clear",
    lastResultType: "success" as const,
  },
  {
    key: "productivity" as AutomationType,
    icon: BarChart3,
    title: "Weekly Productivity Report",
    subtitle: "Revenue, collections, overdue items and staff capacity summary for partner review",
    stat: "Saves 30–45 mins every week",
    lastRun: "21 Mar 2026 · 08:00am",
    lastResult: "3 staff flagged",
    lastResultType: "warning" as const,
  },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function AIAutomation() {
  const [runStates, setRunStates] = useState<Record<AutomationType, RunState>>({
    bas: { running: false, phase: "", done: false, report: null },
    payroll: { running: false, phase: "", done: false, report: null },
    productivity: { running: false, phase: "", done: false, report: null },
  });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const runAutomation = useCallback((type: AutomationType) => {
    const steps = phases[type];
    setRunStates((prev) => ({ ...prev, [type]: { running: true, phase: steps[0], done: false, report: null } }));

    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i < steps.length) {
        setRunStates((prev) => ({ ...prev, [type]: { ...prev[type], phase: steps[i] } }));
      } else {
        clearInterval(interval);
        setRunStates((prev) => ({
          ...prev,
          [type]: { running: false, phase: "", done: true, report: reportOutputs[type] },
        }));
      }
    }, 1200);
  }, []);

  return (
    <AppLayout>
      {/* Security banner */}
      <div className="mb-6 rounded border border-accent/20 bg-primary px-5 py-3 flex items-center gap-3">
        <Lock className="h-4 w-4 text-accent shrink-0" />
        <p className="text-xs text-accent font-medium tracking-wide">
          All automation runs are logged and audited. Data processed securely via Xero OAuth 2.0. Australian data sovereignty maintained.
        </p>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-display">AI Automation Hub</h1>
        <p className="mt-1 text-sm text-muted-foreground">Mission control for automated reviews, reconciliations and reporting</p>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {automations.map((a) => {
          const state = runStates[a.key];
          return (
            <Card
              key={a.key}
              className="shadow-premium-lg border-border border-t-2 border-t-accent relative overflow-hidden flex flex-col"
            >
              <CardContent className="p-6 flex flex-col flex-1">
                {/* Icon + Title */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="rounded-lg p-3 border border-accent/30 bg-accent/5">
                    <a.icon className="h-7 w-7 text-accent" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-primary leading-tight">{a.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-snug">{a.subtitle}</p>
                  </div>
                </div>

                {/* Stat */}
                <div className="rounded border border-border bg-muted/40 px-3 py-2 mb-4">
                  <p className="text-xs font-semibold text-primary/80">{a.stat}</p>
                </div>

                {/* Run button */}
                <Button
                  onClick={() => runAutomation(a.key)}
                  disabled={state.running}
                  className="w-full gradient-green text-accent-foreground font-semibold h-11 text-sm hover:opacity-90 mb-4"
                >
                  {state.running ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running…
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run {a.key === "bas" ? "Review" : a.key === "payroll" ? "Check" : "Report"}
                    </>
                  )}
                </Button>

                {/* Running phase */}
                {state.running && (
                  <div className="rounded border border-accent/20 bg-accent/5 px-4 py-3 mb-4 flex items-center gap-3">
                    <Loader2 className="h-4 w-4 text-accent animate-spin shrink-0" />
                    <p className="text-sm font-medium text-primary animate-pulse">{state.phase}</p>
                  </div>
                )}

                {/* Report output */}
                {state.done && state.report && (
                  <div className="rounded border border-success/30 bg-success/5 px-4 py-3 mb-4">
                    <p className="text-xs font-semibold text-success mb-1">✓ Complete</p>
                    <p className="text-sm text-foreground leading-relaxed">{state.report}</p>
                  </div>
                )}

                {/* Last run indicator */}
                <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">Last run: {a.lastRun}</p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-semibold",
                      a.lastResultType === "success" ? "text-success" : "text-warning"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        a.lastResultType === "success" ? "bg-success" : "bg-warning"
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

      {/* Automation History */}
      <Card className="shadow-premium border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Automation History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Automation</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Run by</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Date / Time</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Records</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Issues</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialHistory.map((entry) => (
                <>
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                  >
                    <TableCell className="font-medium text-sm">{entry.label}</TableCell>
                    <TableCell className="text-sm">{entry.runBy}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.dateTime}</TableCell>
                    <TableCell className="text-sm text-right font-semibold">{entry.records}</TableCell>
                    <TableCell className="text-sm text-right">
                      <span className={cn("font-semibold", entry.issues > 0 ? "text-warning" : "text-success")}>
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
                        <p className="text-xs font-semibold text-primary mb-1">Report Output</p>
                        <p className="text-sm text-foreground leading-relaxed">{entry.report}</p>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

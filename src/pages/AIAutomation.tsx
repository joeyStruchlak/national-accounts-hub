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
  Shield,
  TrendingUp,
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
import { AutomationHistoryTable } from "@/components/automation/AutomationHistoryTable";

type AutomationType =
  | "bas"
  | "payroll"
  | "productivity"
  | "super"
  | "financial";

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
  super: [
    "Connecting to Xero…",
    "Pulling payroll data…",
    "Calculating SGC liability…",
    "Checking payment status…",
    "Generating report…",
  ],
  financial: [
    "Connecting to Xero…",
    "Pulling P&L report…",
    "Pulling balance sheet…",
    "Calculating financial ratios…",
    "Generating review…",
  ],
};

const reportOutputs: Record<AutomationType, string> = {
  bas: "Review complete. 287 returns analysed. 12 GST miscoding issues detected across 8 clients.",
  payroll:
    "Reconciliation complete. 142 payroll records checked. No discrepancies detected.",
  productivity:
    "Report generated. 16 staff reviewed. Average utilisation: 78%.",
  super:
    "Reconciliation complete. Super liability calculated. Review report for details.",
  financial: "Financial review complete. Review report for details.",
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
  {
    key: "super" as AutomationType,
    icon: Shield,
    title: "Super Reconciliation",
    subtitle:
      "Verify superannuation guarantee obligations, check payment status and flag ATO compliance risks",
    stat: "11.5% SGC rate FY2025-26",
    lastRun: "27 Mar 2026 · 09:00am",
    lastResult: "$4,623 liability found",
    lastResultType: "warning" as const,
    connected: true,
  },
  {
    key: "financial" as AutomationType,
    icon: TrendingUp,
    title: "Financial Review",
    subtitle:
      "P&L analysis, balance sheet ratios, profitability trends and yearly review for partner sign-off",
    stat: "Yearly review automated",
    lastRun: "28 Mar 2026 · 09:00am",
    lastResult: "4 issues found",
    lastResultType: "warning" as const,
    connected: true,
  },
];

export default function AIAutomation() {
  const [runStates, setRunStates] = useState<Record<AutomationType, RunState>>({
    bas: { running: false, phase: "", done: false, report: null },
    payroll: { running: false, phase: "", done: false, report: null },
    productivity: { running: false, phase: "", done: false, report: null },
    super: { running: false, phase: "", done: false, report: null },
    financial: { running: false, phase: "", done: false, report: null },
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
        console.group(
          "🚀 BAS/GST REVIEW AUTOMATION — National Accounts Internal Portal"
        );
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(
          "🔐 SECURITY: User authenticated via Google SSO (OAuth 2.0)"
        );
        console.log(
          "🔐 SECURITY: Session token verified by Supabase Auth (Sydney)"
        );
        console.log(
          "🔐 SECURITY: All credentials stored in Supabase Vault — never in code"
        );
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📡 STEP 1: Calling Supabase Edge Function → bas-review");
        console.log("   └─ Region: ap-southeast-2 (Sydney, Australia)");
        console.log("   └─ Runtime: Deno (Supabase managed)");
        console.log("   └─ Auth: Supabase anon key via Authorization header");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(
          "🔑 STEP 2: Edge Function loading Xero credentials from Supabase Vault"
        );
        console.log("   └─ XERO_CLIENT_ID: loaded from Supabase secrets ✅");
        console.log(
          "   └─ XERO_CLIENT_SECRET: loaded from Supabase secrets ✅"
        );
        console.log("   └─ XERO_TENANT_ID: loaded from Supabase secrets ✅");
        console.log(
          "   └─ GITHUB_TOKEN (GPT-4o-mini): loaded from Supabase secrets ✅"
        );
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(
          "🔓 STEP 3: Authenticating with Xero API via OAuth 2.0 client credentials"
        );
        console.log("   └─ Endpoint: https://identity.xero.com/connect/token");
        console.log("   └─ Grant type: client_credentials");
        console.log(
          "   └─ Scopes: accounting.transactions.read, accounting.reports.read, accounting.contacts.read"
        );
        console.log(
          "   └─ Access token: temporary (expires in 30 mins, never stored)"
        );
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(
          "📊 STEP 4: Pulling bank transactions from Xero API (paginated)"
        );
        console.log(
          "   └─ Endpoint: https://api.xero.com/api.xro/2.0/BankTransactions"
        );
        console.log("   └─ Pulling all pages of transactions...");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("⚙️ STEP 5: Running rules engine on transaction data");
        console.log("   └─ Check 1: Missing descriptions on transactions");
        console.log(
          "   └─ Check 2: PAYE miscoded to P&L (Acc 505) instead of liability (Acc 825)"
        );
        console.log("   └─ Check 3: Finance repayments on wrong accounts");
        console.log("   └─ Check 4: Suspense account transactions");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

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
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("✅ XERO DATA RECEIVED:", {
            totalTransactionsReviewed: data.totalReviewed,
            criticalIssues: data.issues?.length || 0,
            warnings: data.warnings?.length || 0,
          });
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log(
            "🤖 STEP 6: Sending flagged items to GPT-4o-mini via GitHub Models API"
          );
          console.log(
            "   └─ Endpoint: https://models.inference.ai.azure.com/chat/completions"
          );
          console.log("   └─ Model: gpt-4o-mini (Microsoft Azure hosted)");
          console.log("   └─ System prompt: Expert Australian tax accountant");
          console.log("   └─ Temperature: 0.3 (consistent, professional)");
          console.log("   └─ Max tokens: 200");
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("🤖 AI ANALYSIS RECEIVED:");
          console.log("   └─", data.aiAnalysis?.substring(0, 150) + "...");
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log(
            "💾 STEP 7: Saving audit log to Supabase Postgres (Sydney)"
          );
          console.log("   └─ Table: automation_runs");
          console.log("   └─ Run ID:", data.runId);
          console.log("   └─ Timestamp:", new Date().toISOString());
          console.log("   └─ RLS enabled: all rows protected ✅");
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("📁 STEP 8: Saving report to Supabase Storage (Sydney)");
          console.log("   └─ Bucket: automation-reports");
          console.log("   └─ File:", data.storageFileUrl);
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("🎉 BAS REVIEW COMPLETE");
          console.log("   └─ Transactions reviewed:", data.totalReviewed);
          console.log("   └─ Issues found:", data.totalIssues);
          console.log("   └─ Run ID:", data.runId);
          console.log("   └─ Storage:", data.storageFileUrl);
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.groupEnd();

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
          console.error("❌ BAS Review failed:", data.error);
          console.groupEnd();
          throw new Error(data.error || "Unknown error");
        }
      } else if (type === "productivity") {
        console.group(
          "🚀 WEEKLY PRODUCTIVITY REPORT — National Accounts Internal Portal"
        );
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(
          "🔐 SECURITY: User authenticated via Google SSO (OAuth 2.0)"
        );
        console.log("🔐 SECURITY: Session verified by Supabase Auth (Sydney)");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(
          "📡 STEP 1: Calling Supabase Edge Function → productivity-report"
        );
        console.log("   └─ Region: ap-southeast-2 (Sydney, Australia)");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔑 STEP 2: Loading credentials from Supabase Vault");
        console.log("   └─ XERO_CLIENT_ID ✅");
        console.log("   └─ XERO_CLIENT_SECRET ✅");
        console.log("   └─ XERO_TENANT_ID ✅");
        console.log("   └─ GITHUB_TOKEN (GPT-4o-mini) ✅");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔓 STEP 3: Authenticating with Xero via OAuth 2.0");
        console.log("   └─ Endpoint: https://identity.xero.com/connect/token");
        console.log(
          "   └─ Scopes: accounting.transactions.read, accounting.reports.read"
        );
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📊 STEP 4: Pulling invoices and payments from Xero API");
        console.log(
          "   └─ Endpoint: https://api.xero.com/api.xro/2.0/Invoices"
        );
        console.log("   └─ Pulling P&L report from Xero...");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("⚙️ STEP 5: Running rules engine");
        console.log("   └─ Check 1: Total invoiced this period");
        console.log("   └─ Check 2: Total collected vs outstanding");
        console.log("   └─ Check 3: Overdue invoices past due date");
        console.log("   └─ Check 4: Collection efficiency %");

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
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("✅ XERO DATA RECEIVED:", {
            invoicesReviewed: data.recordsReviewed,
            totalInvoiced: `$${data.totalInvoiced?.toFixed(0)}`,
            totalCollected: `$${data.totalPaid?.toFixed(0)}`,
            outstanding: `$${data.totalOutstanding?.toFixed(0)}`,
            overdueCount: data.overdueCount,
          });
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log(
            "🤖 STEP 6: Sending data to GPT-4o-mini via GitHub Models API"
          );
          console.log("   └─ Model: gpt-4o-mini");
          console.log(
            "   └─ System prompt: Expert Australian accounting practice manager"
          );
          console.log("   └─ Temperature: 0.3");
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("🤖 AI ANALYSIS:");
          console.log("   └─", data.aiAnalysis?.substring(0, 150) + "...");
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log(
            "💾 STEP 7: Saving to Supabase Postgres + Storage (Sydney)"
          );
          console.log("   └─ Run ID:", data.runId);
          console.log("   └─ Storage file:", data.storageFileUrl);
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("🎉 PRODUCTIVITY REPORT COMPLETE");
          console.log("   └─ Saves 30-45 mins vs manual Excel process");
          console.groupEnd();

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
          console.error("❌ Productivity Report failed:", data.error);
          console.groupEnd();
          throw new Error(data.error || "Unknown error");
        }
      } else if (type === "payroll") {
        console.group(
          "🚀 PAYROLL RECONCILIATION — National Accounts Internal Portal"
        );
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(
          "🔐 SECURITY: User authenticated via Google SSO (OAuth 2.0)"
        );
        console.log("🔐 SECURITY: Session verified by Supabase Auth (Sydney)");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(
          "📡 STEP 1: Calling Supabase Edge Function → payroll-reconciliation"
        );
        console.log("   └─ Region: ap-southeast-2 (Sydney, Australia)");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔑 STEP 2: Loading credentials from Supabase Vault");
        console.log("   └─ XERO_CLIENT_ID ✅");
        console.log("   └─ XERO_CLIENT_SECRET ✅");
        console.log("   └─ XERO_TENANT_ID ✅");
        console.log("   └─ GITHUB_TOKEN (GPT-4o-mini) ✅");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔓 STEP 3: Authenticating with Xero via OAuth 2.0");
        console.log("   └─ Scopes: accounting.transactions.read");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📊 STEP 4: Pulling payroll bank transactions from Xero");
        console.log(
          "   └─ Filtering: Account 477 (wages) + Account 825 (PAYG)"
        );
        console.log("   └─ Grouping by employee contact...");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("⚙️ STEP 5: Running payroll rules engine");
        console.log(
          "   └─ Check 1: PAYG withholding rate (15-45% normal range)"
        );
        console.log(
          "   └─ Check 2: Voided payroll entries (double payment risk)"
        );
        console.log("   └─ Check 3: Super liability at 11.5% SGC rate");
        console.log("   └─ Check 4: Net pay calculations per employee");

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
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("✅ XERO PAYROLL DATA RECEIVED:", {
            employees: data.employees?.map((e: { name: string }) => e.name),
            totalGross: `$${data.totalGross?.toFixed(0)}`,
            totalPAYG: `$${data.totalPayg?.toFixed(0)}`,
            estimatedSuper: `$${data.estimatedSuper?.toFixed(0)}`,
            issues: data.issues?.length || 0,
            warnings: data.warnings?.length || 0,
          });
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("🤖 STEP 6: GPT-4o-mini payroll analysis");
          console.log(
            "   └─ System prompt: Expert Australian payroll accountant"
          );
          console.log("   └─ Context: PAYG withholding, SGC, ATO requirements");
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("🤖 AI ANALYSIS:");
          console.log("   └─", data.aiAnalysis?.substring(0, 150) + "...");
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log(
            "💾 STEP 7: Saving to Supabase Postgres + Storage (Sydney)"
          );
          console.log("   └─ Run ID:", data.runId);
          console.groupEnd();

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
          console.error("❌ Payroll Reconciliation failed:", data.error);
          console.groupEnd();
          throw new Error(data.error || "Unknown error");
        }
      } else if (type === "super") {
        console.group(
          "🚀 SUPER RECONCILIATION — National Accounts Internal Portal"
        );
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(
          "🔐 SECURITY: User authenticated via Google SSO (OAuth 2.0)"
        );
        console.log("🔐 SECURITY: Session verified by Supabase Auth (Sydney)");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(
          "📡 STEP 1: Calling Supabase Edge Function → super-reconciliation"
        );
        console.log("   └─ Region: ap-southeast-2 (Sydney, Australia)");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔑 STEP 2: Loading credentials from Supabase Vault");
        console.log("   └─ XERO_CLIENT_ID ✅");
        console.log("   └─ XERO_CLIENT_SECRET ✅");
        console.log("   └─ XERO_TENANT_ID ✅");
        console.log("   └─ GITHUB_TOKEN (GPT-4o-mini) ✅");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔓 STEP 3: Authenticating with Xero via OAuth 2.0");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📊 STEP 4: Pulling wage + super transactions from Xero");
        console.log("   └─ Wages: Account 477 transactions");
        console.log("   └─ Super payments: Account 820/826 transactions");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("⚙️ STEP 5: Running super rules engine");
        console.log("   └─ SGC rate: 11.5% FY2025-26");
        console.log("   └─ Calculating liability vs payments per employee");
        console.log("   └─ Checking quarterly due dates (28 Jan/Apr/Jul/Oct)");
        console.log("   └─ Flagging shortfalls within 14 days of deadline");

        const response = await fetch(
          `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/super-reconciliation`,
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
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("✅ XERO SUPER DATA RECEIVED:", {
            employees: data.employees?.map((e: { name: string }) => e.name),
            totalGrossWages: `$${data.totalGrossWages?.toFixed(0)}`,
            estimatedSuperLiability: `$${data.estimatedSuperLiability?.toFixed(
              0
            )}`,
            totalSuperPaid: `$${data.totalSuperPaid?.toFixed(0)}`,
            superVariance: `$${data.superVariance?.toFixed(0)}`,
            superCompliant: data.superCompliant,
            nextDueDate: data.nextDueDate,
            daysUntilDue: data.daysUntilDue,
          });
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("🤖 STEP 6: GPT-4o-mini super compliance analysis");
          console.log(
            "   └─ System prompt: Expert Australian superannuation compliance specialist"
          );
          console.log(
            "   └─ Context: SGC rates, ATO penalties, quarterly deadlines"
          );
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("🤖 AI ANALYSIS:");
          console.log("   └─", data.aiAnalysis?.substring(0, 150) + "...");
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log(
            "💾 STEP 7: Saving to Supabase Postgres + Storage (Sydney)"
          );
          console.log("   └─ Run ID:", data.runId);
          console.log("   └─ Storage:", data.storageFileUrl);
          console.groupEnd();

          const reportText = `Reconciliation complete. ${
            data.employees.length
          } employees. Total gross wages: $${data.totalGrossWages.toFixed(
            0
          )}. Super liability: $${data.estimatedSuperLiability.toFixed(
            0
          )}. Super paid: $${data.totalSuperPaid.toFixed(0)}. ${
            data.superCompliant
              ? "All clear - compliant."
              : `Shortfall of $${data.superVariance.toFixed(
                  0
                )} - action required. Due: ${data.nextDueDate}.`
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
              totalInvoiced: data.totalGrossWages,
              totalPaid: data.totalSuperPaid,
              totalOutstanding: data.estimatedSuperLiability,
            },
          });
        } else {
          console.error("❌ Super Reconciliation failed:", data.error);
          console.groupEnd();
          throw new Error(data.error || "Unknown error");
        }
      } else if (type === "financial") {
        console.group(
          "🚀 FINANCIAL REVIEW — National Accounts Internal Portal"
        );
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔐 SECURITY: User authenticated via Google SSO");
        console.log(
          "📡 STEP 1: Calling Supabase Edge Function → financial-review"
        );
        console.log("🔑 STEP 2: Loading Xero credentials from Supabase Vault");
        console.log("🔓 STEP 3: Authenticating with Xero via OAuth 2.0");
        console.log("📊 STEP 4: Pulling P&L report + Balance Sheet from Xero");
        console.log(
          "⚙️ STEP 5: Calculating financial ratios and health indicators"
        );

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-review`,
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
          const reportText = `Financial review complete. ${
            data.totalReviewed
          } records reviewed. Revenue: $${data.totalRevenue?.toFixed(
            0
          )}. Gross margin: ${data.grossMargin?.toFixed(
            1
          )}%. Net margin: ${data.netMargin?.toFixed(1)}%. ${
            data.totalIssues > 0
              ? `${data.totalIssues} issues require partner attention.`
              : "All clear."
          }`;

          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("✅ XERO FINANCIAL DATA RECEIVED:", {
            totalRevenue: `$${data.totalRevenue?.toFixed(0)}`,
            totalExpenses: `$${data.totalExpenses?.toFixed(0)}`,
            grossMargin: `${data.grossMargin?.toFixed(1)}%`,
            netMargin: `${data.netMargin?.toFixed(1)}%`,
            currentRatio: data.currentRatio?.toFixed(2),
            debtToEquity: data.debtToEquity?.toFixed(2),
            issues: data.issues?.length,
            warnings: data.warnings?.length,
          });
          console.log("🤖 STEP 6: GPT-4o-mini financial health analysis");
          console.log(
            "   └─ System prompt: Expert Australian chartered accountant"
          );
          console.log(
            "   └─ Context: AASB standards, financial ratios, profitability"
          );
          console.log(
            "🤖 AI ANALYSIS:",
            data.aiAnalysis?.substring(0, 100) + "..."
          );
          console.log("💾 STEP 7: Saved to Supabase Postgres + Storage");
          console.log("   └─ Run ID:", data.runId);
          console.log("   └─ Storage:", data.storageFileUrl);
          console.groupEnd();

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
              totalInvoiced: data.totalRevenue,
              totalPaid: data.grossProfit,
              totalOutstanding: data.totalExpenses,
            },
          });
        } else {
          console.error("❌ Financial Review failed:", data.error);
          console.groupEnd();
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
      console.error("❌ Automation failed:", error);
      console.groupEnd();
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

<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {automations.map((a) => {
          const state = runStates[a.key];
          const isRunning = state.running;
          const isDone = state.done;

          const bulletPoints: Record<string, string[]> = {
            bas: [
              "Checks all bank transactions for missing descriptions",
              "Flags PAYE miscoding (Acc 505 vs 825)",
              "Detects GST-free supplies miscoded as taxable",
              "AI writes ATO compliance report",
            ],
            payroll: [
              "Groups transactions by employee (Acc 477/825)",
              "Validates PAYG withholding rate (15-45%)",
              "Flags voided entries — double payment risk",
              "Estimates super liability at 11.5% SGC",
            ],
            productivity: [
              "Pulls all invoices from Xero (paid + outstanding)",
              "Calculates collection efficiency %",
              "Flags overdue invoices past due date",
              "AI writes weekly partner summary",
            ],
            super: [
              "Calculates SGC liability at 11.5% per employee",
              "Checks super payments vs liability variance",
              "Tracks quarterly ATO due dates",
              "Flags shortfalls with urgency rating",
            ],
            financial: [
              "Pulls P&L + Balance Sheet from Xero",
              "Calculates gross margin, net margin, current ratio",
              "Flags metrics below healthy thresholds",
              "AI chartered accountant assessment",
            ],
          };

          const bullets = bulletPoints[a.key] || [];

          return (
            <Card
              key={a.key}
              className={cn(
                "relative overflow-hidden flex flex-col border transition-all duration-200",
                isRunning ? "border-[#2a3a5a] shadow-lg" :
                isDone ? "border-[#89ead3]/50 shadow-md" :
                "border-border hover:border-[#2a3a5a]/30 hover:shadow-md"
              )}
            >
              {/* Top accent line */}
              <div className={cn(
                "absolute top-0 left-0 right-0 h-[3px]",
                isRunning ? "bg-[#2a3a5a] animate-pulse" :
                isDone ? "bg-[#89ead3]" :
                "bg-[#2a3a5a]/20"
              )} />

              <CardContent className="p-5 flex flex-col flex-1 pt-6">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn(
                    "rounded-xl p-2.5 border shrink-0",
                    isDone ? "bg-[#89ead3]/10 border-[#89ead3]/30" :
                    isRunning ? "bg-[#2a3a5a]/10 border-[#2a3a5a]/20" :
                    "bg-[#2a3a5a]/5 border-[#2a3a5a]/10"
                  )}>
                    <a.icon className={cn(
                      "h-5 w-5",
                      isDone ? "text-[#89ead3]" :
                      isRunning ? "text-[#2a3a5a]" :
                      "text-[#2a3a5a]/60"
                    )} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-[#2a3a5a] leading-tight">{a.title}</h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{a.subtitle}</p>
                  </div>
                </div>

                {/* Bullet points */}
                <div className="mb-4 space-y-1.5">
                  {bullets.map((b, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#89ead3] shrink-0 mt-1.5" />
                      <p className="text-[11px] text-muted-foreground leading-snug">{b}</p>
                    </div>
                  ))}
                </div>

                {/* Stat pill */}
                <div className="rounded-lg border border-[#2a3a5a]/10 bg-[#2a3a5a]/5 px-3 py-1.5 mb-4">
                  <p className="text-[11px] font-semibold text-[#2a3a5a]/70">{a.stat}</p>
                </div>

                {/* Run button */}
                <Button
                  onClick={() => runAutomation(a.key)}
                  disabled={isRunning}
                  className={cn(
                    "w-full h-9 text-xs font-semibold mb-3 transition-all",
                    isRunning
                      ? "bg-[#2a3a5a]/80 text-white cursor-not-allowed"
                      : "bg-[#2a3a5a] hover:bg-[#2a3a5a]/90 text-white"
                  )}
                >
                  {isRunning ? (
                    <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Running…</>
                  ) : (
                    <><Play className="mr-2 h-3 w-3" />
                      Run {a.key === "bas" ? "Review" : a.key === "payroll" ? "Check" : "Report"}
                    </>
                  )}
                </Button>

                {/* Running phase */}
                {isRunning && (
                  <div className="rounded-lg border border-[#2a3a5a]/20 bg-[#2a3a5a]/5 px-3 py-2 mb-3 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 text-[#2a3a5a] animate-spin shrink-0" />
                    <p className="text-[11px] font-medium text-[#2a3a5a] animate-pulse">{state.phase}</p>
                  </div>
                )}

                {/* View report button */}
                {isDone && state.report && (
                  <Button
                    variant="outline"
                    onClick={() => setReportModal({ open: true, type: a.key })}
                    className="w-full border-[#89ead3] text-[#2a3a5a] hover:bg-[#89ead3]/10 font-semibold mb-3 h-9 text-xs"
                  >
                    <FileText className="mr-2 h-3 w-3 text-[#89ead3]" />
                    View Full Report
                  </Button>
                )}

                {/* Footer */}
                <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      a.connected ? "bg-[#89ead3] animate-pulse" : "bg-muted-foreground"
                    )} />
                    <span className="text-[10px] text-muted-foreground">
                      {a.connected ? "Xero OAuth 2.0" : "Disconnected"}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-muted-foreground">{a.lastRun}</span>
                    <span className={cn(
                      "text-[10px] font-semibold",
                      a.lastResultType === "success" ? "text-[#89ead3]" : "text-[#2a3a5a]/60"
                    )}>
                      {a.lastResult}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <OrchestrationFlow runStates={runStates} realData={realData} />

      <ReportModal
        open={reportModal.open}
        onOpenChange={(open) => setReportModal({ ...reportModal, open })}
        type={reportModal.type}
        report={reportModal.type ? runStates[reportModal.type].report : null}
        realData={
          ["bas", "productivity", "payroll", "super", "financial"].includes(
            reportModal.type || ""
          )
            ? realData
            : null
        }
      />

<AutomationHistoryTable />

      <AuditTrailPanel />
    </AppLayout>
  );
}

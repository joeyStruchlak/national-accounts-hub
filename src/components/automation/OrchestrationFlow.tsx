import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Cloud, Settings, Brain, UserCheck, FileText, Check, Loader2, Zap } from "lucide-react";

type RunState = { running: boolean; phase: string; done: boolean; report: string | null };

interface OrchestrationFlowProps {
  runStates: Record<string, RunState>;
  realData?: {
    totalReviewed?: number;
    totalIssues?: number;
    runId?: string;
  } | null;
}

const SUPABASE_PROJECT = "ovdgfaadyfjjwgbxubpw";
const XERO_TENANT = "add58e86...bde1";
const AI_ENDPOINT = "models.inference.ai.azure.com";
const AI_MODEL = "gpt-4o-mini";

const rulesDetail: Record<string, string> = {
  bas: "Missing descriptions · Acc505 miscoding · PAYE liability check",
  payroll: "Acc477 wages · Acc825 PAYG · 15-45% rate check · voided entries",
  productivity: "Invoice totals · collection rate · overdue past due date",
  super: "Acc477 wages · Acc820/826 super · 11.5% SGC · quarterly deadlines",
  financial: "Gross margin · net margin · current ratio · debt/equity",
};

const xeroEndpoint: Record<string, string> = {
  bas: "GET /BankTransactions (all pages)",
  payroll: "GET /BankTransactions → filter Acc477/825",
  productivity: "GET /Invoices?Statuses=AUTHORISED,PAID",
  super: "GET /BankTransactions → filter Acc477/820",
  financial: "GET /Reports/ProfitAndLoss + /BalanceSheet",
};

const automationLabel: Record<string, string> = {
  bas: "BAS / GST Review",
  payroll: "Payroll Reconciliation",
  productivity: "Weekly Productivity Report",
  super: "Super Reconciliation",
  financial: "Financial Review",
};

export function OrchestrationFlow({ runStates, realData }: OrchestrationFlowProps) {
  const [tick, setTick] = useState(0);
  const [liveLog, setLiveLog] = useState<string[]>([]);

  const anyRunning = Object.values(runStates).some((s) => s.running);
  const anyDone = Object.values(runStates).some((s) => s.done);
  const completedAll = anyDone && !anyRunning;

  const activeType = Object.entries(runStates).find(([, v]) => v.running)?.[0]
    || Object.entries(runStates).find(([, v]) => v.done)?.[0]
    || null;
  const activeState = activeType ? runStates[activeType] : null;

  const activePhaseIndex = (() => {
    if (!activeState?.running) return completedAll ? 4 : -1;
    const phase = activeState.phase;
    if (phase.includes("Connecting")) return 0;
    if (phase.includes("Pulling") || phase.includes("invoice") || phase.includes("transaction")) return 1;
    if (phase.includes("Analy") || phase.includes("Cross") || phase.includes("Calculat") || phase.includes("ratio")) return 2;
    if (phase.includes("Check") || phase.includes("Flag") || phase.includes("Aggregat")) return 3;
    if (phase.includes("Generat")) return 4;
    return 0;
  })();

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!anyRunning && !completedAll) {
      setLiveLog([]);
      return;
    }
    const logs: string[] = [];
    const now = new Date().toLocaleTimeString('en-AU', { hour12: false });
    if (activePhaseIndex >= 0) logs.push(`[${now}] OAuth 2.0 token → identity.xero.com/connect/token`);
    if (activePhaseIndex >= 1) logs.push(`[${now}] Xero tenant: ${XERO_TENANT} · ${activeType ? xeroEndpoint[activeType] : 'Fetching...'}`);
    if (activePhaseIndex >= 2) logs.push(`[${now}] Rules engine: ${activeType ? rulesDetail[activeType] : 'Processing...'}`);
    if (activePhaseIndex >= 3) logs.push(`[${now}] POST ${AI_ENDPOINT}/chat/completions · model: ${AI_MODEL} · temp: 0.3 · max_tokens: 200`);
    if (activePhaseIndex >= 4 || completedAll) logs.push(`[${now}] INSERT automation_runs → Supabase ${SUPABASE_PROJECT} (ap-southeast-2)`);
    if (completedAll && realData?.runId) logs.push(`[${now}] ✓ Run ID: ${realData.runId}`);
    setLiveLog(logs);
  }, [activePhaseIndex, anyRunning, completedAll, tick, activeType]);

  const steps = [
    {
      id: "xero",
      label: "Xero API",
      icon: Cloud,
      detail: "identity.xero.com/connect/token",
      runningDetail: activeType ? xeroEndpoint[activeType] : "Fetching...",
      doneDetail: `${realData?.totalReviewed || "—"} records pulled`,
    },
    {
      id: "rules",
      label: "Rules Engine",
      icon: Settings,
      detail: "Compliance rule checks",
      runningDetail: activeType ? rulesDetail[activeType] : "Processing...",
      doneDetail: activeType ? rulesDetail[activeType] : "Rules applied",
    },
    {
      id: "ai",
      label: "GPT-4o-mini",
      icon: Brain,
      detail: "models.inference.ai.azure.com",
      runningDetail: "temp: 0.3 · max_tokens: 200",
      doneDetail: "AI report written ✓",
    },
    {
      id: "human",
      label: "Partner Review",
      icon: UserCheck,
      detail: "Sign-off required",
      runningDetail: "Preparing report...",
      doneDetail: "Ready for review",
    },
    {
      id: "audit",
      label: "Audit Log",
      icon: FileText,
      detail: "Supabase · ap-southeast-2",
      runningDetail: "INSERT automation_runs...",
      doneDetail: realData?.runId ? `ID: ${realData.runId.slice(0, 8)}...` : "Logged ✓",
    },
  ];

  const lineWidth = completedAll ? 64 : anyRunning ? Math.max(0, (activePhaseIndex / (steps.length - 1)) * 64) : 0;

  if (!anyRunning && !completedAll) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Data Orchestration Flow</h3>
        </div>
        <div className="relative bg-muted/20 border border-border rounded-xl px-8 py-6">
          <div className="absolute top-[52px] left-[18%] right-[18%] h-[3px] rounded-full bg-border z-0" />
          <div className="relative z-10 flex items-start justify-between">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex flex-col items-center gap-2 w-28">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center border-2 border-border bg-white ring-4 ring-white">
                    <Icon className="h-4 w-4 text-muted-foreground/40" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground/50 text-center">{step.label}</span>
                  <span className="text-[10px] text-muted-foreground/30 text-center leading-tight px-1">{step.detail}</span>
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs text-muted-foreground/40 mt-5">Run an automation to see the live orchestration flow</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Data Orchestration Flow</h3>
        {anyRunning && activeType && (
          <div className="flex items-center gap-2 rounded-full border border-[#2a3a5a]/30 bg-[#2a3a5a]/5 px-3 py-1">
            <Loader2 className="h-3 w-3 text-[#2a3a5a] animate-spin" />
            <span className="text-[11px] font-semibold text-[#2a3a5a]">
              Running: {automationLabel[activeType] || activeType}
            </span>
          </div>
        )}
        {completedAll && activeType && (
          <div className="flex items-center gap-2 rounded-full border border-[#2a3a5a]/30 bg-[#2a3a5a]/5 px-3 py-1">
            <Check className="h-3 w-3 text-[#2a3a5a]" />
            <span className="text-[11px] font-semibold text-[#2a3a5a]">
              Complete: {automationLabel[activeType] || activeType}
            </span>
          </div>
        )}
      </div>

      <div className="relative bg-[#2a3a5a]/[0.03] border border-[#2a3a5a]/10 rounded-xl px-8 py-6">

        {/* Live phase label top right */}
        {anyRunning && activeState?.phase && (
          <div className="absolute top-3 right-4 text-[10px] text-[#2a3a5a] font-semibold animate-pulse flex items-center gap-1.5">
            <Zap className="h-3 w-3" />
            {activeState.phase}
          </div>
        )}

        {/* Background line */}
        <div className="absolute top-[52px] left-[18%] right-[18%] h-[3px] rounded-full bg-[#2a3a5a]/10 z-0" />

        {/* Animated progress line */}
        <div
          className="absolute top-[52px] left-[18%] h-[3px] rounded-full z-[1] transition-all duration-700 ease-out"
          style={{
            width: `${lineWidth}%`,
            background: 'linear-gradient(90deg, #2a3a5a 0%, #89ead3 100%)',
            boxShadow: '0 0 8px rgba(137, 234, 211, 0.4)',
          }}
        />

        {/* Steps */}
        <div className="relative z-20 flex items-start justify-between">
          {steps.map((step, i) => {
            const isActive = anyRunning && i === activePhaseIndex;
            const isCompleted = (anyRunning && i < activePhaseIndex) || completedAll;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center gap-2 w-28">
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center border-2 transition-all duration-500 relative ring-4 ring-white",
                  isCompleted
                    ? "bg-[#2a3a5a] border-[#2a3a5a] shadow-lg"
                    : isActive
                    ? "bg-white border-[#2a3a5a] shadow-lg"
                    : "bg-white border-border"
                )}>
                  {isCompleted ? (
                    <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 text-[#2a3a5a] animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground/40" strokeWidth={1.5} />
                  )}
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl border-2 border-[#2a3a5a] animate-ping opacity-20" />
                  )}
                </div>

                <span className={cn(
                  "text-[11px] font-bold text-center leading-tight",
                  isCompleted || isActive ? "text-[#2a3a5a]" : "text-muted-foreground/50"
                )}>
                  {step.label}
                </span>

                <span className={cn(
                  "text-[10px] text-center leading-tight px-1",
                  isCompleted ? "text-[#2a3a5a]/60" :
                  isActive ? "text-[#2a3a5a]/80 font-medium" :
                  "text-muted-foreground/30"
                )}>
                  {isActive ? step.runningDetail : isCompleted ? step.doneDetail : step.detail}
                </span>
              </div>
            );
          })}
        </div>

        {/* Live log terminal */}
        {liveLog.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#2a3a5a]/10">
            <div className="rounded-lg bg-[#2a3a5a] px-4 py-3 font-mono">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                <div className="h-2 w-2 rounded-full bg-[#89ead3]" />
                <span className="text-[10px] text-white/30 ml-1">National Accounts · Automation Runtime</span>
              </div>
              {liveLog.map((log, i) => (
                <div key={i} className={cn(
                  "text-[10px] leading-relaxed",
                  i === liveLog.length - 1 ? "text-[#89ead3] font-semibold" : "text-white/50"
                )}>
                  {log}
                </div>
              ))}
              {anyRunning && (
                <div className="text-[10px] text-white/30 mt-1 animate-pulse">█</div>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground/40">
                <span>Supabase · {SUPABASE_PROJECT} · ap-southeast-2</span>
                <span>·</span>
                <span>Xero OAuth 2.0</span>
                <span>·</span>
                <span>{AI_MODEL} · Azure</span>
              </div>
              {completedAll && (
                <span className="text-[10px] font-semibold text-[#2a3a5a]">
                  ✓ {new Date().toLocaleTimeString('en-AU')}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
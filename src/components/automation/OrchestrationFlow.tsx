import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Cloud, Settings, Brain, UserCheck, FileText } from "lucide-react";

type RunState = { running: boolean; phase: string; done: boolean; report: string | null };

const steps = [
  { id: "xero", label: "Xero API", icon: Cloud },
  { id: "rules", label: "Rules Engine", icon: Settings },
  { id: "ai", label: "AI Analysis", icon: Brain },
  { id: "human", label: "Human Review", icon: UserCheck },
  { id: "audit", label: "Audit Log", icon: FileText },
];

interface OrchestrationFlowProps {
  runStates: Record<string, RunState>;
}

export function OrchestrationFlow({ runStates }: OrchestrationFlowProps) {
  const anyRunning = Object.values(runStates).some((s) => s.running);
  const anyDone = Object.values(runStates).some((s) => s.done);

  // Map running phase index to pipeline step
  const activePhaseIndex = (() => {
    for (const s of Object.values(runStates)) {
      if (s.running && s.phase) {
        // phases have 5 steps, map to pipeline steps
        const runningEntry = Object.entries(runStates).find(([, v]) => v.running);
        if (!runningEntry) return -1;
        const phases = s.phase;
        if (phases.includes("Connecting")) return 0;
        if (phases.includes("Pulling")) return 1;
        if (phases.includes("Analy") || phases.includes("Cross") || phases.includes("Calculat")) return 2;
        if (phases.includes("Check") || phases.includes("Flag") || phases.includes("Aggregat")) return 3;
        if (phases.includes("Generat")) return 4;
      }
    }
    return -1;
  })();

  const completedAll = anyDone && !anyRunning;

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Data Orchestration Flow
      </h3>
      <div className="relative flex items-center justify-between bg-primary/5 border border-border rounded-md px-6 py-5">
        {/* Connecting line */}
        <div className="absolute top-1/2 left-[10%] right-[10%] h-[2px] -translate-y-1/2 bg-border z-0" />
        {/* Active line overlay */}
        {(anyRunning || completedAll) && (
          <div
            className="absolute top-1/2 left-[10%] h-[2px] -translate-y-1/2 bg-accent z-[1] transition-all duration-700 ease-out"
            style={{
              width: completedAll
                ? "80%"
                : `${Math.max(0, ((activePhaseIndex) / (steps.length - 1)) * 80)}%`,
            }}
          />
        )}

        {steps.map((step, i) => {
          const isActive = anyRunning && i === activePhaseIndex;
          const isCompleted = (anyRunning && i < activePhaseIndex) || completedAll;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 w-24">
              <div
                className={cn(
                  "w-12 h-12 rounded-md flex items-center justify-center border transition-all duration-500",
                  isCompleted
                    ? "bg-accent border-accent text-accent-foreground shadow-md"
                    : isActive
                      ? "bg-accent/20 border-accent text-accent animate-pulse shadow-lg"
                      : "bg-primary border-primary/60 text-primary-foreground/60"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <span
                className={cn(
                  "text-[11px] font-semibold text-center leading-tight",
                  isCompleted || isActive ? "text-accent" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

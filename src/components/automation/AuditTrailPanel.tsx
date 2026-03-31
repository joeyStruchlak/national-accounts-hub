import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Shield, RefreshCw, Database, Zap, CheckCircle2, AlertTriangle } from "lucide-react";

type AuditRun = {
  id: string;
  automation_type: string;
  run_by: string;
  status: string;
  records_reviewed: number;
  issues_found: number;
  completed_at: string;
};

export function AuditTrailPanel() {
  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRuns();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRuns, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRuns = async () => {
    const { data, error } = await supabase
      .from('automation_runs')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(8);

    if (!error && data) setRuns(data);
    setLoading(false);
  };

  const getIcon = (type: string, issues: number) => {
    if (issues > 0) return <AlertTriangle className="h-3 w-3 text-orange-500 shrink-0" />;
    return <CheckCircle2 className="h-3 w-3 text-[#89ead3] shrink-0" />;
  };

  const getTypeShort = (type: string) => {
    const map: Record<string, string> = {
      'BAS Review': 'BAS',
      'Weekly Productivity Report': 'Productivity',
      'Payroll Reconciliation': 'Payroll',
      'Super Reconciliation': 'Super',
      'Financial Review': 'Financial',
    };
    return map[type] || type;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) return `Today ${formatTime(iso)}`;
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) + ' · ' + formatTime(iso);
  };

  return (
    <div className="mt-6 rounded-xl border border-[#2a3a5a]/10 bg-[#2a3a5a]/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2a3a5a]/10 bg-[#2a3a5a]/[0.03]">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#2a3a5a]" />
          <h3 className="text-xs font-bold text-[#2a3a5a] uppercase tracking-widest">Audit Trail</h3>
          <span className="text-[10px] text-muted-foreground">· Live from Supabase</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#89ead3] animate-pulse" />
            <span className="text-[10px] text-muted-foreground">Auto-refreshes every 30s</span>
          </div>
          <button
            onClick={fetchRuns}
            className="text-[10px] text-[#2a3a5a]/50 hover:text-[#2a3a5a] transition-colors flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div className="px-5 py-3 font-mono">
        {loading ? (
          <p className="text-xs text-muted-foreground/40 py-2">Loading audit log...</p>
        ) : runs.length === 0 ? (
          <p className="text-xs text-muted-foreground/40 py-2">No automation runs yet. Run your first automation above.</p>
        ) : (
          <div className="space-y-2">
            {runs.map((run, i) => (
              <div
                key={run.id}
                className={cn(
                  "flex items-start gap-3 py-2 border-b border-[#2a3a5a]/5 last:border-0",
                  i === 0 && "bg-[#89ead3]/5 -mx-5 px-5 rounded"
                )}
              >
                {getIcon(run.automation_type, run.issues_found)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-[#2a3a5a]">
                      {getTypeShort(run.automation_type)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {run.records_reviewed} records reviewed
                    </span>
                    {run.issues_found > 0 ? (
                      <span className="text-[10px] font-semibold text-orange-500">
                        {run.issues_found} issues
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-[#89ead3]">All clear</span>
                    )}
                    <span className="text-[10px] text-muted-foreground/50 font-mono">
                      ID: {run.id.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-muted-foreground/50">
                      <Database className="h-2.5 w-2.5 inline mr-1" />
                      Supabase ovdgfaadyfjjwgbxubpw · ap-southeast-2
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">
                      <Zap className="h-2.5 w-2.5 inline mr-1" />
                      Xero OAuth 2.0 · gpt-4o-mini
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground/50 shrink-0 font-mono">
                  {formatDate(run.completed_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-[#2a3a5a]/10 bg-[#2a3a5a]/[0.02] flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/40">
          Logs retained 7 years · Immutable · AES-256 encrypted · Satisfies Xero Req. 8
        </span>
        <span className="text-[10px] text-[#2a3a5a]/40 font-mono">
          {runs.length} recent entries
        </span>
      </div>
    </div>
  );
}
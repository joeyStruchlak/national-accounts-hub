import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  Users, Briefcase, AlertTriangle, TrendingUp,
  Clock, Loader2, CheckCircle2, Zap, Shield, BarChart3
} from "lucide-react";

type Job = {
  id: string;
  client_name: string;
  job_type: string;
  assigned_to: string;
  stage: string;
  due_date: string;
  days_in_stage: number;
  priority: string;
  ai_flag: string | null;
};

type Staff = {
  id: string;
  name: string;
  utilisation: number;
  jobs_count: number;
  capacity: string;
};

type AutomationRun = {
  id: string;
  automation_type: string;
  completed_at: string;
  records_reviewed: number;
  issues_found: number;
  status: string;
};

function CapacityBar({ value }: { value: number }) {
  const color = value >= 90 ? "bg-destructive" : value >= 75 ? "bg-warning" : "bg-accent";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
      <span className={cn("text-xs font-semibold w-8 text-right", value >= 90 ? "text-destructive" : value >= 75 ? "text-warning" : "text-muted-foreground")}>
        {value}%
      </span>
    </div>
  );
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [clients, setClients] = useState<number>(0);
  const [automationRuns, setAutomationRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);

    const [jobsRes, staffRes, clientsRes, runsRes] = await Promise.all([
      supabase.from('jobs').select('*').order('due_date', { ascending: true }),
      supabase.from('staff').select('*').order('utilisation', { ascending: false }).limit(6),
      supabase.from('clients').select('id', { count: 'exact' }),
      supabase.from('automation_runs').select('*').order('completed_at', { ascending: false }).limit(4),
    ]);

    setJobs(jobsRes.data || []);
    setStaff(staffRes.data || []);
    setClients(clientsRes.count || 0);
    setAutomationRuns(runsRes.data || []);
    setLoading(false);
  };

  const inProgress = jobs.filter(j => j.stage !== 'Sent').length;
  const overdue = jobs.filter(j => j.days_in_stage > 14).length;
  const avgUtil = staff.length > 0 ? Math.round(staff.reduce((a, b) => a + b.utilisation, 0) / staff.length) : 0;
  const recentJobs = jobs.slice(0, 5);

  const automationConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    'BAS Review': { icon: <Shield className="h-4 w-4" />, color: 'text-accent' },
    'Weekly Productivity Report': { icon: <BarChart3 className="h-4 w-4" />, color: 'text-warning' },
    'Payroll Reconciliation': { icon: <Users className="h-4 w-4" />, color: 'text-primary' },
    'Super Reconciliation': { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-accent' },
  };

  return (
    <AppLayout>
      <PageHeader title="Dashboard" subtitle="Overview of National Accounts operations" onExport={() => {}} />

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Clients", value: clients.toLocaleString(), icon: Users, change: "Seeded · 2000 in XPM", color: "text-primary" },
              { label: "Jobs In Progress", value: inProgress.toString(), icon: Briefcase, change: "Across 16 staff", color: "text-primary" },
              { label: "Overdue Jobs", value: overdue.toString(), icon: AlertTriangle, change: "14+ days in stage", color: overdue > 0 ? "text-destructive" : "text-accent" },
              { label: "Avg Utilisation", value: `${avgUtil}%`, icon: TrendingUp, change: "Target: 85%", color: avgUtil >= 85 ? "text-destructive" : "text-warning" },
            ].map((s) => (
              <Card key={s.label} className="shadow-premium border-border border-t-2 border-t-warning">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                      <p className={cn("mt-1 text-3xl font-bold", s.color)}>{s.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{s.change}</p>
                    </div>
                    <div className="rounded p-2 border border-warning/30 bg-warning/5">
                      <s.icon className="h-5 w-5 text-warning" strokeWidth={1.5} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Recent Jobs */}
            <Card className="col-span-2 shadow-premium">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Jobs</CardTitle>
                  <p className="text-xs text-accent font-medium">📌 Supabase DB · Option 2: live XPM</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentJobs.map((job) => (
                    <div key={job.id} className={cn(
                      "flex items-center justify-between rounded border p-3 hover:bg-muted/50 transition-colors",
                      job.days_in_stage > 14 && "border-destructive/30 bg-destructive/5",
                      job.ai_flag && "border-warning/30"
                    )}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-primary">{job.client_name}</p>
                        <p className="text-xs text-muted-foreground">{job.job_type} · {job.assigned_to}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {job.ai_flag && (
                          <span className="text-[10px] font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                            ⚡ {job.ai_flag}
                          </span>
                        )}
                        <span className={cn(
                          "text-xs font-medium flex items-center gap-1",
                          job.days_in_stage > 14 ? "text-destructive" : "text-muted-foreground"
                        )}>
                          <Clock className="h-3 w-3" />
                          {job.days_in_stage > 14 ? `${job.days_in_stage}d overdue` : `${job.days_in_stage}d in stage`}
                        </span>
                        <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                          {job.stage}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Team Capacity */}
            <Card className="shadow-premium">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Team Capacity</CardTitle>
                  <p className="text-xs text-accent font-medium">Top 6</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {staff.map((s) => (
                    <div key={s.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-sm font-medium", s.utilisation >= 90 && "text-destructive")}>
                          {s.name.split(' ')[0]} {s.name.split(' ')[1]?.[0]}.
                        </span>
                        <span className="text-xs text-muted-foreground">{s.jobs_count} jobs</span>
                      </div>
                      <CapacityBar value={s.utilisation} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Automation Status */}
          <Card className="shadow-premium border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" />
                  <CardTitle className="text-lg">AI Automation Status</CardTitle>
                </div>
                <a href="/automation" className="text-xs text-accent underline font-medium">Run automations →</a>
              </div>
            </CardHeader>
            <CardContent>
              {automationRuns.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">No automations run yet.</p>
                  <a href="/automation" className="text-xs text-accent underline mt-1 block">Run your first automation →</a>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {automationRuns.map((run) => {
                    const config = automationConfig[run.automation_type] || { icon: <Zap className="h-4 w-4" />, color: 'text-accent' };
                    return (
                      <div key={run.id} className="rounded border border-border bg-muted/30 p-3">
                        <div className={cn("flex items-center gap-2 mb-2", config.color)}>
                          {config.icon}
                          <p className="text-xs font-semibold text-primary leading-tight">{run.automation_type}</p>
                        </div>
                        <p className="text-lg font-bold text-primary">{run.records_reviewed}</p>
                        <p className="text-[10px] text-muted-foreground">records reviewed</p>
                        <p className={cn("text-xs font-semibold mt-1", run.issues_found > 0 ? "text-warning" : "text-accent")}>
                          {run.issues_found > 0 ? `${run.issues_found} issues found` : "✓ All clear"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(run.completed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  );
}
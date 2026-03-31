import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Lock, Sparkles, AlertTriangle, Clock, CheckCircle2, ChevronRight, Database, Brain, Zap, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const stages = ["ITR Draft", "Prepared", "Completed", "Approved", "Sent"] as const;
type Stage = typeof stages[number];

type Job = {
  id: string;
  client_name: string;
  job_type: string;
  assigned_to: string;
  stage: Stage;
  due_date: string;
  days_in_stage: number;
  year: string;
  priority: string;
  ai_flag: string | null;
};

const stageConfig: Record<Stage, { color: string; icon: React.ReactNode; description: string; xpmSource: string }> = {
  "ITR Draft": {
    color: "bg-muted/60 border-border",
    icon: <Clock className="h-3.5 w-3.5" />,
    description: "Awaiting preparation",
    xpmSource: "XPM: Job created, assigned to staff"
  },
  "Prepared": {
    color: "bg-warning/5 border-warning/30",
    icon: <ChevronRight className="h-3.5 w-3.5 text-warning" />,
    description: "Ready for review",
    xpmSource: "XPM: Staff marks job prepared"
  },
  "Completed": {
    color: "bg-accent/5 border-accent/30",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-accent" />,
    description: "Review complete",
    xpmSource: "XPM: Manager review done"
  },
  "Approved": {
    color: "bg-primary/5 border-primary/30",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-primary" />,
    description: "Partner approved",
    xpmSource: "XPM: Partner sign-off recorded"
  },
  "Sent": {
    color: "bg-success/5 border-success/30",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
    description: "Lodged with ATO",
    xpmSource: "XPM: Lodgement confirmed"
  },
};

export default function JobPipeline() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStaff, setFilterStaff] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showXpmInfo, setShowXpmInfo] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    console.group("📋 JOB PIPELINE — Loading from Supabase")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("📡 Querying Supabase jobs table (Sydney region)")
    console.log("   └─ Table: jobs")
    console.log("   └─ RLS: enabled")

    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) {
      console.error("❌ Failed to load jobs:", error)
    } else {
      console.log(`✅ Loaded ${data?.length} jobs from Supabase`)
      console.log("   └─ In Option 2: this data comes live from XPM API")
      console.groupEnd()
      setJobs(data || []);
    }
    setLoading(false);
  };

  const staffList = [...new Set(jobs.map(j => j.assigned_to))].sort();
  const jobTypes = [...new Set(jobs.map(j => j.job_type))].sort();

  const filtered = jobs.filter(j => {
    if (filterStaff !== "all" && j.assigned_to !== filterStaff) return false;
    if (filterType !== "all" && j.job_type !== filterType) return false;
    return true;
  });

  const totalJobs = filtered.length;
  const overdueJobs = filtered.filter(j => j.days_in_stage > 14).length;
  const aiFlags = filtered.filter(j => j.ai_flag).length;
  const completedJobs = filtered.filter(j => j.stage === "Sent").length;

  return (
    <AppLayout>
      <PageHeader title="Job Pipeline" subtitle="Track all jobs through the workflow — ITR Draft to Sent" onExport={() => {}}>
        <div className="flex items-center gap-2">
          <Select value={filterStaff} onValueChange={setFilterStaff}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staffList.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {jobTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchJobs}>
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* XPM Banner */}
      <div className="mb-4 rounded-md border border-warning/40 bg-warning/5 px-5 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-warning">⚠ Seeded Data — XPM Integration Pending</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                This board is pulling <strong>real data from Supabase</strong> (48 jobs seeded to match National Accounts workflow).
                In Option 2 this is replaced with a <strong>live XPM API feed</strong> once Xero security assessment is approved.
                The UI, filters, and AI flags are production-ready now.
              </p>
              <button onClick={() => setShowXpmInfo(!showXpmInfo)} className="text-xs text-warning underline mt-1">
                {showXpmInfo ? "Hide details" : "Why can't we access XPM yet?"}
              </button>
            </div>
          </div>
          <Badge variant="outline" className="border-warning text-warning shrink-0 ml-4">Option 2</Badge>
        </div>

        {showXpmInfo && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded border border-border bg-background p-3">
              <p className="text-xs font-semibold mb-1">🔒 The Blocker</p>
              <p className="text-xs text-muted-foreground">Xero requires a security assessment to unlock Tier 2 API access which includes XPM. Mike has been on Tier 1 using personal credentials through Claude agents — not a registered app. Our app satisfies all 10 requirements and is ready to submit.</p>
            </div>
            <div className="rounded border border-border bg-background p-3">
              <p className="text-xs font-semibold mb-1">✅ What We've Done</p>
              <p className="text-xs text-muted-foreground">Built registered Xero app satisfying all 10 security requirements: OAuth 2.0, TLS, Australian hosting, audit logging, encryption, server hardening, Google SSO login, terms page. Ready to submit assessment today.</p>
            </div>
            <div className="rounded border border-border bg-background p-3">
              <p className="text-xs font-semibold mb-1">⚡ What Unlocks</p>
              <p className="text-xs text-muted-foreground">Once approved (5-10 days): Real job data from XPM · Staff assignments · Due dates · Job status transitions · AI workflow automation · ATO lodgement tracking · 2000 client records sync · Bulk grading.</p>
            </div>
          </div>
        )}
      </div>

      {/* Data source strip */}
      <div className="mb-4 rounded border border-border bg-muted/30 px-4 py-2 flex items-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-accent" />
          <span><strong className="text-accent">Data source:</strong> Supabase DB (Sydney) — seeded to match National Accounts workflow</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5 text-warning" />
          <span><strong className="text-warning">AI flags:</strong> Seeded — will trigger from real BAS + payroll automation results</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-warning" />
          <span><strong className="text-warning">Stage transitions:</strong> Manual — will auto-update from XPM webhooks in Option 2</span>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Jobs", value: totalJobs, sub: "Across all stages", color: "text-primary" },
              { label: "Completed (Sent)", value: completedJobs, sub: "Lodged with ATO", color: "text-accent" },
              { label: "Overdue (14+ days)", value: overdueJobs, sub: "Needs attention", color: "text-destructive" },
              { label: "AI Flags", value: aiFlags, sub: "GST + doc issues", color: "text-warning" },
            ].map((stat) => (
              <Card key={stat.label} className="p-4 text-center border-border">
                <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                <p className="text-xs font-semibold text-foreground mt-0.5">{stat.label}</p>
                <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
              </Card>
            ))}
          </div>

          {/* Kanban */}
          <div className="grid grid-cols-5 gap-3 overflow-x-auto pb-4">
            {stages.map((stage) => {
              const stageJobs = filtered.filter((j) => j.stage === stage);
              const config = stageConfig[stage];
              return (
                <div key={stage} className="min-w-[200px]">
                  <div className="rounded-t-lg bg-primary px-3 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-accent">{config.icon}</span>
                      <h3 className="text-xs font-semibold text-white">{stage}</h3>
                    </div>
                    <span className="text-xs font-bold text-primary bg-accent rounded-full px-2 py-0.5">
                      {stageJobs.length}
                    </span>
                  </div>
                  <div className="bg-muted/20 border-x border-border px-2 py-1">
                    <p className="text-[9px] text-muted-foreground">{config.description}</p>
                    <p className="text-[9px] text-warning font-medium">📌 {config.xpmSource}</p>
                  </div>
                  <div className={cn("space-y-2 p-2 rounded-b-lg min-h-[500px] border border-t-0", config.color)}>
                    {stageJobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                        className={cn(
                          "rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-all cursor-pointer",
                          selectedJob?.id === job.id && "ring-2 ring-accent",
                          job.priority === "urgent" && "border-l-4 border-l-destructive",
                          job.priority === "high" && "border-l-4 border-l-warning",
                        )}
                      >
                        <p className="text-xs font-semibold truncate text-primary">{job.client_name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{job.job_type} · {job.year}</p>
                        <p className="text-[10px] text-muted-foreground">{job.assigned_to}</p>

                        {job.ai_flag && (
                          <div className="mt-1.5 flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5">
                            <Sparkles className="h-2.5 w-2.5 text-warning shrink-0" />
                            <p className="text-[9px] font-medium text-warning">{job.ai_flag}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground">
                            Due {new Date(job.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className={cn(
                            "text-[10px] font-semibold rounded-full px-1.5 py-0.5",
                            job.days_in_stage > 14 ? "bg-destructive/10 text-destructive" :
                            job.days_in_stage > 7 ? "bg-warning/10 text-warning" :
                            "bg-accent/10 text-accent"
                          )}>
                            {job.days_in_stage}d
                          </span>
                        </div>
                      </div>
                    ))}

                    {stageJobs.length === 0 && (
                      <div className="flex items-center justify-center h-20">
                        <p className="text-xs text-muted-foreground">No jobs</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Job detail panel */}
          {selectedJob && (
            <Card className="mt-4 p-5 border-accent/30 bg-accent/5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-primary">{selectedJob.client_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedJob.job_type} · {selectedJob.year}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-accent text-accent text-[10px]">Supabase DB</Badge>
                  <Badge variant="outline" className="border-primary text-primary">{selectedJob.stage}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Assigned To</p>
                  <p className="font-semibold">{selectedJob.assigned_to}</p>
                  <p className="text-[10px] text-warning">📌 Option 2: syncs from XPM</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Due Date</p>
                  <p className="font-semibold">{new Date(selectedJob.due_date).toLocaleDateString('en-AU')}</p>
                  <p className="text-[10px] text-warning">📌 Option 2: syncs from XPM</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Days in Stage</p>
                  <p className={cn("font-semibold", selectedJob.days_in_stage > 14 ? "text-destructive" : selectedJob.days_in_stage > 7 ? "text-warning" : "text-accent")}>
                    {selectedJob.days_in_stage} days
                  </p>
                  <p className="text-[10px] text-warning">📌 Option 2: auto-calculated</p>
                </div>
              </div>

              {selectedJob.ai_flag && (
                <div className="mb-3 rounded border border-warning/30 bg-warning/5 px-3 py-2 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-warning">🤖 AI Flag: {selectedJob.ai_flag}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">In Option 2 this triggers automatically from BAS Review or Payroll automation when it detects an issue on this client.</p>
                  </div>
                </div>
              )}

              <div className="rounded border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-xs font-bold text-primary mb-2">🔒 What Option 2 Unlocks for This Job</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>✓ Real client + job details from XPM</div>
                  <div>✓ Auto stage transitions when work done</div>
                  <div>✓ AI triggers BAS review on ITR Draft</div>
                  <div>✓ Partner notified when job reaches Approved</div>
                  <div>✓ ATO lodgement confirmation when Sent</div>
                  <div>✓ Client notification on completion</div>
                </div>
              </div>
            </Card>
          )}

          {/* Bottom flow */}
          <div className="mt-6 rounded border border-border bg-muted/20 p-4">
            <p className="text-xs font-bold text-primary mb-3">📋 How This Works in Option 2 (Full XPM Access)</p>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              {[
                { icon: "🔗", title: "XPM API", desc: "Pulls all jobs, staff, due dates in real time" },
                { icon: "⚙️", title: "Rules Engine", desc: "Detects overdue, bottlenecks, missing docs" },
                { icon: "🤖", title: "AI Analysis", desc: "GPT-4o flags compliance risks per client" },
                { icon: "⚡", title: "Auto Updates", desc: "Jobs move stages via XPM webhooks" },
                { icon: "📧", title: "Notifications", desc: "Staff + partners notified at milestones" },
              ].map((s) => (
                <div key={s.title} className="rounded border border-border bg-background p-3">
                  <p className="text-lg mb-1">{s.icon}</p>
                  <p className="font-semibold text-primary text-[11px]">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
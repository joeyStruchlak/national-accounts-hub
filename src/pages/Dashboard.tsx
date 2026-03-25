import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { AIStatusBadge } from "@/components/AIStatusBadge";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Users,
  Briefcase,
  AlertTriangle,
  TrendingUp,
  Clock,
} from "lucide-react";

const stats = [
  { label: "Total Clients", value: "2,000", icon: Users, change: "+12 this month" },
  { label: "Jobs In Progress", value: "347", icon: Briefcase, change: "Across 16 staff" },
  { label: "Overdue Items", value: "23", icon: AlertTriangle, change: "↓ 5 from last week" },
  { label: "Team Utilisation", value: "78%", icon: TrendingUp, change: "Target: 85%" },
];

const recentJobs = [
  { client: "Meridian Property Group", type: "ITR", staff: "Sarah M.", dueIn: "2 days", aiStatus: "cleared" as const },
  { client: "Coastal Builders Pty Ltd", type: "BAS", staff: "James T.", dueIn: "Overdue", aiStatus: "flagged" as const },
  { client: "Sydney Tech Solutions", type: "ITR", staff: "Emma L.", dueIn: "5 days", aiStatus: "review" as const },
  { client: "Blue Ocean Imports", type: "Payroll Rec", staff: "David K.", dueIn: "1 day", aiStatus: "cleared" as const },
  { client: "Harbour View Dental", type: "Super Rec", staff: "Lisa P.", dueIn: "3 days", aiStatus: "cleared" as const },
];

const teamCapacity = [
  { name: "Sarah M.", utilisation: 92, jobs: 28 },
  { name: "James T.", utilisation: 85, jobs: 24 },
  { name: "Emma L.", utilisation: 78, jobs: 22 },
  { name: "David K.", utilisation: 65, jobs: 18 },
  { name: "Lisa P.", utilisation: 88, jobs: 26 },
  { name: "Michael R.", utilisation: 45, jobs: 12 },
];

function CapacityBar({ value, name }: { value: number; name: string }) {
  const isOverloaded = value >= 85;
  const isAmber = value >= 70 && value < 85;
  const color = isOverloaded ? "bg-destructive" : isAmber ? "bg-warning" : "bg-success";

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 rounded-sm bg-muted overflow-hidden">
        <div className={`h-full rounded-sm transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-xs font-semibold w-12 text-right flex items-center justify-end gap-1 ${isOverloaded ? "text-destructive" : "text-muted-foreground"}`}>
        {isOverloaded && <AlertTriangle className="h-3 w-3 text-destructive" />}
        {value}%
      </span>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AppLayout>
      <PageHeader title="Dashboard" subtitle="Overview of National Accounts operations" onExport={() => {}} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-premium border-border border-t-2 border-t-accent overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="mt-1 text-3xl font-bold text-primary">{s.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.change}</p>
                </div>
                <div className="rounded p-2 border border-accent/30 bg-accent/5">
                  <s.icon className="h-5 w-5 text-accent" strokeWidth={1.5} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-premium">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentJobs.map((job) => (
                <div key={job.client} className="flex items-center justify-between rounded border p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{job.client}</p>
                    <p className="text-xs text-muted-foreground">{job.type} · {job.staff}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <AIStatusBadge status={job.aiStatus} />
                    <span className={`text-xs font-medium ${job.dueIn === "Overdue" ? "text-destructive" : "text-muted-foreground"}`}>
                      <Clock className="inline h-3 w-3 mr-1" />
                      {job.dueIn}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-premium">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Team Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamCapacity.map((t) => (
                <div key={t.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${t.utilisation >= 85 ? "text-destructive" : ""}`}>{t.name}</span>
                    <span className="text-xs text-muted-foreground">{t.jobs} jobs</span>
                  </div>
                  <CapacityBar value={t.utilisation} name={t.name} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

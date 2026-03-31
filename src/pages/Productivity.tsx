import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertTriangle, TrendingUp, Users, CheckCircle2 } from "lucide-react";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
  utilisation: number;
  jobs_count: number;
  jobs_completed: number;
  capacity: string;
};

function CapacityBar({ value }: { value: number }) {
  const color = value >= 90 ? "bg-destructive" : value >= 75 ? "bg-warning" : value >= 60 ? "bg-accent" : "bg-muted-foreground";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-sm font-semibold w-10">{value}%</span>
    </div>
  );
}

const capacityConfig: Record<string, { label: string; className: string }> = {
  overloaded: { label: "Overloaded", className: "bg-destructive/10 text-destructive border border-destructive/30" },
  high: { label: "High Load", className: "bg-warning/10 text-warning border border-warning/30" },
  normal: { label: "Optimal", className: "bg-accent/10 text-accent border border-accent/30" },
  low: { label: "Underutilised", className: "bg-muted text-muted-foreground border border-border" },
};

export default function Productivity() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    console.group("📊 PRODUCTIVITY — Loading from Supabase")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("📡 Querying Supabase staff table (Sydney region)")
    console.log("   └─ In Option 2: real utilisation from XPM timesheets")
    setLoading(true);
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('utilisation', { ascending: false });

    if (error) {
      console.error("❌ Failed to load staff:", error)
    } else {
      console.log(`✅ Loaded ${data?.length} staff members from Supabase`)
      console.groupEnd()
      setStaff(data || []);
    }
    setLoading(false);
  };

  const totalCompleted = staff.reduce((a, b) => a + b.jobs_completed, 0);
  const avgUtil = staff.length > 0 ? Math.round(staff.reduce((a, b) => a + b.utilisation, 0) / staff.length) : 0;
  const overloaded = staff.filter(s => s.capacity === 'overloaded').length;
  const underutilised = staff.filter(s => s.capacity === 'low').length;

  return (
    <AppLayout>
      <PageHeader title="Productivity Reports" subtitle="Weekly staff performance and capacity overview" onExport={() => {}} />

      {/* XPM notice */}
      <div className="mb-6 rounded border border-warning/30 bg-warning/5 px-4 py-3 flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-warning">Data source: Supabase DB (Sydney)</strong> — seeded to match National Accounts team.
          In Option 2 utilisation calculates automatically from <strong>XPM timesheets</strong> and job completion data in real time.
          Jon's goal: saves 30-45 mins every week vs manual Excel reporting.
        </p>
      </div>

      {/* Stats row */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="shadow-premium border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Avg Utilisation</p>
                  <TrendingUp className="h-4 w-4 text-accent" />
                </div>
                <p className={cn("text-3xl font-bold mt-1", avgUtil >= 85 ? "text-destructive" : avgUtil >= 70 ? "text-warning" : "text-accent")}>{avgUtil}%</p>
                <p className="text-xs text-muted-foreground mt-1">Target: 85%</p>
              </CardContent>
            </Card>
            <Card className="shadow-premium border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Jobs Completed</p>
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                </div>
                <p className="text-3xl font-bold text-accent mt-1">{totalCompleted}</p>
                <p className="text-xs text-muted-foreground mt-1">This period</p>
              </CardContent>
            </Card>
            <Card className="shadow-premium border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Overloaded Staff</p>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <p className="text-3xl font-bold text-destructive mt-1">{overloaded}</p>
                <p className="text-xs text-muted-foreground mt-1">Need capacity review</p>
              </CardContent>
            </Card>
            <Card className="shadow-premium border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Underutilised</p>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold text-muted-foreground mt-1">{underutilised}</p>
                <p className="text-xs text-muted-foreground mt-1">Available capacity</p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border bg-card shadow-premium overflow-hidden">
            <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                <strong>{staff.length}</strong> staff members · Sorted by utilisation
              </p>
              <p className="text-xs text-accent font-medium">
                📌 Data source: Supabase DB · Option 2: live XPM timesheet sync
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="gradient-navy">
                  <TableHead className="text-white font-semibold">Staff Member</TableHead>
                  <TableHead className="text-white font-semibold">Role</TableHead>
                  <TableHead className="text-white font-semibold">Email</TableHead>
                  <TableHead className="text-white font-semibold">Jobs Total</TableHead>
                  <TableHead className="text-white font-semibold">Jobs Done</TableHead>
                  <TableHead className="text-white font-semibold">Utilisation</TableHead>
                  <TableHead className="text-white font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => {
                  const cfg = capacityConfig[s.capacity] || capacityConfig.normal;
                  return (
                    <TableRow key={s.id} className={cn(
                      "hover:bg-muted/50",
                      s.capacity === 'overloaded' && "bg-destructive/5",
                      s.capacity === 'low' && "bg-muted/30",
                    )}>
                      <TableCell className="font-semibold text-primary">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{s.role}</TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">{s.email}</TableCell>
                      <TableCell className="font-semibold">{s.jobs_count}</TableCell>
                      <TableCell className="font-semibold text-accent">{s.jobs_completed}</TableCell>
                      <TableCell><CapacityBar value={s.utilisation} /></TableCell>
                      <TableCell>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", cfg.className)}>
                          {cfg.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* AI insight */}
          <div className="mt-4 rounded border border-accent/30 bg-accent/5 px-4 py-3">
            <p className="text-xs font-semibold text-primary mb-1">🤖 AI Insight (Option 2)</p>
            <p className="text-xs text-muted-foreground">
              In Option 2 GPT-4o-mini analyses this data every Monday morning and emails Jon and Mike a summary:
              who's overloaded, who has capacity, where jobs are bottlenecking, and recommended reallocation.
              This is the 30-45 mins per week Jon mentioned saving. Zero manual work.
            </p>
          </div>
        </>
      )}
    </AppLayout>
  );
}
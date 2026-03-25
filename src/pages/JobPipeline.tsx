import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const stages = ["ITR Draft", "Prepared", "Completed", "Approved", "Sent"] as const;
const staff = ["Sarah M.", "James T.", "Emma L.", "David K.", "Lisa P.", "Michael R.", "Anna W.", "Tom B."];

const jobsData = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  client: [
    "Meridian Property", "Coastal Builders", "Sydney Tech", "Blue Ocean Imports",
    "Harbour View Dental", "Peak Fitness", "Murray Wines", "Outback Mining",
    "Pacific Logistics", "Kangaroo Farms", "Bondi Cafe", "Reef Tours",
    "Melbourne Design", "Adelaide Fresh", "Brisbane Construction",
  ][i % 15],
  staff: staff[i % staff.length],
  dueDate: `${15 + (i % 15)} Mar 2025`,
  daysInStage: Math.floor(Math.random() * 14) + 1,
  stage: stages[i % stages.length],
}));

export default function JobPipeline() {
  const [filterStaff, setFilterStaff] = useState("all");

  const filtered = useMemo(
    () => (filterStaff === "all" ? jobsData : jobsData.filter((j) => j.staff === filterStaff)),
    [filterStaff]
  );

  return (
    <AppLayout>
      <PageHeader title="Job Pipeline" subtitle="Track jobs through the workflow" onExport={() => {}}>
        <Select value={filterStaff} onValueChange={setFilterStaff}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      <div className="grid grid-cols-5 gap-4 overflow-x-auto">
        {stages.map((stage) => {
          const stageJobs = filtered.filter((j) => j.stage === stage);
          return (
            <div key={stage} className="min-w-[220px]">
              <div className="rounded-t-lg gradient-navy px-4 py-2.5 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-accent-foreground">{stage}</h3>
                <span className="text-xs font-bold text-accent bg-accent/20 rounded-full px-2 py-0.5">
                  {stageJobs.length}
                </span>
              </div>
              <div className="space-y-2 p-2 bg-muted/50 rounded-b-lg min-h-[400px]">
                {stageJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-lg border bg-card p-3 shadow-premium hover:shadow-premium-lg transition-shadow cursor-pointer"
                  >
                    <p className="text-sm font-semibold truncate">{job.client}</p>
                    <p className="text-xs text-muted-foreground mt-1">{job.staff}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">Due {job.dueDate}</span>
                      <span
                        className={cn(
                          "text-xs font-medium rounded-full px-2 py-0.5",
                          job.daysInStage > 7
                            ? "bg-destructive/10 text-destructive"
                            : job.daysInStage > 3
                            ? "bg-warning/10 text-warning"
                            : "bg-success/10 text-success"
                        )}
                      >
                        {job.daysInStage}d
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}

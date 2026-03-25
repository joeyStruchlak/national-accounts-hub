import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const teamData = [
  { name: "Sarah Mitchell", role: "Senior Accountant", completed: 28, utilisation: 92, capacity: "overloaded" },
  { name: "James Thompson", role: "Senior Accountant", completed: 24, utilisation: 85, capacity: "high" },
  { name: "Emma Lawrence", role: "Accountant", completed: 22, utilisation: 78, capacity: "optimal" },
  { name: "David Kim", role: "Accountant", completed: 18, utilisation: 65, capacity: "available" },
  { name: "Lisa Park", role: "Senior Accountant", completed: 26, utilisation: 88, capacity: "high" },
  { name: "Michael Roberts", role: "Junior Accountant", completed: 12, utilisation: 45, capacity: "underutilised" },
  { name: "Anna Wang", role: "Accountant", completed: 20, utilisation: 72, capacity: "optimal" },
  { name: "Tom Brown", role: "Junior Accountant", completed: 15, utilisation: 58, capacity: "available" },
  { name: "Jessica Lee", role: "Senior Accountant", completed: 25, utilisation: 87, capacity: "high" },
  { name: "Chris Martin", role: "Accountant", completed: 19, utilisation: 70, capacity: "optimal" },
  { name: "Rachel Green", role: "Junior Accountant", completed: 14, utilisation: 52, capacity: "available" },
  { name: "Daniel Torres", role: "Accountant", completed: 21, utilisation: 76, capacity: "optimal" },
  { name: "Sophie Chen", role: "Senior Accountant", completed: 27, utilisation: 90, capacity: "overloaded" },
  { name: "Mark Wilson", role: "Junior Accountant", completed: 11, utilisation: 42, capacity: "underutilised" },
  { name: "Kate Anderson", role: "Accountant", completed: 17, utilisation: 63, capacity: "available" },
  { name: "Ryan Davis", role: "Accountant", completed: 23, utilisation: 80, capacity: "optimal" },
];

function CapacityBar({ value }: { value: number }) {
  const color = value >= 85 ? "bg-destructive" : value >= 70 ? "bg-warning" : "bg-success";
  return (
    <div className="flex items-center gap-3 w-32">
      <div className="h-2.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const capacityLabel = (c: string) => {
  const map: Record<string, { label: string; class: string }> = {
    overloaded: { label: "Overloaded", class: "bg-destructive/10 text-destructive" },
    high: { label: "High", class: "bg-warning/10 text-warning" },
    optimal: { label: "Optimal", class: "bg-success/10 text-success" },
    available: { label: "Available", class: "bg-accent/10 text-accent" },
    underutilised: { label: "Underutilised", class: "bg-muted text-muted-foreground" },
  };
  const cfg = map[c] || map.available;
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", cfg.class)}>{cfg.label}</span>;
};

export default function Productivity() {
  const totalCompleted = teamData.reduce((a, b) => a + b.completed, 0);
  const avgUtil = Math.round(teamData.reduce((a, b) => a + b.utilisation, 0) / teamData.length);

  return (
    <AppLayout>
      <PageHeader title="Productivity Reports" subtitle="Weekly staff performance and capacity" onExport={() => {}} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-premium">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Jobs Completed</p>
            <p className="text-3xl font-bold text-accent mt-1">{totalCompleted}</p>
            <p className="text-xs text-muted-foreground mt-1">This week</p>
          </CardContent>
        </Card>
        <Card className="shadow-premium">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Utilisation</p>
            <p className="text-3xl font-bold text-accent mt-1">{avgUtil}%</p>
            <p className="text-xs text-muted-foreground mt-1">Target: 85%</p>
          </CardContent>
        </Card>
        <Card className="shadow-premium">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Team Size</p>
            <p className="text-3xl font-bold text-accent mt-1">16</p>
            <p className="text-xs text-muted-foreground mt-1">Active staff members</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card shadow-premium overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="gradient-navy hover:bg-navy-light">
              <TableHead className="text-accent-foreground font-semibold">Staff Member</TableHead>
              <TableHead className="text-accent-foreground font-semibold">Role</TableHead>
              <TableHead className="text-accent-foreground font-semibold">Jobs Completed</TableHead>
              <TableHead className="text-accent-foreground font-semibold">Utilisation</TableHead>
              <TableHead className="text-accent-foreground font-semibold">Capacity</TableHead>
              <TableHead className="text-accent-foreground font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamData.map((t) => (
              <TableRow key={t.name} className="hover:bg-muted/50">
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-muted-foreground">{t.role}</TableCell>
                <TableCell className="font-semibold">{t.completed}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <CapacityBar value={t.utilisation} />
                    <span className="text-sm font-medium">{t.utilisation}%</span>
                  </div>
                </TableCell>
                <TableCell><CapacityBar value={t.utilisation} /></TableCell>
                <TableCell>{capacityLabel(t.capacity)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}

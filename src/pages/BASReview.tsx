import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { AIStatusBadge } from "@/components/AIStatusBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye } from "lucide-react";

const staff = ["Sarah M.", "James T.", "Emma L.", "David K.", "Lisa P.", "Michael R.", "Anna W.", "Tom B."];
const statuses = ["Pending Review", "Flagged", "Cleared"] as const;
const aiStatuses = ["cleared", "review", "flagged"] as const;

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const basData = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  client: [
    "Meridian Property Group", "Coastal Builders Pty Ltd", "Sydney Tech Solutions", "Blue Ocean Imports",
    "Harbour View Dental", "Peak Performance Gym", "Murray River Wines", "Outback Mining Corp",
    "Pacific Coast Logistics", "Kangaroo Valley Farms", "Bondi Beach Cafe", "Great Barrier Reef Tours",
    "Melbourne Design Studio", "Adelaide Fresh Produce", "Brisbane Construction Co",
  ][i % 15],
  period: ["Q1 2025", "Q2 2025", "Q3 2025"][i % 3],
  status: randomItem(statuses),
  aiStatus: randomItem(aiStatuses),
  aiFlags: Math.floor(Math.random() * 8),
  staff: randomItem(staff),
}));

export default function BASReview() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = useMemo(
    () =>
      basData.filter((r) => {
        const matchSearch = r.client.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === "all" || r.status === filterStatus;
        return matchSearch && matchStatus;
      }),
    [search, filterStatus]
  );

  return (
    <AppLayout>
      <PageHeader
        title="BAS Review"
        subtitle="Business Activity Statement review and AI flagging"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search clients..."
        onExport={() => {}}
      >
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending Review">Pending Review</SelectItem>
            <SelectItem value="Flagged">Flagged</SelectItem>
            <SelectItem value="Cleared">Cleared</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <div className="rounded-lg border bg-card shadow-premium overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="gradient-navy hover:bg-navy-light">
              <TableHead className="text-accent-foreground font-semibold">Client</TableHead>
              <TableHead className="text-accent-foreground font-semibold">Period</TableHead>
              <TableHead className="text-accent-foreground font-semibold">Status</TableHead>
              <TableHead className="text-accent-foreground font-semibold">AI Flags</TableHead>
              <TableHead className="text-accent-foreground font-semibold">AI Review</TableHead>
              <TableHead className="text-accent-foreground font-semibold">Assigned</TableHead>
              <TableHead className="text-accent-foreground font-semibold text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{r.client}</TableCell>
                <TableCell className="text-muted-foreground">{r.period}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell>
                  {r.aiFlags > 0 ? (
                    <span className="text-sm font-semibold text-destructive">{r.aiFlags} issues</span>
                  ) : (
                    <span className="text-sm text-success">None</span>
                  )}
                </TableCell>
                <TableCell><AIStatusBadge status={r.aiStatus} /></TableCell>
                <TableCell className="text-muted-foreground">{r.staff}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-accent hover:text-accent-foreground hover:bg-accent">
                    <Eye className="h-4 w-4 mr-1" /> Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}

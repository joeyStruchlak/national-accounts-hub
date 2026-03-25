import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { AIStatusBadge } from "@/components/AIStatusBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const aiStatuses = ["cleared", "review", "flagged"] as const;
const statuses = ["Compliant", "Non-Compliant", "Outstanding"] as const;

const superData = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  client: [
    "Meridian Property Group", "Coastal Builders Pty Ltd", "Sydney Tech Solutions",
    "Blue Ocean Imports", "Harbour View Dental", "Peak Performance Gym",
    "Murray River Wines", "Outback Mining Corp", "Pacific Coast Logistics",
    "Kangaroo Valley Farms",
  ][i % 10],
  period: ["Q1 2025", "Q2 2025", "Q3 2025"][i % 3],
  sgaStatus: statuses[i % 3],
  aiStatus: aiStatuses[i % 3],
  employees: Math.floor(Math.random() * 80) + 5,
  reconciled: Math.floor(Math.random() * 50) + 10,
  outstanding: Math.floor(Math.random() * 8),
}));

export default function SuperRec() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => superData.filter((r) => r.client.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  return (
    <AppLayout>
      <PageHeader
        title="Super Reconciliation"
        subtitle="Superannuation guarantee and SGA compliance status"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search clients..."
        onExport={() => {}}
      />

      <div className="rounded-lg border bg-card shadow-premium overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="gradient-navy hover:bg-navy-light">
              <TableHead className="text-accent-foreground font-semibold">Client</TableHead>
              <TableHead className="text-accent-foreground font-semibold">Period</TableHead>
              <TableHead className="text-accent-foreground font-semibold">SGA Status</TableHead>
              <TableHead className="text-accent-foreground font-semibold">Employees</TableHead>
              <TableHead className="text-accent-foreground font-semibold">Reconciled</TableHead>
              <TableHead className="text-accent-foreground font-semibold">Outstanding</TableHead>
              <TableHead className="text-accent-foreground font-semibold">AI Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{r.client}</TableCell>
                <TableCell className="text-muted-foreground">{r.period}</TableCell>
                <TableCell><StatusBadge status={r.sgaStatus} /></TableCell>
                <TableCell>{r.employees}</TableCell>
                <TableCell className="font-semibold text-success">{r.reconciled}</TableCell>
                <TableCell className={r.outstanding > 0 ? "font-semibold text-warning" : "text-muted-foreground"}>{r.outstanding}</TableCell>
                <TableCell><AIStatusBadge status={r.aiStatus} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}

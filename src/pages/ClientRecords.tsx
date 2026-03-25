import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GradeBadge } from "@/components/GradeBadge";
import { AIStatusBadge } from "@/components/AIStatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const grades = ["Bronze", "Silver", "Gold", "Platinum"] as const;
const industries = ["Property", "Construction", "Technology", "Import/Export", "Healthcare", "Hospitality", "Agriculture", "Mining", "Logistics", "Retail"];
const staff = ["Sarah M.", "James T.", "Emma L.", "David K.", "Lisa P.", "Michael R.", "Anna W.", "Tom B."];
const aiStatuses = ["cleared", "review", "flagged"] as const;

const clientsData = Array.from({ length: 80 }, (_, i) => ({
  id: i + 1,
  name: [
    "Meridian Property Group", "Coastal Builders Pty Ltd", "Sydney Tech Solutions",
    "Blue Ocean Imports", "Harbour View Dental", "Peak Performance Gym",
    "Murray River Wines", "Outback Mining Corp", "Pacific Coast Logistics",
    "Kangaroo Valley Farms", "Bondi Beach Cafe", "Great Barrier Reef Tours",
    "Melbourne Design Studio", "Adelaide Fresh Produce", "Brisbane Construction Co",
    "Perth Engineering Works",
  ][i % 16],
  abn: `${10 + i} ${100 + i} ${200 + i} ${300 + i}`,
  grade: grades[i % 4],
  industry: industries[i % industries.length],
  assignedStaff: staff[i % staff.length],
  aiStatus: aiStatuses[i % 3],
  activeJobs: Math.floor(Math.random() * 8),
}));

export default function ClientRecords() {
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const filtered = useMemo(
    () =>
      clientsData.filter((c) => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
        const matchGrade = filterGrade === "all" || c.grade === filterGrade;
        return matchSearch && matchGrade;
      }),
    [search, filterGrade]
  );

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Client Records"
        subtitle="Manage 2,000+ client accounts"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search clients..."
        onExport={() => {}}
      >
        <Select value={filterGrade} onValueChange={setFilterGrade}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {grades.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border bg-accent/5 px-4 py-2.5">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Select>
            <SelectTrigger className="w-36 h-8">
              <SelectValue placeholder="Bulk Grade Update" />
            </SelectTrigger>
            <SelectContent>
              {grades.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="gradient-gold text-accent-foreground h-8">Apply</Button>
        </div>
      )}

      <div className="rounded-lg border bg-card shadow-premium overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="gradient-navy hover:bg-navy-light">
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onCheckedChange={toggleAll}
                  className="border-accent-foreground/40"
                />
              </TableHead>
              <TableHead className="text-accent-foreground font-semibold">Client Name</TableHead>
              <TableHead className="text-accent-foreground font-semibold">ABN</TableHead>
              <TableHead className="text-accent-foreground font-semibold">Grade</TableHead>
              <TableHead className="text-accent-foreground font-semibold">Industry</TableHead>
              <TableHead className="text-accent-foreground font-semibold">Assigned</TableHead>
              <TableHead className="text-accent-foreground font-semibold">Active Jobs</TableHead>
              <TableHead className="text-accent-foreground font-semibold">AI Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id} className="hover:bg-muted/50">
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(c.id)}
                    onCheckedChange={() => toggleSelect(c.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{c.abn}</TableCell>
                <TableCell><GradeBadge grade={c.grade} /></TableCell>
                <TableCell className="text-muted-foreground">{c.industry}</TableCell>
                <TableCell className="text-muted-foreground">{c.assignedStaff}</TableCell>
                <TableCell className="font-semibold">{c.activeJobs}</TableCell>
                <TableCell><AIStatusBadge status={c.aiStatus} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}

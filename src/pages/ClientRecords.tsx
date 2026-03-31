import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GradeBadge } from "@/components/GradeBadge";
import { AIStatusBadge } from "@/components/AIStatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Loader2, Users, Trophy, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const grades = ["bronze", "silver", "gold", "platinum"] as const;
type Grade = typeof grades[number];

type Client = {
  id: string;
  name: string;
  abn: string | null;
  grade: Grade;
  industry: string | null;
  state: string | null;
  annual_fees: number | null;
  jobs_this_year: number | null;
  last_contact: string | null;
  status: string;
  assigned_to: string | null;
};

export default function ClientRecords() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkGrade, setBulkGrade] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    console.group("👥 CLIENT RECORDS — Loading from Supabase")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("📡 Querying Supabase clients table (Sydney region)")
    console.log("   └─ In Option 2: 2000 real clients synced from XPM")
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error("❌ Failed to load clients:", error)
    } else {
      console.log(`✅ Loaded ${data?.length} clients from Supabase`)
      console.groupEnd()
      setClients(data || []);
    }
    setLoading(false);
  };

  const handleBulkGradeUpdate = async () => {
    if (!bulkGrade || selectedIds.size === 0) return;
    setUpdating(true);

    console.group("⚡ BULK GRADE UPDATE — Supabase")
    console.log(`📝 Updating ${selectedIds.size} clients to grade: ${bulkGrade}`)
    console.log("   └─ In Option 2: syncs back to XPM client records")

    const { error } = await supabase
      .from('clients')
      .update({ grade: bulkGrade as Grade })
      .in('id', Array.from(selectedIds));

    if (error) {
      console.error("❌ Bulk update failed:", error)
    } else {
      console.log(`✅ ${selectedIds.size} clients updated to ${bulkGrade}`)
      console.groupEnd()
      setSelectedIds(new Set());
      setBulkGrade("");
      fetchClients();
    }
    setUpdating(false);
  };

  const states = [...new Set(clients.map(c => c.state).filter(Boolean))].sort();

  const filtered = useMemo(() => clients.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.abn && c.abn.includes(search)) ||
      (c.assigned_to && c.assigned_to.toLowerCase().includes(search.toLowerCase()));
    const matchGrade = filterGrade === "all" || c.grade === filterGrade;
    const matchState = filterState === "all" || c.state === filterState;
    return matchSearch && matchGrade && matchState;
  }), [clients, search, filterGrade, filterState]);

  const gradeCounts = {
    platinum: clients.filter(c => c.grade === 'platinum').length,
    gold: clients.filter(c => c.grade === 'gold').length,
    silver: clients.filter(c => c.grade === 'silver').length,
    bronze: clients.filter(c => c.grade === 'bronze').length,
  };

  const totalFees = clients.reduce((sum, c) => sum + (c.annual_fees || 0), 0);

const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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

  const gradeLabel = (g: string) => g.charAt(0).toUpperCase() + g.slice(1);

  const gradeColor = (g: string) => {
    switch(g) {
      case 'platinum': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'gold': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'silver': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'bronze': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return '';
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Client Records"
        subtitle={`${clients.length} clients · $${(totalFees / 1000).toFixed(0)}K total annual fees`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search clients, ABN, staff..."
        onExport={() => {}}
      >
        <div className="flex items-center gap-2">
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {grades.map((g) => <SelectItem key={g} value={g}>{gradeLabel(g)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterState} onValueChange={setFilterState}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {states.map((s) => <SelectItem key={s!} value={s!}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchClients}>Refresh</Button>
        </div>
      </PageHeader>

      {/* Grade summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { grade: 'platinum', count: gradeCounts.platinum, icon: Trophy, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
          { grade: 'gold', count: gradeCounts.gold, icon: Trophy, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
          { grade: 'silver', count: gradeCounts.silver, icon: Users, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
          { grade: 'bronze', count: gradeCounts.bronze, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
        ].map((item) => (
          <Card
            key={item.grade}
            className={cn("p-4 border cursor-pointer hover:shadow-md transition-shadow", item.bg, filterGrade === item.grade && "ring-2 ring-accent")}
            onClick={() => setFilterGrade(filterGrade === item.grade ? 'all' : item.grade)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-2xl font-bold", item.color)}>{item.count}</p>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">{gradeLabel(item.grade)} clients</p>
              </div>
              <item.icon className={cn("h-6 w-6", item.color)} />
            </div>
          </Card>
        ))}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-accent shrink-0" />
          <span className="text-sm font-semibold text-primary">{selectedIds.size} clients selected</span>
          <Select value={bulkGrade} onValueChange={setBulkGrade}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="Set grade..." />
            </SelectTrigger>
            <SelectContent>
              {grades.map((g) => <SelectItem key={g} value={g}>{gradeLabel(g)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="gradient-amber text-primary font-semibold h-8"
            onClick={handleBulkGradeUpdate}
            disabled={!bulkGrade || updating}
          >
            {updating ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Updating...</> : "Apply Grade"}
          </Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
          <p className="text-xs text-muted-foreground ml-2">
            💡 In Option 2: bulk grade updates sync to XPM client records automatically
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card shadow-premium overflow-hidden">
          <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing <strong>{filtered.length}</strong> of <strong>{clients.length}</strong> clients
              {filterGrade !== 'all' && ` · Filtered by ${gradeLabel(filterGrade)}`}
            </p>
            <p className="text-xs text-accent font-medium">
              📌 Data source: Supabase DB (Sydney) · Option 2: live XPM sync
            </p>
          </div>
          <Table>
            <TableHeader>
<TableRow className="gradient-navy hover:bg-navy-light">
  <TableHead className="w-10">
    <Checkbox
      checked={selectedIds.size === filtered.length && filtered.length > 0}
      onCheckedChange={toggleAll}
      className="border-white/40"
    />
  </TableHead>
  <TableHead className="text-white font-semibold">Client Name</TableHead>
  <TableHead className="text-white font-semibold">ABN</TableHead>
  <TableHead className="text-white font-semibold">Grade</TableHead>
  <TableHead className="text-white font-semibold">Industry</TableHead>
  <TableHead className="text-white font-semibold">State</TableHead>
  <TableHead className="text-white font-semibold">Annual Fees</TableHead>
  <TableHead className="text-white font-semibold">Assigned To</TableHead>
  <TableHead className="text-white font-semibold">Last Contact</TableHead>
</TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className={cn("hover:bg-muted/50", selectedIds.has(c.id) && "bg-accent/5")}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(c.id)}
                      onCheckedChange={() => toggleSelect(c.id)}
                    />
                  </TableCell>
                  <TableCell className="font-semibold text-primary">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{c.abn || '—'}</TableCell>
                  <TableCell>
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", gradeColor(c.grade))}>
                      {gradeLabel(c.grade)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.industry || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.state || '—'}</TableCell>
                  <TableCell className="font-semibold text-sm">
                    {c.annual_fees ? `$${c.annual_fees.toLocaleString()}` : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.assigned_to || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.last_contact ? new Date(c.last_contact).toLocaleDateString('en-AU') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppLayout>
  );
}
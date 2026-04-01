import { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, CheckCircle2, Clock, Upload, FileText,
  Flag, X, Download, RefreshCw, UserMinus, Database, Info
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Lodgment {
  id: string;
  client_name: string;
  client_abn: string | null;
  job_type: string;
  xpm_status: string | null;
  ato_status: string | null;
  due_date: string | null;
  lodged_date: string | null;
  assigned_to: string | null;
  flagged_for_removal: boolean;
  removal_reason: string | null;
  source: string;
  created_at: string;
}

type FilterStatus = "all" | "outstanding" | "overdue" | "lodged" | "flagged";

// ── Seed data — realistic AU accounting firm lodgments ────────────────────────

// Outstanding due dates set to 30 Apr 2026 (Q4 BAS/ITR deadline) — genuinely future
// Overdue: real past dates that were missed — 3 clients
// Lodged: completed this period
const SEED_LODGMENTS = [
  // ── Outstanding (due 30 Apr 2026 — Q4 deadline) ──────────────────────────
  { client_name: "Meridian Property Group", client_abn: "51 234 567 890", job_type: "ITR - Company", xpm_status: "In Progress", ato_status: "Outstanding", due_date: "2026-04-30", lodged_date: null, assigned_to: "Sarah M.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  { client_name: "Peak Performance Gym", client_abn: "26 789 012 345", job_type: "ITR - Company", xpm_status: "In Progress", ato_status: "Outstanding", due_date: "2026-04-30", lodged_date: null, assigned_to: "Lisa P.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  { client_name: "Kangaroo Valley Farms", client_abn: "60 123 456 789", job_type: "ITR - Individual", xpm_status: "In Progress", ato_status: "Outstanding", due_date: "2026-04-30", lodged_date: null, assigned_to: "Sarah M.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  { client_name: "Great Barrier Reef Tours", client_abn: "82 345 678 901", job_type: "ITR - Company", xpm_status: "Awaiting Info", ato_status: "Outstanding", due_date: "2026-04-30", lodged_date: null, assigned_to: "James T.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  { client_name: "Brisbane Construction Co", client_abn: "25 678 901 234", job_type: "ITR - Company", xpm_status: "In Progress", ato_status: "Outstanding", due_date: "2026-04-30", lodged_date: null, assigned_to: "Sarah M.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  { client_name: "Canberra Legal Group", client_abn: "58 901 234 567", job_type: "ITR - Company", xpm_status: "In Progress", ato_status: "Outstanding", due_date: "2026-04-30", lodged_date: null, assigned_to: "Emma L.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  { client_name: "Sunshine Coast Bakery", client_abn: "70 123 456 789", job_type: "ITR - Individual", xpm_status: "Awaiting Info", ato_status: "Outstanding", due_date: "2026-04-28", lodged_date: null, assigned_to: "Sarah M.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  { client_name: "Bondi Beach Cafe", client_abn: "71 234 567 890", job_type: "BAS - Monthly", xpm_status: "In Progress", ato_status: "Outstanding", due_date: "2026-04-21", lodged_date: null, assigned_to: "Lisa P.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  // ── Overdue (genuinely past due — missed deadlines) ───────────────────────
  { client_name: "Sydney Tech Solutions", client_abn: "83 456 789 012", job_type: "ITR - Trust", xpm_status: "Draft", ato_status: "Overdue", due_date: "2025-10-31", lodged_date: null, assigned_to: "Emma L.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  { client_name: "Harbour View Dental", client_abn: "15 678 901 234", job_type: "BAS - Quarterly", xpm_status: "Awaiting Info", ato_status: "Overdue", due_date: "2025-11-28", lodged_date: null, assigned_to: "Sarah M.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  { client_name: "Adelaide Fresh Produce", client_abn: "14 567 890 123", job_type: "BAS - Quarterly", xpm_status: "Draft", ato_status: "Overdue", due_date: "2025-11-28", lodged_date: null, assigned_to: "David K.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  { client_name: "Outback Mining Corp", client_abn: "48 901 234 567", job_type: "ITR - Company", xpm_status: "Draft", ato_status: "Overdue", due_date: "2025-12-15", lodged_date: null, assigned_to: "Emma L.", flagged_for_removal: true, removal_reason: "Client non-responsive for 3+ months", source: "xpm" },
  { client_name: "Hobart Timber & Co", client_abn: "47 890 123 456", job_type: "ITR - Partnership", xpm_status: "Draft", ato_status: "Overdue", due_date: "2025-10-31", lodged_date: null, assigned_to: "James T.", flagged_for_removal: true, removal_reason: "Engagement terminated by client", source: "xpm" },
  // ── Lodged (completed this period) ───────────────────────────────────────
  { client_name: "Coastal Builders Pty Ltd", client_abn: "72 345 678 901", job_type: "BAS - Quarterly", xpm_status: "Completed", ato_status: "Lodged", due_date: "2026-02-28", lodged_date: "2026-02-24", assigned_to: "James T.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  { client_name: "Blue Ocean Imports", client_abn: "94 567 890 123", job_type: "ITR - Individual", xpm_status: "Completed", ato_status: "Lodged", due_date: "2025-10-31", lodged_date: "2025-10-28", assigned_to: "David K.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  { client_name: "Murray River Wines", client_abn: "37 890 123 456", job_type: "ITR - Partnership", xpm_status: "Completed", ato_status: "Lodged", due_date: "2026-02-28", lodged_date: "2026-02-20", assigned_to: "James T.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  { client_name: "Pacific Coast Logistics", client_abn: "59 012 345 678", job_type: "BAS - Quarterly", xpm_status: "Completed", ato_status: "Lodged", due_date: "2026-02-28", lodged_date: "2026-02-25", assigned_to: "David K.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  { client_name: "Melbourne Design Studio", client_abn: "93 456 789 012", job_type: "ITR - Trust", xpm_status: "Completed", ato_status: "Lodged", due_date: "2026-02-28", lodged_date: "2026-02-27", assigned_to: "Emma L.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  { client_name: "Darwin Sunset Hotels", client_abn: "36 789 012 345", job_type: "ITR - Company", xpm_status: "Completed", ato_status: "Lodged", due_date: "2025-10-31", lodged_date: "2025-10-15", assigned_to: "Lisa P.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
  { client_name: "Gold Coast Realty", client_abn: "69 012 345 678", job_type: "BAS - Quarterly", xpm_status: "Completed", ato_status: "Lodged", due_date: "2026-02-28", lodged_date: "2026-02-22", assigned_to: "David K.", flagged_for_removal: false, removal_reason: null, source: "xpm" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function isOverdue(due_date: string | null, lodged_date: string | null): boolean {
  if (lodged_date) return false;
  if (!due_date) return false;
  return new Date(due_date) < new Date();
}

function statusFromLodgment(l: Lodgment): "lodged" | "overdue" | "outstanding" {
  if (l.lodged_date) return "lodged";
  if (isOverdue(l.due_date, l.lodged_date)) return "overdue";
  return "outstanding";
}

function StatusBadge({ lodgment }: { lodgment: Lodgment }) {
  const status = statusFromLodgment(lodgment);
  if (status === "lodged") return (
    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200 gap-1">
      <CheckCircle2 className="h-3 w-3" /> Lodged
    </Badge>
  );
  if (status === "overdue") return (
    <Badge className="bg-red-500/15 text-red-600 border-red-200 gap-1">
      <AlertTriangle className="h-3 w-3" /> Overdue
    </Badge>
  );
  return (
    <Badge className="bg-amber-500/15 text-amber-600 border-amber-200 gap-1">
      <Clock className="h-3 w-3" /> Outstanding
    </Badge>
  );
}

// ── CSV Parser (Google Sheet export format) ───────────────────────────────────

function parseCsv(text: string): Partial<Lodgment>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ""; });
    return {
      client_name: obj.client_name || obj.client || obj.name || "",
      client_abn: obj.abn || obj.client_abn || null,
      job_type: obj.job_type || obj.type || obj.job || "ITR",
      xpm_status: obj.xpm_status || obj.status || null,
      ato_status: obj.ato_status || null,
      due_date: obj.due_date || obj.due || null,
      lodged_date: obj.lodged_date || obj.lodged || null,
      assigned_to: obj.assigned_to || obj.assigned || null,
      flagged_for_removal: obj.flagged === "true" || obj.flagged_for_removal === "true",
      removal_reason: obj.removal_reason || null,
      source: "csv_import",
    };
  }).filter((r) => r.client_name);
}

// ── Summary Stat Card ─────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, colour, icon: Icon, onClick, active,
}: {
  label: string; value: number; sub?: string;
  colour: "default" | "red" | "amber" | "emerald" | "navy";
  icon: React.ElementType; onClick?: () => void; active?: boolean;
}) {
  const colours = {
    default: "text-foreground border-border",
    red: "text-red-600 border-red-200",
    amber: "text-amber-600 border-amber-200",
    emerald: "text-emerald-600 border-emerald-200",
    navy: "text-[#2a3a5a] border-[#2a3a5a]/20",
  };
  return (
    <Card
      className={`shadow-sm cursor-pointer transition-all ${active ? "ring-2 ring-[#2a3a5a]" : "hover:shadow-md"}`}
      onClick={onClick}
    >
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <Icon className={`h-4 w-4 ${colours[colour].split(" ")[0]}`} />
        </div>
        <p className={`text-3xl font-bold ${colours[colour].split(" ")[0]}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LodgmentTracker() {
  const [lodgments, setLodgments] = useState<Lodgment[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [isDragging, setIsDragging] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lodgments")
      .select("*")
      .order("due_date", { ascending: true });
    setLodgments((data as Lodgment[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Seed if empty
  const handleSeed = async () => {
    setSeeding(true);
    const { error } = await supabase.from("lodgments").insert(SEED_LODGMENTS);
    if (!error) await load();
    setSeeding(false);
  };

  // Clear all and reseed — useful when old seed has wrong dates
  const handleClearAndReseed = async () => {
    if (!window.confirm("This will delete all current lodgment data and reload the demo dataset. Continue?")) return;
    setSeeding(true);
    await supabase.from("lodgments").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // delete all
    const { error } = await supabase.from("lodgments").insert(SEED_LODGMENTS);
    if (!error) await load();
    setSeeding(false);
  };

  // Flag / unflag for removal
  const toggleFlag = async (id: string, current: boolean) => {
    setFlaggingId(id);
    const reason = !current ? window.prompt("Reason for flagging this client for removal:") : null;
    if (!current && !reason) { setFlaggingId(null); return; }
    await supabase
      .from("lodgments")
      .update({ flagged_for_removal: !current, removal_reason: reason || null })
      .eq("id", id);
    await load();
    setFlaggingId(null);
  };

  // CSV / Google Sheet import
  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) { setImportMsg("No valid rows found in file."); return; }
    const { error } = await supabase.from("lodgments").insert(rows);
    if (error) { setImportMsg(`Import failed: ${error.message}`); return; }
    setImportMsg(`Imported ${rows.length} lodgment(s) successfully.`);
    await load();
  }, [load]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // Derived stats
  const total = lodgments.length;
  const outstanding = lodgments.filter((l) => statusFromLodgment(l) === "outstanding").length;
  const overdue = lodgments.filter((l) => statusFromLodgment(l) === "overdue").length;
  const lodged = lodgments.filter((l) => statusFromLodgment(l) === "lodged").length;
  const flagged = lodgments.filter((l) => l.flagged_for_removal).length;

  // Job types and assignees for filters
  const jobTypes = [...new Set(lodgments.map((l) => l.job_type).filter(Boolean))];
  const assignees = [...new Set(lodgments.map((l) => l.assigned_to).filter(Boolean))];

  // Filtered list
  const filtered = lodgments.filter((l) => {
    const status = statusFromLodgment(l);
    const matchFilter =
      filter === "all" ||
      (filter === "outstanding" && status === "outstanding") ||
      (filter === "overdue" && status === "overdue") ||
      (filter === "lodged" && status === "lodged") ||
      (filter === "flagged" && l.flagged_for_removal);
    const matchSearch =
      !search ||
      l.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (l.client_abn || "").includes(search) ||
      (l.assigned_to || "").toLowerCase().includes(search.toLowerCase());
    const matchJob = jobTypeFilter === "all" || l.job_type === jobTypeFilter;
    const matchAssignee = assigneeFilter === "all" || l.assigned_to === assigneeFilter;
    return matchFilter && matchSearch && matchJob && matchAssignee;
  });

  return (
    <AppLayout>
      <PageHeader
        title="Lodgment Tracker"
        subtitle="Total client lodgments, outstanding, overdue and removal flags — source of truth for daily workflow"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search clients, ABN, assignee..."
        onExport={() => {}}
      >
        <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All job types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All job types</SelectItem>
            {jobTypes.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All staff</SelectItem>
            {assignees.map((a) => <SelectItem key={a!} value={a!}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
        {lodgments.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAndReseed}
            disabled={seeding}
            className="gap-1.5 text-muted-foreground hover:text-red-600 hover:border-red-200"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reseed
          </Button>
        )}
      </PageHeader>

      {/* Summary stat cards — Jon's "three column summary" */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Lodgments" value={total} sub="All active clients" colour="navy" icon={FileText}
          onClick={() => setFilter("all")} active={filter === "all"} />
        <StatCard label="Outstanding" value={outstanding} sub="Not yet lodged" colour="amber" icon={Clock}
          onClick={() => setFilter("outstanding")} active={filter === "outstanding"} />
        <StatCard label="Overdue" value={overdue} sub="Past due date" colour="red" icon={AlertTriangle}
          onClick={() => setFilter("overdue")} active={filter === "overdue"} />
        <StatCard label="Lodged" value={lodged} sub="Completed this period" colour="emerald" icon={CheckCircle2}
          onClick={() => setFilter("lodged")} active={filter === "lodged"} />
        <StatCard label="Flagged for Removal" value={flagged} sub="Action required" colour="red" icon={UserMinus}
          onClick={() => setFilter("flagged")} active={filter === "flagged"} />
      </div>

      {/* Data source banner */}
      {(() => {
        const xpmCount = lodgments.filter(l => l.source === 'xpm').length
        const csvCount = lodgments.filter(l => l.source === 'csv_import').length
        const atoCount = lodgments.filter(l => l.source === 'ato_pdf').length
        const parts = []
        if (xpmCount > 0) parts.push(`${xpmCount} XPM records`)
        if (csvCount > 0) parts.push(`${csvCount} imported from CSV`)
        if (atoCount > 0) parts.push(`${atoCount} from ATO PDF`)
        const summary = parts.length > 0 ? parts.join(' · ') : 'No data loaded'
        return (
          <div className="mb-4 rounded-lg border border-[#2a3a5a]/20 bg-[#2a3a5a]/5 px-4 py-3 flex items-center gap-3">
            <Database className="h-4 w-4 text-[#2a3a5a] shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-[#2a3a5a]">Data Source: </span>
              <span className="text-xs text-muted-foreground">{summary}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Info className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                Source of truth: ATO Tax Agent Portal → export CSV → import below. XPM API connects when available.
              </span>
            </div>
          </div>
        )
      })()}

      {/* CSV / Google Sheet import */}
      <div className="mb-6 rounded-lg border bg-card overflow-hidden">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`p-5 transition-colors border-b border-dashed ${
            isDragging ? "bg-[#89ead3]/5 border-[#89ead3]" : "border-border"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-muted-foreground/50 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Import from Google Sheet / ATO Lodgment Report</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Export your Google Sheet as CSV and drag it here. Jon's current workflow → replace with this import.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {importMsg && (
                <span className={`text-xs font-medium ${importMsg.includes("failed") ? "text-red-600" : "text-emerald-600"}`}>
                  {importMsg}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Browse CSV
              </Button>
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          </div>
        </div>
        {/* CSV column guide */}
        <div className="px-5 py-3 bg-muted/30">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Expected CSV columns (match your Google Sheet headers)</p>
          <div className="flex flex-wrap gap-2">
            {["client_name", "abn", "job_type", "due_date", "lodged_date", "assigned_to", "xpm_status", "ato_status", "flagged"].map(col => (
              <code key={col} className="text-[10px] bg-white border rounded px-1.5 py-0.5 text-muted-foreground">{col}</code>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">Only <code className="bg-white border rounded px-1 py-0.5">client_name</code> is required. All other columns are optional.</p>
        </div>
      </div>

      {/* Empty state — seed button */}
      {!loading && lodgments.length === 0 && (
        <div className="rounded-lg border bg-card p-12 text-center mb-6">
          <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No lodgments yet</p>
          <p className="text-xs text-muted-foreground mb-4">Seed with realistic demo data or import from CSV</p>
          <Button onClick={handleSeed} disabled={seeding} className="bg-[#2a3a5a] text-white">
            {seeding ? "Seeding..." : "Load Demo Data"}
          </Button>
        </div>
      )}

      {/* Main table */}
      {!loading && lodgments.length > 0 && (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing <strong>{filtered.length}</strong> of <strong>{total}</strong> lodgments
              {filter !== "all" && (
                <button onClick={() => setFilter("all")} className="ml-2 text-[#2a3a5a] underline underline-offset-2">
                  Clear filter
                </button>
              )}
            </p>
            {overdue > 0 && (
              <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> {overdue} overdue — action required
              </span>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#2a3a5a] hover:bg-[#2a3a5a]">
                <TableHead className="text-white font-semibold">Client</TableHead>
                <TableHead className="text-white font-semibold">ABN</TableHead>
                <TableHead className="text-white font-semibold">Job Type</TableHead>
                <TableHead className="text-white font-semibold">Assigned</TableHead>
                <TableHead className="text-white font-semibold">Due Date</TableHead>
                <TableHead className="text-white font-semibold">Lodged</TableHead>
                <TableHead className="text-white font-semibold">XPM Status</TableHead>
                <TableHead className="text-white font-semibold">Status</TableHead>
                <TableHead className="text-white font-semibold">Removal</TableHead>
                <TableHead className="text-white font-semibold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow
                  key={l.id}
                  className={
                    l.flagged_for_removal
                      ? "bg-red-50/40 hover:bg-red-50"
                      : statusFromLodgment(l) === "overdue"
                      ? "bg-amber-50/30 hover:bg-amber-50/50"
                      : "hover:bg-muted/50"
                  }
                >
                  <TableCell className="font-semibold text-sm">{l.client_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{l.client_abn || "—"}</TableCell>
                  <TableCell className="text-sm">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{l.job_type}</code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.assigned_to || "—"}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {l.due_date
                      ? <span className={isOverdue(l.due_date, l.lodged_date) ? "text-red-600 font-semibold" : ""}>
                          {new Date(l.due_date).toLocaleDateString("en-AU")}
                        </span>
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-emerald-600 whitespace-nowrap">
                    {l.lodged_date ? new Date(l.lodged_date).toLocaleDateString("en-AU") : "—"}
                  </TableCell>
                  <TableCell>
                    {l.xpm_status ? (
                      <span className="text-xs text-muted-foreground">{l.xpm_status}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell><StatusBadge lodgment={l} /></TableCell>
                  <TableCell>
                    {l.flagged_for_removal ? (
                      <div className="flex flex-col gap-0.5">
                        <Badge className="bg-red-500/15 text-red-600 border-red-200 gap-1 text-xs w-fit">
                          <Flag className="h-2.5 w-2.5" /> Flagged
                        </Badge>
                        {l.removal_reason && (
                          <span className="text-[10px] text-muted-foreground max-w-[140px] truncate">{l.removal_reason}</span>
                        )}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={flaggingId === l.id}
                      onClick={() => toggleFlag(l.id, l.flagged_for_removal)}
                      className={l.flagged_for_removal
                        ? "text-muted-foreground hover:text-foreground text-xs gap-1"
                        : "text-red-500 hover:text-red-700 hover:bg-red-50 text-xs gap-1"}
                    >
                      {l.flagged_for_removal
                        ? <><X className="h-3 w-3" /> Unflag</>
                        : <><Flag className="h-3 w-3" /> Flag Removal</>}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No lodgments match current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </AppLayout>
  );
}
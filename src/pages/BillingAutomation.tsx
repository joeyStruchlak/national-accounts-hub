import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell, CheckCircle2, Clock, Play, RefreshCw,
  FileText, Users, Zap, AlertTriangle, ToggleLeft,
  Mail, Database, Send
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BillingNotification {
  id: string;
  client_name: string;
  job_type: string;
  preparer: string;
  billing_type: "retainer" | "completion";
  notified_at: string | null;
  notification_channel: string | null;
  invoiced: boolean;
  invoiced_at: string | null;
  xpm_job_id: string | null;
  created_at: string;
}

interface RunResult {
  success: boolean;
  notified: number;
  message: string;
  notifications: {
    id: string;
    client_name: string;
    job_type: string;
    preparer: string;
    message: string;
    notified_at: string;
    emailSent?: boolean;
    emailError?: string;
  }[];
}

// ── Seed data — realistic billing pipeline ────────────────────────────────────

const SEED_NOTIFICATIONS: Omit<BillingNotification, "id" | "created_at">[] = [
  // Completion billing — awaiting invoice
  { client_name: "Sydney Tech Solutions", job_type: "ITR - Trust", preparer: "Emma L.", billing_type: "completion", notified_at: "2026-03-28T09:15:00Z", notification_channel: "billing", invoiced: false, invoiced_at: null, xpm_job_id: "JOB-1042" },
  { client_name: "Outback Mining Corp", job_type: "ITR - Company", preparer: "Emma L.", billing_type: "completion", notified_at: "2026-03-25T14:30:00Z", notification_channel: "billing", invoiced: false, invoiced_at: null, xpm_job_id: "JOB-1038" },
  { client_name: "Adelaide Fresh Produce", job_type: "BAS - Quarterly", preparer: "David K.", billing_type: "completion", notified_at: "2026-03-20T10:00:00Z", notification_channel: "billing", invoiced: false, invoiced_at: null, xpm_job_id: "JOB-1031" },
  // Completion billing — invoiced
  { client_name: "Blue Ocean Imports", job_type: "ITR - Individual", preparer: "David K.", billing_type: "completion", notified_at: "2026-03-10T09:00:00Z", notification_channel: "billing", invoiced: true, invoiced_at: "2026-03-11T11:00:00Z", xpm_job_id: "JOB-1020" },
  { client_name: "Murray River Wines", job_type: "ITR - Partnership", preparer: "James T.", billing_type: "completion", notified_at: "2026-02-28T09:00:00Z", notification_channel: "billing", invoiced: true, invoiced_at: "2026-02-28T14:30:00Z", xpm_job_id: "JOB-1015" },
  { client_name: "Melbourne Design Studio", job_type: "ITR - Trust", preparer: "Emma L.", billing_type: "completion", notified_at: "2026-02-27T09:00:00Z", notification_channel: "billing", invoiced: true, invoiced_at: "2026-03-01T10:00:00Z", xpm_job_id: "JOB-1012" },
  { client_name: "Darwin Sunset Hotels", job_type: "ITR - Company", preparer: "Lisa P.", billing_type: "completion", notified_at: "2025-10-20T09:00:00Z", notification_channel: "billing", invoiced: true, invoiced_at: "2025-10-21T09:30:00Z", xpm_job_id: "JOB-0981" },
  // Retainer clients — no billing trigger needed
  { client_name: "Coastal Builders Pty Ltd", job_type: "BAS - Quarterly", preparer: "James T.", billing_type: "retainer", notified_at: null, notification_channel: null, invoiced: false, invoiced_at: null, xpm_job_id: "JOB-1040" },
  { client_name: "Pacific Coast Logistics", job_type: "BAS - Quarterly", preparer: "David K.", billing_type: "retainer", notified_at: null, notification_channel: null, invoiced: false, invoiced_at: null, xpm_job_id: "JOB-1035" },
  { client_name: "Bondi Beach Cafe", job_type: "BAS - Monthly", preparer: "Lisa P.", billing_type: "retainer", notified_at: null, notification_channel: null, invoiced: false, invoiced_at: null, xpm_job_id: "JOB-1030" },
  { client_name: "Gold Coast Realty", job_type: "BAS - Quarterly", preparer: "David K.", billing_type: "retainer", notified_at: null, notification_channel: null, invoiced: false, invoiced_at: null, xpm_job_id: "JOB-1022" },
]

// ── Summary card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, colour, icon: Icon }: {
  label: string; value: number | string; sub?: string;
  colour: "navy" | "amber" | "emerald" | "muted";
  icon: React.ElementType;
}) {
  const c = { navy: "text-[#2a3a5a]", amber: "text-amber-600", emerald: "text-emerald-600", muted: "text-muted-foreground" }
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <Icon className={`h-4 w-4 ${c[colour]}`} />
        </div>
        <p className={`text-2xl font-bold ${c[colour]}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BillingAutomation() {
  const [notifications, setNotifications] = useState<BillingNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("billing_notifications")
      .select("*")
      .order("created_at", { ascending: false });
    setNotifications((data as BillingNotification[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    setSeeding(true);
    await supabase.from("billing_notifications").insert(SEED_NOTIFICATIONS);
    await load();
    setSeeding(false);
  };

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setRunResult(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-notification`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Run failed");
      setRunResult(data);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  const markInvoiced = async (id: string) => {
    await supabase
      .from("billing_notifications")
      .update({ invoiced: true, invoiced_at: new Date().toISOString() })
      .eq("id", id);
    await load();
  };

  // Derived
  const completion = notifications.filter(n => n.billing_type === "completion");
  const retainer = notifications.filter(n => n.billing_type === "retainer");
  const pendingInvoice = completion.filter(n => n.notified_at && !n.invoiced);
  const invoiced = completion.filter(n => n.invoiced);

  const filtered = notifications.filter(n =>
    !search ||
    n.client_name.toLowerCase().includes(search.toLowerCase()) ||
    n.preparer.toLowerCase().includes(search.toLowerCase()) ||
    n.job_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <PageHeader
        title="Billing Automation"
        subtitle="Invoice notifications for completion-billed ITRs. Retainer clients are excluded automatically."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search clients, preparer..."
        onExport={() => {}}
      >
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
        <Button
          onClick={handleRun}
          disabled={running}
          className="bg-[#2a3a5a] hover:bg-[#1e2d47] text-white gap-2"
        >
          <Play className="h-4 w-4" />
          {running ? "Scanning..." : "Scan & Notify"}
        </Button>
      </PageHeader>

      {/* Data source banner */}
      <div className="mb-4 rounded-lg border border-[#2a3a5a]/20 bg-[#2a3a5a]/5 px-4 py-3 flex items-center gap-3">
        <Database className="h-4 w-4 text-[#2a3a5a] shrink-0" />
        <div className="flex-1 text-xs text-muted-foreground">
          <span className="font-semibold text-[#2a3a5a]">Data Source: </span>
          Scanning Supabase jobs table (seeded demo data). XPM webhook replaces this scan automatically when Mike's API is confirmed.
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Notifications → josefpro21@gmail.com (Resend sandbox — testing)</span>
        </div>
      </div>

      {/* How it works banner */}
      <div className="mb-6 rounded-lg border border-[#2a3a5a]/20 bg-[#2a3a5a]/5 px-5 py-4">
        <div className="flex items-start gap-4">
          <Zap className="h-5 w-5 text-[#2a3a5a] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#2a3a5a] mb-1">How billing automation works</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              {[
                { step: "1", text: "XPM webhook fires when ITR status moves to Sent (pending Mike's API). Scan & Notify button is the manual trigger in the interim." },
                { step: "2", text: "System checks billing type — completion clients only. Retainer clients skipped automatically." },
                { step: "3", text: "Email sent to billing@nationalaccounts.com.au tagging preparer. Audit log saved. Mark as invoiced when done." },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#89ead3]/30 text-[#2a3a5a] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{s.step}</span>
                  <p className="text-xs text-muted-foreground">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Run result */}
      {runResult && (
        <div className={`mb-6 rounded-lg border p-4 ${runResult.notified > 0 ? "border-[#89ead3]/40 bg-[#89ead3]/5" : "border-muted bg-muted/30"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Bell className={`h-4 w-4 ${runResult.notified > 0 ? "text-[#2a3a5a]" : "text-muted-foreground"}`} />
            <p className="text-sm font-semibold">{runResult.message}</p>
          </div>
          {runResult.notifications.map((n, i) => (
            <div key={i} className="mt-3 rounded-lg border bg-white p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-[#2a3a5a]/10 text-[#2a3a5a] border-[#2a3a5a]/20 text-xs">{n.client_name}</Badge>
                <Badge variant="outline" className="text-xs">{n.job_type}</Badge>
                <div className="flex items-center gap-1.5 ml-auto">
                  {n.emailSent ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200 gap-1 text-xs">
                      <Send className="h-3 w-3" /> Sent to josefpro21@gmail.com
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/15 text-amber-600 border-amber-200 gap-1 text-xs">
                      <Mail className="h-3 w-3" /> Saved — email pending Resend setup
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{new Date(n.notified_at).toLocaleString("en-AU")}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-line font-mono bg-muted/40 rounded p-2">{n.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="inline h-4 w-4 mr-2" />{error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending Invoice" value={pendingInvoice.length} sub="Notified, not yet invoiced" colour="amber" icon={Clock} />
        <StatCard label="Invoiced" value={invoiced.length} sub="Completion billing done" colour="emerald" icon={CheckCircle2} />
        <StatCard label="Completion Clients" value={completion.length} sub="Invoice on completion" colour="navy" icon={FileText} />
        <StatCard label="Retainer Clients" value={retainer.length} sub="Monthly billing — auto-excluded" colour="muted" icon={Users} />
      </div>

      {/* Empty state */}
      {!loading && notifications.length === 0 && (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No billing notifications yet</p>
          <p className="text-xs text-muted-foreground mb-4">Load demo data or run a scan to check for Sent ITRs</p>
          <Button onClick={handleSeed} disabled={seeding} className="bg-[#2a3a5a] text-white">
            {seeding ? "Loading..." : "Load Demo Data"}
          </Button>
        </div>
      )}

      {/* Tabs */}
      {!loading && notifications.length > 0 && (
        <Tabs defaultValue="pending">
          <TabsList className="bg-muted/50 mb-4">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending Invoice
              {pendingInvoice.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0">{pendingInvoice.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Notification History
            </TabsTrigger>
            <TabsTrigger value="retainer" className="gap-2">
              <ToggleLeft className="h-4 w-4" />
              Retainer Clients
              <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0">{retainer.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Pending Invoice tab */}
          <TabsContent value="pending">
            {pendingInvoice.length === 0 ? (
              <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground text-sm">
                All completion-billed clients have been invoiced. ✓
              </div>
            ) : (
              <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#2a3a5a] hover:bg-[#2a3a5a]">
                      <TableHead className="text-white font-semibold">Client</TableHead>
                      <TableHead className="text-white font-semibold">Job Type</TableHead>
                      <TableHead className="text-white font-semibold">Preparer</TableHead>
                      <TableHead className="text-white font-semibold">Notified</TableHead>
                      <TableHead className="text-white font-semibold">Billing</TableHead>
                      <TableHead className="text-white font-semibold">XPM Job</TableHead>
                      <TableHead className="text-white font-semibold text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvoice
                      .filter(n => !search || n.client_name.toLowerCase().includes(search.toLowerCase()) || n.preparer.toLowerCase().includes(search.toLowerCase()))
                      .map(n => (
                        <TableRow key={n.id} className="bg-amber-50/30 hover:bg-amber-50/50">
                          <TableCell className="font-semibold text-sm">{n.client_name}</TableCell>
                          <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{n.job_type}</code></TableCell>
                          <TableCell className="text-sm text-muted-foreground">@{n.preparer}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {n.notified_at ? new Date(n.notified_at).toLocaleDateString("en-AU") : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-amber-500/15 text-amber-600 border-amber-200 text-xs">Completion</Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{n.xpm_job_id || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markInvoiced(n.id)}
                              className="text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Mark Invoiced
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* History tab */}
          <TabsContent value="history">
            <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#2a3a5a] hover:bg-[#2a3a5a]">
                    <TableHead className="text-white font-semibold">Client</TableHead>
                    <TableHead className="text-white font-semibold">Job Type</TableHead>
                    <TableHead className="text-white font-semibold">Preparer</TableHead>
                    <TableHead className="text-white font-semibold">Billing Type</TableHead>
                    <TableHead className="text-white font-semibold">Notified</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-white font-semibold">Invoiced</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.filter(n => n.notified_at).map(n => (
                    <TableRow key={n.id} className="hover:bg-muted/50">
                      <TableCell className="font-semibold text-sm">{n.client_name}</TableCell>
                      <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{n.job_type}</code></TableCell>
                      <TableCell className="text-sm text-muted-foreground">@{n.preparer}</TableCell>
                      <TableCell>
                        {n.billing_type === "completion" ? (
                          <Badge className="bg-amber-500/15 text-amber-600 border-amber-200 text-xs">Completion</Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground border text-xs">Retainer</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {n.notified_at ? new Date(n.notified_at).toLocaleDateString("en-AU") : "—"}
                      </TableCell>
                      <TableCell>
                        {n.invoiced ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200 gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" /> Invoiced
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-600 border-amber-200 gap-1 text-xs">
                            <Clock className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {n.invoiced_at ? new Date(n.invoiced_at).toLocaleDateString("en-AU") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.filter(n => n.notified_at).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No notifications sent yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Retainer tab */}
          <TabsContent value="retainer">
            <div className="rounded-lg border border-muted bg-muted/20 p-4 mb-4 flex items-start gap-3">
              <ToggleLeft className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Retainer clients are on monthly billing and are <strong>automatically excluded</strong> from billing notifications.
                Jon noted: <em>"Our new clients are mainly on retainer monthly engagements so this tool should be redundant in the near future."</em>
              </p>
            </div>
            <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#2a3a5a] hover:bg-[#2a3a5a]">
                    <TableHead className="text-white font-semibold">Client</TableHead>
                    <TableHead className="text-white font-semibold">Job Type</TableHead>
                    <TableHead className="text-white font-semibold">Preparer</TableHead>
                    <TableHead className="text-white font-semibold">XPM Job</TableHead>
                    <TableHead className="text-white font-semibold">Billing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retainer.map(n => (
                    <TableRow key={n.id} className="hover:bg-muted/50 opacity-75">
                      <TableCell className="font-semibold text-sm">{n.client_name}</TableCell>
                      <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{n.job_type}</code></TableCell>
                      <TableCell className="text-sm text-muted-foreground">@{n.preparer}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{n.xpm_job_id || "—"}</TableCell>
                      <TableCell>
                        <Badge className="bg-muted text-muted-foreground border text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Retainer — no action needed
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
}
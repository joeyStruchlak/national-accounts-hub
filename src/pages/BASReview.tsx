import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, HelpCircle, Play, Building2, FileSearch } from "lucide-react";
import { supabase } from "@/lib/supabase";


// Parse Xero /Date(ms+offset)/ format
function parseXeroDate(xeroDate: string): string {
  if (!xeroDate) return '—'
  const match = xeroDate.match(/\/Date\((\d+)[+-]\d+\)\//)
  if (match) {
    return new Date(parseInt(match[1])).toLocaleDateString('en-AU')
  }
  // Try standard date string
  const d = new Date(xeroDate)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-AU')
}

// ── Types ────────────────────────────────────────────────────────────────────

interface BasPeriod {
  id: string;
  period_label: string;
  period_end: string;
  financial_year: string;
}

interface BankAccountResult {
  accountId: string;
  accountName: string;
  accountCode: string;
  currencyCode: string;
  isReconciled: boolean;
  unreconciledItems: number;
  recommendation: string;
}

interface CdrTransaction {
  transactionId: string;
  date: string;
  contact: string;
  description: string;
  amount: number;
  taxType: string;
  accountCode: string;
  accountName: string;
  confidence: "CONFIRMED" | "REVIEW" | "UNCERTAIN";
  confidenceReason: string;
  flagged: boolean;
}

interface BasReviewResult {
  success: boolean;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  bankAccounts: BankAccountResult[];
  cdrTransactions: CdrTransaction[];
  flaggedItems: CdrTransaction[];
  summary: {
    totalReviewed: number;
    confirmed: number;
    review: number;
    uncertain: number;
    unreconciledBankAccounts: number;
  };
  aiAnalysis: string;
}

// ── Confidence Badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: "CONFIRMED" | "REVIEW" | "UNCERTAIN" }) {
  if (confidence === "CONFIRMED") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200 gap-1 font-medium">
        <CheckCircle2 className="h-3 w-3" /> CONFIRMED
      </Badge>
    );
  }
  if (confidence === "REVIEW") {
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border-amber-200 gap-1 font-medium">
        <AlertTriangle className="h-3 w-3" /> REVIEW
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/15 text-red-600 border-red-200 gap-1 font-medium">
      <HelpCircle className="h-3 w-3" /> UNCERTAIN
    </Badge>
  );
}

// ── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  variant,
}: {
  label: string;
  value: number | string;
  sub?: string;
  variant: "default" | "warn" | "danger" | "success";
}) {
  const colours = {
    default: "text-foreground",
    warn: "text-amber-600",
    danger: "text-red-600",
    success: "text-emerald-600",
  };
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-2xl font-bold ${colours[variant]}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function BASReview() {
  const [periods, setPeriods] = useState<BasPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BasReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Load periods
  useEffect(() => {
    supabase
      .from("bas_periods")
      .select("*")
      .order("period_end", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setPeriods(data);
          // Default to most recent period
          if (data.length > 0) setSelectedPeriodId(data[0].id);
        }
      });
  }, []);

  const handleRun = async () => {
    if (!selectedPeriodId) return;
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bas-review`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ bas_period_id: selectedPeriodId }),
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "BAS review failed");
      setResult(data as BasReviewResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  const filteredCdr = result
    ? result.cdrTransactions.filter(
        (t) =>
          t.contact.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  return (
    <AppLayout>
      <PageHeader
        title="BAS Review"
        subtitle="Bank reconciliation check and CDR transaction review per BAS period"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search transactions..."
        onExport={() => {}}
      >
        {/* Period selector */}
        <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Select BAS period..." />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.period_label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleRun}
          disabled={running || !selectedPeriodId}
          className="bg-[#2a3a5a] hover:bg-[#1e2d47] text-white gap-2"
        >
          <Play className="h-4 w-4" />
          {running ? "Running..." : "Run BAS Review"}
        </Button>
      </PageHeader>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="inline h-4 w-4 mr-2" />
          {error}
        </div>
      )}

      {/* Running state */}
      {running && (
        <div className="mb-6 rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <div className="animate-pulse text-sm">
            Connecting to Xero · Checking bank accounts · Reviewing CDR transactions...
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Period banner */}
          <div className="rounded-lg border bg-[#2a3a5a] px-5 py-3 text-white text-sm flex items-center gap-3">
            <FileSearch className="h-4 w-4 text-[#89ead3]" />
            <span>
              <strong>{result.periodLabel}</strong> — {result.periodStart} to {result.periodEnd}
            </span>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SummaryCard
              label="Transactions Reviewed"
              value={result.summary.totalReviewed}
              variant="default"
            />
            <SummaryCard
              label="Confirmed"
              value={result.summary.confirmed}
              sub="GST coding correct"
              variant="success"
            />
            <SummaryCard
              label="Needs Review"
              value={result.summary.review}
              sub="Preparer to check"
              variant="warn"
            />
            <SummaryCard
              label="Uncertain"
              value={result.summary.uncertain}
              sub="Human review required"
              variant="danger"
            />
            <SummaryCard
              label="Bank Accounts"
              value={
                result.summary.unreconciledBankAccounts === 0
                  ? "All Reconciled"
                  : `${result.summary.unreconciledBankAccounts} Unreconciled`
              }
              variant={result.summary.unreconciledBankAccounts === 0 ? "success" : "danger"}
            />
          </div>

          {/* AI analysis */}
          {result.aiAnalysis && (
            <Card className="border-[#89ead3]/40 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-[#2a3a5a] flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#89ead3]" />
                  AI Analysis — {result.periodLabel}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {result.aiAnalysis.replace(/\*\*(.*?)\*\*/g, "$1")}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tabs: Bank Rec | CDR Review */}
          <Tabs defaultValue="bank">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="bank" className="gap-2">
                <Building2 className="h-4 w-4" />
                Bank Reconciliation
                {result.summary.unreconciledBankAccounts > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0">
                    {result.summary.unreconciledBankAccounts}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="cdr" className="gap-2">
                <FileSearch className="h-4 w-4" />
                CDR Transaction Review
                {result.summary.uncertain + result.summary.review > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0">
                    {result.summary.uncertain + result.summary.review}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Bank Rec tab */}
            <TabsContent value="bank" className="mt-4">
              <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#2a3a5a] hover:bg-[#2a3a5a]">
                      <TableHead className="text-white font-semibold">Account</TableHead>
                      <TableHead className="text-white font-semibold">Code</TableHead>
                      <TableHead className="text-white font-semibold">Currency</TableHead>
                      <TableHead className="text-white font-semibold">Status</TableHead>
                      <TableHead className="text-white font-semibold">Unreconciled Items</TableHead>
                      <TableHead className="text-white font-semibold">Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.bankAccounts.map((acc) => (
                      <TableRow key={acc.accountId} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{acc.accountName}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{acc.accountCode}</TableCell>
                        <TableCell className="text-muted-foreground">{acc.currencyCode}</TableCell>
                        <TableCell>
                          {acc.isReconciled ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Reconciled
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/15 text-red-600 border-red-200 gap-1">
                              <AlertTriangle className="h-3 w-3" /> Not Reconciled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {acc.unreconciledItems === -1 ? (
                            <span className="text-xs text-muted-foreground">Unable to check</span>
                          ) : acc.unreconciledItems === 0 ? (
                            <span className="text-xs text-emerald-600">None</span>
                          ) : (
                            <span className="text-sm font-semibold text-red-600">{acc.unreconciledItems}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs">
                          {acc.recommendation}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* CDR tab */}
            <TabsContent value="cdr" className="mt-4">
              <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#2a3a5a] hover:bg-[#2a3a5a]">
                      <TableHead className="text-white font-semibold">Date</TableHead>
                      <TableHead className="text-white font-semibold">Contact</TableHead>
                      <TableHead className="text-white font-semibold">Description</TableHead>
                      <TableHead className="text-white font-semibold text-right">Amount</TableHead>
                      <TableHead className="text-white font-semibold">Tax Type</TableHead>
                      <TableHead className="text-white font-semibold">Account</TableHead>
                      <TableHead className="text-white font-semibold">Confidence</TableHead>
                      <TableHead className="text-white font-semibold">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCdr.map((tx, idx) => (
                      <TableRow
                        key={`${tx.transactionId}-${idx}`}
                        className={tx.flagged ? "bg-red-50/50 hover:bg-red-50" : "hover:bg-muted/50"}
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {parseXeroDate(tx.date)}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{tx.contact}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                          {tx.description || <span className="italic text-red-500">No description</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          ${Math.abs(tx.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{tx.taxType}</code>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{tx.accountCode}</TableCell>
                        <TableCell>
                          <ConfidenceBadge confidence={tx.confidence} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                          {tx.flagged ? tx.confidenceReason : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredCdr.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No transactions found for this period.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Empty state */}
      {!result && !running && !error && (
        <div className="rounded-lg border bg-card p-12 text-center">
          <FileSearch className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Select a BAS period and run the review to check bank reconciliation and CDR transactions.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
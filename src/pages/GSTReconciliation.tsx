import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Play, FileText, Upload, X, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BasPeriod {
  id: string;
  period_label: string;
  period_end: string;
  financial_year: string;
}

interface RecLineItem {
  label: string;
  glAmount: number;
  cdrAmount: number;
  basAmount: number | null;
  glVsCdrVariance: number;
  glVsBasVariance: number | null;
  status: "match" | "variance" | "unavailable";
  notes: string;
}

interface GstRecResult {
  success: boolean;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  hasBasPdf: boolean;
  reconciliation: RecLineItem[];
  totalSales: number;
  netGst: number;
  flaggedVariances: RecLineItem[];
  aiAnalysis: string;
  gstRecId?: string;
}

// BAS figures extracted from PDF — keys match edge function expectations
interface BasFigures {
  totalSales?: number;
  gstCollected?: number;
  gstPaid?: number;
  paygWithholding?: number;
  paygInstalments?: number;
  fbtInstalments?: number;
  wet?: number;
  ftc?: number;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "match" | "variance" | "unavailable" }) {
  if (status === "match") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200 gap-1 font-medium">
        <CheckCircle2 className="h-3 w-3" /> Match
      </Badge>
    );
  }
  if (status === "variance") {
    return (
      <Badge className="bg-red-500/15 text-red-600 border-red-200 gap-1 font-medium">
        <AlertTriangle className="h-3 w-3" /> Variance
      </Badge>
    );
  }
  return (
    <Badge className="bg-muted text-muted-foreground border gap-1 font-medium">
      N/A
    </Badge>
  );
}

// ── Amount cell ───────────────────────────────────────────────────────────────

function AmountCell({ amount, highlight }: { amount: number | null; highlight?: boolean }) {
  if (amount === null) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className={`font-mono text-sm ${highlight && amount !== 0 ? "text-red-600 font-semibold" : ""}`}>
      ${Math.abs(amount).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

// ── PDF Parser ────────────────────────────────────────────────────────────────
// Extracts BAS figures from raw PDF text using pattern matching
// Jon's requirement: accountant drops in ATO BAS PDF — we parse it

function parseBasPdf(text: string): BasFigures {
  const figures: BasFigures = {};

  const extract = (patterns: RegExp[]): number | undefined => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const val = parseFloat(match[1].replace(/,/g, ""));
        if (!isNaN(val)) return val;
      }
    }
    return undefined;
  };

  figures.totalSales = extract([
    /G1[^\d]*?([\d,]+\.?\d*)/i,
    /total sales[^\d]*?([\d,]+\.?\d*)/i,
    /total\s+sales\s+and\s+income[^\d]*?([\d,]+\.?\d*)/i,
  ]);

  figures.gstCollected = extract([
    /1A[^\d]*?([\d,]+\.?\d*)/i,
    /GST\s+on\s+sales[^\d]*?([\d,]+\.?\d*)/i,
    /gst\s+collected[^\d]*?([\d,]+\.?\d*)/i,
  ]);

  figures.gstPaid = extract([
    /1B[^\d]*?([\d,]+\.?\d*)/i,
    /GST\s+on\s+purchases[^\d]*?([\d,]+\.?\d*)/i,
    /gst\s+paid[^\d]*?([\d,]+\.?\d*)/i,
  ]);

  figures.paygWithholding = extract([
    /W2[^\d]*?([\d,]+\.?\d*)/i,
    /PAYG\s+withholding[^\d]*?([\d,]+\.?\d*)/i,
    /payg\s+w[^\d]*?([\d,]+\.?\d*)/i,
  ]);

  figures.paygInstalments = extract([
    /T7[^\d]*?([\d,]+\.?\d*)/i,
    /PAYG\s+instalment[^\d]*?([\d,]+\.?\d*)/i,
  ]);

  figures.fbtInstalments = extract([
    /F1[^\d]*?([\d,]+\.?\d*)/i,
    /FBT\s+instalment[^\d]*?([\d,]+\.?\d*)/i,
  ]);

  figures.wet = extract([
    /W1[^\d]*?([\d,]+\.?\d*)/i,
    /wine\s+equalisation[^\d]*?([\d,]+\.?\d*)/i,
  ]);

  figures.ftc = extract([
    /C1[^\d]*?([\d,]+\.?\d*)/i,
    /fuel\s+tax\s+credit[^\d]*?([\d,]+\.?\d*)/i,
  ]);

  return figures;
}

// ── Manual BAS Entry Form ─────────────────────────────────────────────────────

const BAS_FIELDS: { key: keyof BasFigures; label: string; basRef: string }[] = [
  { key: "totalSales", label: "Total Sales", basRef: "G1" },
  { key: "gstCollected", label: "GST Collected", basRef: "1A" },
  { key: "gstPaid", label: "GST Paid", basRef: "1B" },
  { key: "paygWithholding", label: "PAYG Withholding", basRef: "W2" },
  { key: "paygInstalments", label: "PAYG Instalments", basRef: "T7" },
  { key: "fbtInstalments", label: "FBT Instalments", basRef: "F1" },
  { key: "wet", label: "WET", basRef: "W1" },
  { key: "ftc", label: "FTC", basRef: "C1" },
];

function ManualBasEntry({
  figures,
  onChange,
}: {
  figures: BasFigures;
  onChange: (f: BasFigures) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {BAS_FIELDS.map((f) => (
        <div key={f.key} className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">
            {f.label} <span className="text-[#89ead3] font-mono">({f.basRef})</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={figures[f.key] ?? ""}
            onChange={(e) =>
              onChange({
                ...figures,
                [f.key]: e.target.value === "" ? undefined : parseFloat(e.target.value),
              })
            }
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#2a3a5a]"
            placeholder="0.00"
          />
        </div>
      ))}
    </div>
  );
}

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  variant,
}: {
  label: string;
  value: string | number;
  sub?: string;
  variant: "default" | "success" | "warn" | "danger";
}) {
  const colours = {
    default: "text-foreground",
    success: "text-emerald-600",
    warn: "text-amber-600",
    danger: "text-red-600",
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GSTReconciliation() {
  const [periods, setPeriods] = useState<BasPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GstRecResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // BAS PDF state
  const [pdfMode, setPdfMode] = useState<"none" | "upload" | "manual">("none");
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [basF, setBasF] = useState<BasFigures>({});
  const [pdfParsed, setPdfParsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    supabase
      .from("bas_periods")
      .select("*")
      .order("period_end", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setPeriods(data);
          if (data.length > 0) setSelectedPeriodId(data[0].id);
        }
      });
  }, []);

  // PDF text extraction using FileReader
  const handlePdfFile = useCallback((file: File) => {
    if (!file.name.endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    setPdfFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      // Read as text — basic extraction from PDF binary
      // Works for text-based PDFs (ATO BAS PDFs are text-based)
      const binary = e.target?.result as string;
      // Extract readable text from PDF binary
      const textParts: string[] = [];
      const matches = binary.match(/\((.*?)\)/g) || [];
      for (const m of matches) {
        const inner = m.slice(1, -1);
        if (inner.length > 0 && inner.length < 200) textParts.push(inner);
      }
      const text = textParts.join(" ");
      const parsed = parseBasPdf(text + " " + binary);
      setBasF(parsed);
      setPdfParsed(Object.values(parsed).some((v) => v !== undefined));
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handlePdfFile(file);
    },
    [handlePdfFile]
  );

  const handleRun = async () => {
    if (!selectedPeriodId) return;
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const hasFigures = Object.values(basF).some((v) => v !== undefined && v !== null);
      const body: Record<string, unknown> = { bas_period_id: selectedPeriodId };
      if (hasFigures) body.bas_figures = basF;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gst-reconciliation`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "GST reconciliation failed");
      setResult(data as GstRecResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  const clearPdf = () => {
    setPdfFileName(null);
    setBasF({});
    setPdfParsed(false);
    setPdfMode("none");
  };

  const hasBasFigures = Object.values(basF).some((v) => v !== undefined);

  return (
    <AppLayout>
      <PageHeader
        title="GST Reconciliation"
        subtitle="General ledger vs CDR reconciliation with optional BAS PDF cross-reference"
        searchValue=""
        onSearchChange={() => {}}
        searchPlaceholder=""
        onExport={() => {}}
      >
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
          {running ? "Running..." : "Run Reconciliation"}
        </Button>
      </PageHeader>

      {/* BAS PDF Section */}
      <div className="mb-6 rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">BAS PDF (Optional)</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload your ATO BAS PDF or enter figures manually to enable 3-way reconciliation (GL vs CDR vs BAS)
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={pdfMode === "upload" ? "default" : "outline"}
              size="sm"
              onClick={() => setPdfMode(pdfMode === "upload" ? "none" : "upload")}
              className={pdfMode === "upload" ? "bg-[#2a3a5a] text-white" : ""}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload PDF
            </Button>
            <Button
              variant={pdfMode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => setPdfMode(pdfMode === "manual" ? "none" : "manual")}
              className={pdfMode === "manual" ? "bg-[#2a3a5a] text-white" : ""}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" /> Enter Manually
            </Button>
            {hasBasFigures && (
              <Button variant="ghost" size="sm" onClick={clearPdf} className="text-muted-foreground">
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Upload zone */}
        {pdfMode === "upload" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragging ? "border-[#89ead3] bg-[#89ead3]/5" : "border-border"
            }`}
          >
            {pdfFileName ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-5 w-5 text-[#89ead3]" />
                <span className="text-sm font-medium">{pdfFileName}</span>
                {pdfParsed ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Figures extracted
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/15 text-amber-600 border-amber-200">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Could not parse — enter manually
                  </Badge>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop your ATO BAS PDF here, or{" "}
                  <label className="text-[#2a3a5a] font-semibold cursor-pointer underline underline-offset-2">
                    browse
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handlePdfFile(e.target.files[0])}
                    />
                  </label>
                </p>
                <p className="text-xs text-muted-foreground">ATO BAS PDF only</p>
              </div>
            )}
          </div>
        )}

        {/* Manual entry */}
        {(pdfMode === "manual" || (pdfMode === "upload" && pdfFileName && !pdfParsed)) && (
          <div className="space-y-3">
            {pdfMode === "manual" && (
              <p className="text-xs text-muted-foreground">
                Enter figures from your ATO BAS. Reference numbers shown match the BAS form fields.
              </p>
            )}
            {pdfMode === "upload" && !pdfParsed && (
              <p className="text-xs text-amber-600">
                Could not auto-extract from PDF. Please enter figures manually below.
              </p>
            )}
            <ManualBasEntry figures={basF} onChange={setBasF} />
          </div>
        )}

        {/* Parsed figures preview */}
        {pdfParsed && pdfMode === "upload" && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Extracted BAS Figures — verify before running
            </p>
            <ManualBasEntry figures={basF} onChange={setBasF} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="inline h-4 w-4 mr-2" />
          {error}
        </div>
      )}

      {/* Running */}
      {running && (
        <div className="mb-6 rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <div className="animate-pulse text-sm">
            Connecting to Xero · Pulling General Ledger · Pulling CDR transactions · Computing reconciliation...
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Period banner */}
          <div className="rounded-lg border bg-[#2a3a5a] px-5 py-3 text-white text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-[#89ead3]" />
              <span>
                <strong>{result.periodLabel}</strong> — {result.periodStart} to {result.periodEnd}
              </span>
              {result.hasBasPdf ? (
                <Badge className="bg-[#89ead3]/20 text-[#89ead3] border-[#89ead3]/30 text-xs">
                  3-way: GL vs CDR vs BAS
                </Badge>
              ) : (
                <Badge className="bg-white/10 text-white/60 border-white/20 text-xs">
                  2-way: GL vs CDR
                </Badge>
              )}
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              label="Total Sales"
              value={`$${result.totalSales.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`}
              sub="Per general ledger"
              variant="default"
            />
            <SummaryCard
              label="Net GST Position"
              value={`$${Math.abs(result.netGst).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`}
              sub={result.netGst >= 0 ? "Payable to ATO" : "Refund due"}
              variant={result.netGst >= 0 ? "warn" : "success"}
            />
            <SummaryCard
              label="Variances Found"
              value={result.flaggedVariances.length}
              sub="Require review before lodgement"
              variant={result.flaggedVariances.length === 0 ? "success" : "danger"}
            />
            <SummaryCard
              label="Reconciliation"
              value={result.flaggedVariances.length === 0 ? "Clean" : "Review Required"}
              sub={result.hasBasPdf ? "GL · CDR · BAS" : "GL · CDR"}
              variant={result.flaggedVariances.length === 0 ? "success" : "danger"}
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

          {/* Reconciliation table */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-semibold text-[#2a3a5a]">
                Reconciliation — {result.periodLabel}
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#2a3a5a] hover:bg-[#2a3a5a]">
                    <TableHead className="text-white font-semibold">Line Item</TableHead>
                    <TableHead className="text-white font-semibold text-right">General Ledger</TableHead>
                    <TableHead className="text-white font-semibold text-right">CDR</TableHead>
                    {result.hasBasPdf && (
                      <TableHead className="text-white font-semibold text-right">BAS (PDF)</TableHead>
                    )}
                    <TableHead className="text-white font-semibold text-right">GL vs CDR</TableHead>
                    {result.hasBasPdf && (
                      <TableHead className="text-white font-semibold text-right">GL vs BAS</TableHead>
                    )}
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-white font-semibold">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.reconciliation.map((row) => (
                    <TableRow
                      key={row.label}
                      className={row.status === "variance" ? "bg-red-50/50 hover:bg-red-50" : "hover:bg-muted/50"}
                    >
                      <TableCell className="font-semibold text-sm">{row.label}</TableCell>
                      <TableCell className="text-right">
                        <AmountCell amount={row.glAmount} />
                      </TableCell>
                      <TableCell className="text-right">
                        <AmountCell amount={row.cdrAmount} />
                      </TableCell>
                      {result.hasBasPdf && (
                        <TableCell className="text-right">
                          <AmountCell amount={row.basAmount} />
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <AmountCell amount={row.glVsCdrVariance} highlight={row.glVsCdrVariance > 0.5} />
                      </TableCell>
                      {result.hasBasPdf && (
                        <TableCell className="text-right">
                          <AmountCell
                            amount={row.glVsBasVariance}
                            highlight={(row.glVsBasVariance ?? 0) > 0.5}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[220px]">
                        {row.notes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Net GST footer */}
          <div className={`rounded-lg border p-4 flex items-center gap-3 ${
            result.netGst >= 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
          }`}>
            {result.netGst >= 0 ? (
              <TrendingUp className="h-5 w-5 text-amber-600 shrink-0" />
            ) : (
              <TrendingDown className="h-5 w-5 text-emerald-600 shrink-0" />
            )}
            <div>
              <p className={`text-sm font-bold ${result.netGst >= 0 ? "text-amber-700" : "text-emerald-700"}`}>
                Net GST {result.netGst >= 0 ? "Payable" : "Refundable"}: $
                {Math.abs(result.netGst).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">
                GST Collected ($
                {(result.reconciliation.find((r) => r.label === "GST Collected")?.glAmount ?? 0).toFixed(2)}) minus GST Paid ($
                {(result.reconciliation.find((r) => r.label === "GST Paid")?.glAmount ?? 0).toFixed(2)})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !running && !error && (
        <div className="rounded-lg border bg-card p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Select a BAS period and run the reconciliation. Optionally upload your ATO BAS PDF for a 3-way comparison.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
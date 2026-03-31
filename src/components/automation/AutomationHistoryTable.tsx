import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, RefreshCw, Database } from "lucide-react";

type AutomationRun = {
  id: string;
  automation_type: string;
  run_by: string;
  status: string;
  records_reviewed: number;
  issues_found: number;
  completed_at: string;
  report_data: any;
};

const typeLabel: Record<string, string> = {
  'BAS Review': 'BAS / GST Review',
  'Weekly Productivity Report': 'Weekly Productivity Report',
  'Payroll Reconciliation': 'Payroll Reconciliation',
  'Super Reconciliation': 'Super Reconciliation',
  'Financial Review': 'Financial Review',
};

export function AutomationHistoryTable() {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('automation_runs')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(20);

    if (!error && data) setRuns(data);
    setLoading(false);
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getStatus = (run: AutomationRun) => {
    if (run.issues_found > 0) return 'Issues Found';
    return 'Completed';
  };

  const buildReportSummary = (run: AutomationRun): string => {
    const d = run.report_data;
    if (!d) return 'No report data available.';

    switch (run.automation_type) {
      case 'BAS Review':
        return `${run.records_reviewed} transactions reviewed. ${d.issues?.length || 0} critical issues, ${d.warnings?.length || 0} warnings. ${d.warnings?.slice(0,2).map((w: any) => w.contact).join(', ') || ''} flagged.`;
      case 'Payroll Reconciliation':
        return `${run.records_reviewed} payroll transactions reviewed. ${d.employees?.length || 0} employees. Gross wages: $${d.totalGross?.toFixed(0) || 0}. PAYG: $${d.totalPayg?.toFixed(0) || 0}. Est. super: $${d.estimatedSuper?.toFixed(0) || 0}.`;
      case 'Weekly Productivity Report':
        return `${run.records_reviewed} invoices reviewed. Total invoiced: $${d.totalInvoiced?.toFixed(0) || 0}. Collected: $${d.totalPaid?.toFixed(0) || 0}. Outstanding: $${d.totalOutstanding?.toFixed(0) || 0}.`;
      case 'Super Reconciliation':
        return `${d.employees?.length || 0} employees. Gross wages: $${d.totalGrossWages?.toFixed(0) || 0}. Super liability: $${d.estimatedSuperLiability?.toFixed(0) || 0}. Paid: $${d.totalSuperPaid?.toFixed(0) || 0}. ${d.superCompliant ? 'Compliant.' : 'SHORTFALL DETECTED.'}`;
      case 'Financial Review':
        return `Revenue: $${d.totalRevenue?.toFixed(0) || 0}. Expenses: $${d.totalExpenses?.toFixed(0) || 0}. Gross margin: ${d.grossMargin?.toFixed(1) || 0}%. Net margin: ${d.netMargin?.toFixed(1) || 0}%. Current ratio: ${d.currentRatio?.toFixed(2) || 0}.`;
      default:
        return `${run.records_reviewed} records reviewed. ${run.issues_found} issues found.`;
    }
  };

  return (
    <Card className="border-[#2a3a5a]/10 mt-6 overflow-hidden">
      <CardHeader className="pb-3 border-b border-[#2a3a5a]/10 bg-[#2a3a5a]/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold text-[#2a3a5a] uppercase tracking-widest">
              Automation History
            </CardTitle>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Database className="h-2.5 w-2.5" />
              Live from Supabase
            </span>
          </div>
          <button
            onClick={fetchRuns}
            className="flex items-center gap-1.5 text-[11px] text-[#2a3a5a]/50 hover:text-[#2a3a5a] transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="text-center py-8 text-xs text-muted-foreground">Loading automation history...</div>
        ) : runs.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">No automation runs yet. Run your first automation above.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#2a3a5a]/[0.03] hover:bg-[#2a3a5a]/[0.03]">
                <TableHead className="text-[11px] font-bold text-[#2a3a5a]/60 uppercase tracking-wider">Automation</TableHead>
                <TableHead className="text-[11px] font-bold text-[#2a3a5a]/60 uppercase tracking-wider">Date / Time</TableHead>
                <TableHead className="text-[11px] font-bold text-[#2a3a5a]/60 uppercase tracking-wider text-right">Records</TableHead>
                <TableHead className="text-[11px] font-bold text-[#2a3a5a]/60 uppercase tracking-wider text-right">Issues</TableHead>
                <TableHead className="text-[11px] font-bold text-[#2a3a5a]/60 uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-[11px] font-bold text-[#2a3a5a]/60 uppercase tracking-wider font-mono">Run ID</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <>
                  <TableRow
                    key={run.id}
                    className="cursor-pointer hover:bg-[#2a3a5a]/[0.02] transition-colors border-b border-[#2a3a5a]/5"
                    onClick={() => setExpandedRow(expandedRow === run.id ? null : run.id)}
                  >
                    <TableCell className="font-semibold text-[13px] text-[#2a3a5a] py-3">
                      {typeLabel[run.automation_type] || run.automation_type}
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground py-3 font-mono">
                      {formatDateTime(run.completed_at)}
                    </TableCell>
                    <TableCell className="text-[12px] text-right font-bold text-[#2a3a5a] py-3">
                      {run.records_reviewed}
                    </TableCell>
                    <TableCell className="text-[12px] text-right py-3">
                      <span className={cn(
                        "font-bold",
                        run.issues_found > 0 ? "text-orange-500" : "text-[#89ead3]"
                      )}>
                        {run.issues_found}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                        run.issues_found > 0
                          ? "bg-orange-50 text-orange-600 border border-orange-200"
                          : "bg-[#89ead3]/10 text-[#2a3a5a] border border-[#89ead3]/30"
                      )}>
                        {getStatus(run)}
                      </span>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground/40 font-mono py-3">
                      {run.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="py-3">
                      {expandedRow === run.id
                        ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      }
                    </TableCell>
                  </TableRow>
                  {expandedRow === run.id && (
                    <TableRow key={`${run.id}-expanded`}>
                      <TableCell colSpan={7} className="bg-[#2a3a5a]/[0.02] px-6 py-4 border-b border-[#2a3a5a]/5">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[11px] font-bold text-[#2a3a5a] mb-1.5 uppercase tracking-wider">Report Output</p>
                            <p className="text-[12px] text-foreground leading-relaxed">{buildReportSummary(run)}</p>
                          </div>
                          <div className="border-l border-[#2a3a5a]/10 pl-4">
                            <p className="text-[11px] font-bold text-[#2a3a5a] mb-1.5 uppercase tracking-wider">Run Metadata</p>
                            <div className="space-y-1">
                              <p className="text-[11px] text-muted-foreground font-mono">ID: {run.id}</p>
                              <p className="text-[11px] text-muted-foreground">Supabase: ovdgfaadyfjjwgbxubpw · ap-southeast-2</p>
                              <p className="text-[11px] text-muted-foreground">Model: gpt-4o-mini · Xero OAuth 2.0</p>
                              <p className="text-[11px] text-muted-foreground">Status: {run.status}</p>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
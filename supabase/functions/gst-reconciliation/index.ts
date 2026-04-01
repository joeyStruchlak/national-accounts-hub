import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Xero account codes for GST-related GL accounts
const GST_ACCOUNT_CODES = {
  GST_COLLECTED: ['820'],       // GST on Income
  GST_PAID: ['825'],            // GST on Expenses / PAYG Withholding Payable
  PAYG_WITHHOLDING: ['825'],    // PAYG Withholding Payable
  PAYG_INSTALMENTS: ['840'],    // PAYG Instalments Payable
  FBT_INSTALMENTS: ['845'],     // FBT Instalments
  WET: ['850'],                 // Wine Equalisation Tax
  FTC: ['855'],                 // Fuel Tax Credits
}

// Tax types that contribute to each reconciliation line
const TAX_TYPE_MAP: Record<string, string> = {
  'OUTPUT2': 'gstCollected',
  'GSTONIMPORTS': 'gstCollected',
  'INPUT2': 'gstPaid',
  'EXEMPTOUTPUT': 'totalSales',
  'ZERORATEDOUTPUT': 'totalSales',
  'EXEMPTEXPENSES': 'gstPaid',
  'BASEXCLUDED': 'basExcluded',
  'NONE': 'noGst',
}

interface RecLineItem {
  label: string
  glAmount: number        // From Xero General Ledger
  cdrAmount: number       // From CDR (BankTransactions)
  basAmount: number | null // From uploaded BAS PDF (null if not provided)
  glVsCdrVariance: number
  glVsBasVariance: number | null
  status: 'match' | 'variance' | 'unavailable'
  notes: string
}

interface GstRecResult {
  success: boolean
  periodLabel: string
  periodStart: string
  periodEnd: string
  hasBasPdf: boolean
  reconciliation: RecLineItem[]
  totalSales: number
  netGst: number
  flaggedVariances: RecLineItem[]
  aiAnalysis: string
  gstRecId?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('gst-reconciliation: invoked')

    let bas_period_id: string | null = null
    let basData: Record<string, number> | null = null

    try {
      const text = await req.text()
      if (text && text.trim() !== '') {
        const body = JSON.parse(text)
        bas_period_id = body.bas_period_id || null
        basData = body.bas_figures || null
      }
    } catch (e) {
      console.error('gst-reconciliation: body parse error', e)
    }

    console.log('gst-reconciliation: period', bas_period_id, 'has BAS PDF', !!basData)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Resolve period
    let periodEnd: string
    let periodLabel: string
    let periodStart: string

    if (bas_period_id) {
      const { data: period, error: periodErr } = await supabaseClient
        .from('bas_periods')
        .select('*')
        .eq('id', bas_period_id)
        .single()

      if (periodErr || !period) throw new Error(`BAS period not found: ${bas_period_id}`)

      periodEnd = period.period_end
      periodLabel = period.period_label

      const endDate = new Date(periodEnd)
      const month = endDate.getMonth()
      const quarterStartMonth = Math.floor(month / 3) * 3
      periodStart = new Date(endDate.getFullYear(), quarterStartMonth, 1).toISOString().split('T')[0]
    } else {
      const now = new Date()
      const month = now.getMonth()
      const quarterEndMonth = Math.floor(month / 3) * 3 + 2
      const periodEndDate = new Date(now.getFullYear(), quarterEndMonth + 1, 0)
      const quarterStartMonth = Math.floor(month / 3) * 3
      periodEnd = periodEndDate.toISOString().split('T')[0]
      periodLabel = 'Current Quarter'
      periodStart = new Date(now.getFullYear(), quarterStartMonth, 1).toISOString().split('T')[0]
    }

    const clientId = Deno.env.get('XERO_CLIENT_ID')
    const clientSecret = Deno.env.get('XERO_CLIENT_SECRET')
    const tenantId = Deno.env.get('XERO_TENANT_ID')
    const githubToken = Deno.env.get('GITHUB_TOKEN')

    if (!clientId || !clientSecret || !tenantId) throw new Error('Missing Xero credentials')

    // Get Xero token
    const credentials = btoa(`${clientId}:${clientSecret}`)
    const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=accounting.transactions.read accounting.reports.read accounting.contacts.read'
    })
    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    if (!accessToken) throw new Error(`Failed to get Xero token: ${JSON.stringify(tokenData)}`)

    const xeroHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json',
    }

    // ── PULL CDR TRANSACTIONS ─────────────────────────────────────────────────
    let allTransactions: any[] = []
    let page = 1
    let hasMore = true
    while (hasMore) {
      const txUrl = `https://api.xero.com/api.xro/2.0/BankTransactions?page=${page}&fromDate=${periodStart}&toDate=${periodEnd}`
      const txResponse = await fetch(txUrl, { headers: xeroHeaders })
      const txData = await txResponse.json()
      const txs = txData.BankTransactions || []
      allTransactions = [...allTransactions, ...txs]
      if (txs.length < 100) hasMore = false
      else page++
    }

    const activeTx = allTransactions.filter(
      (t: any) => t.Status !== 'DELETED' && t.Status !== 'VOIDED'
    )

    // Compute CDR totals from line items
    const cdr = {
      totalSales: 0,
      gstCollected: 0,
      gstPaid: 0,
      paygWithholding: 0,
      paygInstalments: 0,
      fbtInstalments: 0,
      wet: 0,
      ftc: 0,
    }

    for (const tx of activeTx) {
      for (const line of tx.LineItems || []) {
        const amount = Math.abs(line.LineAmount || 0)
        const taxType = line.TaxType || 'NONE'
        const taxAmount = Math.abs(line.TaxAmount || 0)
        const accountCode = line.AccountCode || ''

        // Total Sales — all income-type transactions
        if (['OUTPUT2', 'OUTPUT', 'GSTONIMPORTS', 'EXEMPTOUTPUT', 'ZERORATEDOUTPUT'].includes(taxType)) {
          cdr.totalSales += amount
        }

        // GST Collected — tax on output (10% of taxable sales)
        if (['OUTPUT2', 'OUTPUT', 'GSTONIMPORTS'].includes(taxType)) {
          // Use TaxAmount if available, otherwise calculate 1/11 of line amount
          cdr.gstCollected += taxAmount > 0 ? taxAmount : Math.round((amount / 11) * 100) / 100
        }

        // GST Paid — tax on input (10% of taxable purchases)
        if (['INPUT2', 'INPUT', 'EXEMPTEXPENSES'].includes(taxType)) {
          cdr.gstPaid += taxAmount > 0 ? taxAmount : Math.round((amount / 11) * 100) / 100
        }

        // PAYG Withholding — account 825 BASEXCLUDED negative amounts (tax deducted from wages)
        if (taxType === 'BASEXCLUDED' && accountCode === '825' && line.LineAmount < 0) {
          cdr.paygWithholding += Math.abs(line.LineAmount)
        }

        // PAYG Instalments — account 840
        if (accountCode === '840') {
          cdr.paygInstalments += amount
        }

        // FBT Instalments — account 845
        if (accountCode === '845') {
          cdr.fbtInstalments += amount
        }

        // WET — account 850
        if (accountCode === '850') {
          cdr.wet += amount
        }

        // FTC — account 855
        if (accountCode === '855') {
          cdr.ftc += amount
        }
      }
    }

    // ── PULL GL VIA TRIAL BALANCE REPORT ─────────────────────────────────────
    const trialBalanceUrl = `https://api.xero.com/api.xro/2.0/Reports/TrialBalance?date=${periodEnd}&paymentsOnly=false`
    const tbResponse = await fetch(trialBalanceUrl, { headers: xeroHeaders })
    const tbData = await tbResponse.json()

    // Also pull P&L for total sales
    const plUrl = `https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss?fromDate=${periodStart}&toDate=${periodEnd}`
    const plResponse = await fetch(plUrl, { headers: xeroHeaders })
    const plData = await plResponse.json()

    // Parse trial balance for GST accounts
    const gl = {
      totalSales: 0,
      gstCollected: 0,
      gstPaid: 0,
      paygWithholding: 0,
      paygInstalments: 0,
      fbtInstalments: 0,
      wet: 0,
      ftc: 0,
    }

    // Extract total revenue from P&L — search all rows for income summary
    try {
      const plReport = plData.Reports?.[0]
      const allPlRows: any[] = []
      for (const section of plReport?.Rows || []) {
        allPlRows.push(section)
        for (const row of section.Rows || []) {
          allPlRows.push(row)
        }
      }
      for (const row of allPlRows) {
        const cells = row.Cells || []
        const label = (cells[0]?.Value || '').toLowerCase()
        if (label.includes('total income') || label.includes('total revenue') || label.includes('total trading income')) {
          const val = parseFloat((cells[1]?.Value || cells[2]?.Value || '0').replace(/[^0-9.-]/g, ''))
          if (!isNaN(val) && val !== 0) { gl.totalSales = Math.abs(val); break }
        }
      }
    } catch (e) {
      console.error('gst-reconciliation: P&L parse error', e)
    }

    // Parse trial balance for GST liability accounts
    try {
      const tbReport = tbData.Reports?.[0]
      for (const section of tbReport?.Rows || []) {
        for (const row of section.Rows || []) {
          const cells = row.Cells || []
          const accountName = (cells[0]?.Value || '').toLowerCase()
          const credit = parseFloat(cells[2]?.Value || '0') || 0
          const debit = parseFloat(cells[1]?.Value || '0') || 0
          const net = credit - debit

          if (accountName.includes('gst on income') || accountName.includes('gst collected')) {
            gl.gstCollected = Math.abs(net)
          }
          if (accountName.includes('gst on expenses') || accountName.includes('gst paid')) {
            gl.gstPaid = Math.abs(net)
          }
          if (accountName.includes('payg withholding') || accountName.includes('payg w')) {
            gl.paygWithholding = Math.abs(net)
          }
          if (accountName.includes('payg instalment')) {
            gl.paygInstalments = Math.abs(net)
          }
          if (accountName.includes('fbt')) {
            gl.fbtInstalments = Math.abs(net)
          }
          if (accountName.includes('wine equalisation') || accountName.includes('wet')) {
            gl.wet = Math.abs(net)
          }
          if (accountName.includes('fuel tax') || accountName.includes('ftc')) {
            gl.ftc = Math.abs(net)
          }
        }
      }
    } catch (e) {
      console.error('gst-reconciliation: Trial Balance parse error', e)
    }

    // CDR is period-filtered; Trial Balance is cumulative (all-time balance).
    // For period-specific reconciliation, CDR figures are more reliable for PAYG.
    // Always use CDR as the primary for PAYG Withholding — TB is cumulative not period.
    gl.paygWithholding = cdr.paygWithholding

    // For GST lines: if GL (from TB) is zero, fall back to CDR
    if (gl.gstCollected === 0) gl.gstCollected = cdr.gstCollected
    if (gl.gstPaid === 0) gl.gstPaid = cdr.gstPaid

    // Total Sales: GL (P&L) is accrual-based, CDR is cash/bank-based — both valid perspectives.
    // If P&L returned a figure, keep it as GL. CDR shows cash receipts only.
    // A variance here means unbanked invoices — flag with explanation not just "review"

    // ── BUILD RECONCILIATION TABLE ────────────────────────────────────────────
    const VARIANCE_THRESHOLD = 0.50 // flag if >$0.50 variance

    const buildLine = (
      label: string,
      glAmt: number,
      cdrAmt: number,
      basKey?: string,
      notes?: string
    ): RecLineItem => {
      const basAmt = basData && basKey ? (basData[basKey] ?? null) : null
      const glVsCdr = Math.abs(glAmt - cdrAmt)
      const glVsBas = basAmt !== null ? Math.abs(glAmt - basAmt) : null

      let status: 'match' | 'variance' | 'unavailable' = 'match'
      if (glVsCdr > VARIANCE_THRESHOLD) status = 'variance'
      if (basAmt === null) status = glVsCdr > VARIANCE_THRESHOLD ? 'variance' : 'match'

      const noteLines: string[] = []
      if (glVsCdr > VARIANCE_THRESHOLD) noteLines.push(`GL vs CDR variance of $${glVsCdr.toFixed(2)} — review`)
      if (glVsBas !== null && glVsBas > VARIANCE_THRESHOLD) noteLines.push(`GL vs BAS variance of $${glVsBas.toFixed(2)} — review before lodgement`)
      if (notes) noteLines.push(notes)

      return {
        label,
        glAmount: glAmt,
        cdrAmount: cdrAmt,
        basAmount: basAmt,
        glVsCdrVariance: glVsCdr,
        glVsBasVariance: glVsBas,
        status,
        notes: noteLines.join(' | ') || 'No issues identified',
      }
    }

    const reconciliation: RecLineItem[] = [
      buildLine('Total Sales', gl.totalSales, cdr.totalSales, 'totalSales',
        gl.totalSales > 0 && cdr.totalSales === 0
          ? 'GL (accrual) includes invoiced amounts not yet banked. CDR reflects cash receipts only. Verify outstanding debtors.'
          : gl.totalSales === 0 && cdr.totalSales === 0
          ? 'No sales activity recorded in GL or CDR for this period.'
          : undefined),
      buildLine('GST Collected', gl.gstCollected, cdr.gstCollected, 'gstCollected'),
      buildLine('GST Paid', gl.gstPaid, cdr.gstPaid, 'gstPaid'),
      buildLine('PAYG Withholding', gl.paygWithholding, cdr.paygWithholding, 'paygWithholding'),
      buildLine('PAYG Instalments', gl.paygInstalments, cdr.paygInstalments, 'paygInstalments',
        gl.paygInstalments === 0 && cdr.paygInstalments === 0 ? 'No PAYG instalment activity this period' : undefined),
      buildLine('FBT Instalments', gl.fbtInstalments, cdr.fbtInstalments, 'fbtInstalments',
        gl.fbtInstalments === 0 && cdr.fbtInstalments === 0 ? 'No FBT activity this period' : undefined),
      buildLine('WET', gl.wet, cdr.wet, 'wet',
        gl.wet === 0 && cdr.wet === 0 ? 'No WET activity this period' : undefined),
      buildLine('FTC', gl.ftc, cdr.ftc, 'ftc',
        gl.ftc === 0 && cdr.ftc === 0 ? 'No FTC activity this period' : undefined),
    ]

    const flaggedVariances = reconciliation.filter(r => r.status === 'variance')
    const netGst = gl.gstCollected - gl.gstPaid

    // ── AI ANALYSIS ───────────────────────────────────────────────────────────
    let aiAnalysis = ''
    if (githubToken) {
      const recSummary = reconciliation.map(r =>
        `${r.label}: GL=$${r.glAmount.toFixed(2)} CDR=$${r.cdrAmount.toFixed(2)}${r.basAmount !== null ? ` BAS=$${r.basAmount.toFixed(2)}` : ''} [${r.status.toUpperCase()}]${r.status === 'variance' ? ` — ${r.notes}` : ''}`
      ).join('\n')

      const aiResponse = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert Australian tax accountant reviewing a GST reconciliation for a CA firm.
You understand BAS lodgement requirements, ATO reconciliation standards, and Australian GST law.
Provide a concise professional analysis for the BAS preparer.
Focus on: variances that need resolution before lodgement, compliance risks, and priority actions.
Keep your response under 200 words. Use numbered action items. Never guess — only flag what is evidenced.`,
            },
            {
              role: 'user',
              content: `GST Reconciliation — ${periodLabel} (${periodStart} to ${periodEnd})
${basData ? 'BAS PDF provided — 3-way reconciliation (GL vs CDR vs BAS)' : 'No BAS PDF — 2-way reconciliation (GL vs CDR only)'}

RECONCILIATION RESULTS:
${recSummary}

NET GST POSITION: $${netGst.toFixed(2)} ${netGst >= 0 ? '(payable to ATO)' : '(refund due)'}
VARIANCES FOUND: ${flaggedVariances.length}

Provide a brief professional analysis and priority action list for the BAS preparer before lodgement.`,
            },
          ],
          max_tokens: 250,
          temperature: 0.2,
        }),
      })
      const aiData = await aiResponse.json()
      aiAnalysis = aiData.choices?.[0]?.message?.content || ''
    }

    // ── SAVE TO gst_reconciliations ───────────────────────────────────────────
    const { data: gstRec } = await supabaseClient
      .from('gst_reconciliations')
      .insert({
        bas_period_id: bas_period_id || null,
        run_by: 'System',
        bank_accounts: null,
        cdr_issues: flaggedVariances,
        gst_summary: {
          totalSales: gl.totalSales,
          gstCollected: gl.gstCollected,
          gstPaid: gl.gstPaid,
          netGst,
          varianceCount: flaggedVariances.length,
          hasBasPdf: !!basData,
        },
        ai_analysis: aiAnalysis,
        status: 'completed',
      })
      .select()
      .single()

    // Audit log
    await supabaseClient.from('automation_runs').insert({
      automation_type: 'GST Reconciliation',
      run_by: 'System',
      status: 'completed',
      records_reviewed: reconciliation.length,
      issues_found: flaggedVariances.length,
      completed_at: new Date().toISOString(),
      report_data: {
        periodLabel,
        periodStart,
        periodEnd,
        hasBasPdf: !!basData,
        netGst,
        varianceCount: flaggedVariances.length,
        gstRecId: gstRec?.id,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        periodLabel,
        periodStart,
        periodEnd,
        hasBasPdf: !!basData,
        reconciliation,
        totalSales: gl.totalSales,
        netGst,
        flaggedVariances,
        aiAnalysis,
        gstRecId: gstRec?.id,
      } as GstRecResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('gst-reconciliation: error', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
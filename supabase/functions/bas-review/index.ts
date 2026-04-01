import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// GST tax type classification
const GST_COLLECTED_TYPES = ['OUTPUT2', 'GSTONIMPORTS']
const GST_FREE_TYPES = ['EXEMPTOUTPUT', 'ZERORATEDOUTPUT', 'EXEMPTEXPENSES', 'ZERORATEDINPUT']
const GST_PAID_TYPES = ['INPUT2']
const NO_GST_TYPES = ['NONE', 'EXEMPTINPUT']

interface BankAccountResult {
  accountId: string
  accountName: string
  accountCode: string
  currencyCode: string
  balance: number
  isReconciled: boolean
  unreconciledItems: number
  recommendation: string
}

interface CdrTransaction {
  transactionId: string
  date: string
  contact: string
  description: string
  amount: number
  taxType: string
  accountCode: string
  accountName: string
  confidence: 'CONFIRMED' | 'REVIEW' | 'UNCERTAIN'
  confidenceReason: string
  flagged: boolean
}

function classifyGstConfidence(
  taxType: string,
  amount: number,
  description: string,
  accountCode: string
): { confidence: 'CONFIRMED' | 'REVIEW' | 'UNCERTAIN'; reason: string; flagged: boolean } {
  const desc = (description || '').toLowerCase()
  const absAmount = Math.abs(amount)

  // UNCERTAIN: no description — cannot determine intent
  if (!description || description.trim() === '') {
    return {
      confidence: 'UNCERTAIN',
      reason: 'No description — cannot verify GST coding without transaction detail',
      flagged: true,
    }
  }

  // UNCERTAIN: mixed signals — exempt type on large amounts
  if (GST_FREE_TYPES.includes(taxType) && absAmount > 10000) {
    return {
      confidence: 'UNCERTAIN',
      reason: `GST-free coding (${taxType}) on transaction over $10,000 — verify exempt status`,
      flagged: true,
    }
  }

  // UNCERTAIN: NONE tax type on amounts that look like they should attract GST
  if (taxType === 'NONE' && absAmount > 500) {
    const likelyGstable = ['invoice', 'service', 'supply', 'sale', 'purchase', 'fee', 'subscription'].some(
      (kw) => desc.includes(kw)
    )
    if (likelyGstable) {
      return {
        confidence: 'UNCERTAIN',
        reason: `No GST coded (NONE) but description suggests taxable supply — verify with preparer`,
        flagged: true,
      }
    }
  }

  // REVIEW: exempt expenses coded to P&L instead of liability
  if (accountCode === '505' && taxType === 'EXEMPTEXPENSES') {
    return {
      confidence: 'REVIEW',
      reason: 'PAYG tax possibly coded to P&L (505) instead of liability account (825) — review coding',
      flagged: true,
    }
  }

  // REVIEW: GST collected on what looks like an expense
  if (GST_COLLECTED_TYPES.includes(taxType)) {
    const looksLikeExpense = ['rent', 'purchase', 'supplier', 'utility', 'telstra', 'optus', 'ato'].some(
      (kw) => desc.includes(kw)
    )
    if (looksLikeExpense) {
      return {
        confidence: 'REVIEW',
        reason: `GST collected coding (${taxType}) on what appears to be an expense — verify`,
        flagged: true,
      }
    }
  }

  // REVIEW: GST paid on what looks like income
  if (GST_PAID_TYPES.includes(taxType)) {
    const looksLikeIncome = ['invoice', 'client', 'customer', 'revenue', 'fee income', 'retainer'].some(
      (kw) => desc.includes(kw)
    )
    if (looksLikeIncome) {
      return {
        confidence: 'REVIEW',
        reason: `GST paid coding (${taxType}) on what appears to be income — verify`,
        flagged: true,
      }
    }
  }

  // CONFIRMED: standard patterns
  return {
    confidence: 'CONFIRMED',
    reason: `GST coding (${taxType}) appears consistent with transaction type`,
    flagged: false,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('bas-review: invoked', req.method)

    let bas_period_id: string | null = null
    try {
      const text = await req.text()
      console.log('bas-review: body text', text)
      if (text && text.trim() !== '') {
        const body = JSON.parse(text)
        bas_period_id = body.bas_period_id || null
      }
    } catch (parseErr) {
      console.error('bas-review: body parse error', parseErr)
    }
    console.log('bas-review: bas_period_id', bas_period_id)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Resolve BAS period
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

      // Derive period start from quarter
      const endDate = new Date(periodEnd)
      const month = endDate.getMonth() // 0-indexed
      // Q ends: Sep=8, Dec=11, Mar=2, Jun=5
      const quarterStartMonth = Math.floor(month / 3) * 3
      periodStart = new Date(endDate.getFullYear(), quarterStartMonth, 1).toISOString().split('T')[0]
    } else {
      // Default: current quarter
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

    console.log('bas-review: xero creds present', !!clientId, !!clientSecret, !!tenantId)
    if (!clientId || !clientSecret || !tenantId) throw new Error('Missing Xero credentials')

    // Get Xero token
    const credentials = btoa(`${clientId}:${clientSecret}`)
    console.log('bas-review: fetching xero token')
    const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=accounting.transactions.read accounting.reports.read accounting.contacts.read'
    })
    const tokenData = await tokenResponse.json()
    console.log('bas-review: token status', tokenResponse.status, !!tokenData.access_token)
    const accessToken = tokenData.access_token
    if (!accessToken) throw new Error(`Failed to get Xero token: ${JSON.stringify(tokenData)}`)

    const xeroHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json',
    }

    // ── BANK ACCOUNT RECONCILIATION ──────────────────────────────────────────
    // Use BankSummary report — most reliable source for bank rec status
    const bankSummaryUrl = `https://api.xero.com/api.xro/2.0/Reports/BankSummary?fromDate=${periodStart}&toDate=${periodEnd}`
    const bankSummaryResponse = await fetch(bankSummaryUrl, { headers: xeroHeaders })
    const bankSummaryData = await bankSummaryResponse.json()
    console.log('bas-review: BankSummary status', bankSummaryResponse.status)
    console.log('bas-review: BankSummary raw', JSON.stringify(bankSummaryData).slice(0, 1000))

    const bankAccountResults: BankAccountResult[] = []

    // Parse BankSummary report rows
    // First get ALL unreconciled transactions so we can match by account name
    const unreconciledAllUrl = `https://api.xero.com/api.xro/2.0/BankTransactions?IsReconciled=false&fromDate=${periodStart}&toDate=${periodEnd}`
    const unreconciledAllResponse = await fetch(unreconciledAllUrl, { headers: xeroHeaders })
    const unreconciledAllData = await unreconciledAllResponse.json()
    const unreconciledAll: any[] = unreconciledAllData.BankTransactions || []

    // Build map of unreconciled count by account name
    const unreconciledByName = new Map<string, number>()
    for (const tx of unreconciledAll) {
      const name = tx.BankAccount?.Name || ''
      unreconciledByName.set(name, (unreconciledByName.get(name) || 0) + 1)
    }
    console.log('bas-review: unreconciled by account', JSON.stringify(Object.fromEntries(unreconciledByName)))

    // Skip rows that are totals/headers
    const skipNames = new Set(['total', 'account', '', 'bank accounts'])

    try {
      const report = bankSummaryData.Reports?.[0]
      const rows = report?.Rows || []
      for (const section of rows) {
        for (const row of section.Rows || []) {
          const cells = row.Cells || []
          if (cells.length >= 2) {
            const accountName = (cells[0]?.Value || '').trim()
            const nameLower = accountName.toLowerCase()
            
            // Skip total/header rows
            if (skipNames.has(nameLower) || nameLower.startsWith('total')) continue

            const closingBalance = parseFloat(
              (cells[cells.length - 1]?.Value || '0').replace(/[^0-9.-]/g, '') || '0'
            )

            const unreconciledItems = unreconciledByName.get(accountName) || 0

            bankAccountResults.push({
              accountId: '',
              accountName,
              accountCode: '',
              currencyCode: 'AUD',
              balance: closingBalance,
              isReconciled: unreconciledItems === 0,
              unreconciledItems,
              recommendation: unreconciledItems === 0
                ? `${accountName} reconciles as at ${periodEnd}. No action required.`
                : `${accountName} has ${unreconciledItems} unreconciled item(s) as at ${periodEnd}. BAS preparer to review and reconcile, or notify client if bookkeeping is not in scope.`,
            })
          }
        }
      }
    } catch (parseErr) {
      console.error('bas-review: BankSummary parse error', parseErr)
    }

    // Fallback: if BankSummary gave nothing, query unreconciled transactions directly
    // and group by bank account from the transaction data
    if (bankAccountResults.length === 0) {
      console.log('bas-review: BankSummary empty, falling back to transaction grouping')
      const unreconciledAllUrl = `https://api.xero.com/api.xro/2.0/BankTransactions?IsReconciled=false&fromDate=${periodStart}&toDate=${periodEnd}`
      const unreconciledAllResponse = await fetch(unreconciledAllUrl, { headers: xeroHeaders })
      const unreconciledAllData = await unreconciledAllResponse.json()
      const unreconciledAll = unreconciledAllData.BankTransactions || []
      console.log('bas-review: unreconciled transactions', unreconciledAll.length)

      // Group by bank account
      const accountMap = new Map<string, { name: string; count: number; id: string }>()
      for (const tx of unreconciledAll) {
        const id = tx.BankAccount?.AccountID || 'unknown'
        const name = tx.BankAccount?.Name || tx.BankAccount?.Code || 'Unknown Account'
        if (!accountMap.has(id)) accountMap.set(id, { name, count: 0, id })
        accountMap.get(id)!.count++
      }

      // Also get all bank transactions to find accounts that ARE reconciled
      const allTxUrl = `https://api.xero.com/api.xro/2.0/BankTransactions?fromDate=${periodStart}&toDate=${periodEnd}`
      const allTxResponse = await fetch(allTxUrl, { headers: xeroHeaders })
      const allTxData = await allTxResponse.json()
      const allTx = (allTxData.BankTransactions || []).filter((t: any) => t.Status !== 'DELETED' && t.Status !== 'VOIDED')

      const allAccountMap = new Map<string, { name: string; id: string }>()
      for (const tx of allTx) {
        const id = tx.BankAccount?.AccountID || 'unknown'
        const name = tx.BankAccount?.Name || tx.BankAccount?.Code || 'Unknown Account'
        if (!allAccountMap.has(id)) allAccountMap.set(id, { name, id })
      }

      for (const [id, acc] of allAccountMap) {
        const unreconciledCount = accountMap.get(id)?.count || 0
        bankAccountResults.push({
          accountId: id,
          accountName: acc.name,
          accountCode: '',
          currencyCode: 'AUD',
          balance: 0,
          isReconciled: unreconciledCount === 0,
          unreconciledItems: unreconciledCount,
          recommendation: unreconciledCount === 0
            ? `${acc.name} reconciles as at ${periodEnd}. No action required.`
            : `${acc.name} has ${unreconciledCount} unreconciled item(s) as at ${periodEnd}. BAS preparer to review and reconcile, or notify client if bookkeeping is not in scope.`,
        })
      }
    }

    // Remove duplicate placeholder if fallback also empty - add a note
    if (bankAccountResults.length === 0) {
      bankAccountResults.push({
        accountId: 'unavailable',
        accountName: 'Bank account data unavailable',
        accountCode: '',
        currencyCode: 'AUD',
        balance: 0,
        isReconciled: false,
        unreconciledItems: -1,
        recommendation: 'Unable to retrieve bank account reconciliation data from Xero. Manual check required for all bank accounts as at ' + periodEnd + '.',
      })
    }



    // ── CDR TRANSACTION REVIEW ───────────────────────────────────────────────
    let allTransactions: any[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const txUrl = `https://api.xero.com/api.xro/2.0/BankTransactions?page=${page}&fromDate=${periodStart}&toDate=${periodEnd}`
      const txResponse = await fetch(txUrl, { headers: xeroHeaders })
      const txData = await txResponse.json()
      const transactions = txData.BankTransactions || []
      allTransactions = [...allTransactions, ...transactions]
      if (transactions.length < 100) hasMore = false
      else page++
    }

    const cdrTransactions: CdrTransaction[] = []
    const activeTransactions = allTransactions.filter(
      (t: any) => t.Status !== 'DELETED' && t.Status !== 'VOIDED'
    )

    for (const tx of activeTransactions) {
      for (const line of tx.LineItems || []) {
        const { confidence, reason, flagged } = classifyGstConfidence(
          line.TaxType || 'NONE',
          line.LineAmount || 0,
          line.Description || '',
          line.AccountCode || ''
        )

        cdrTransactions.push({
          transactionId: tx.BankTransactionID,
          date: tx.Date,
          contact: tx.Contact?.Name || 'Unknown',
          description: line.Description || '',
          amount: line.LineAmount || 0,
          taxType: line.TaxType || 'NONE',
          accountCode: line.AccountCode || '',
          accountName: line.AccountName || '',
          confidence,
          confidenceReason: reason,
          flagged,
        })
      }
    }

    const confirmed = cdrTransactions.filter((t) => t.confidence === 'CONFIRMED').length
    const review = cdrTransactions.filter((t) => t.confidence === 'REVIEW').length
    const uncertain = cdrTransactions.filter((t) => t.confidence === 'UNCERTAIN').length
    const flaggedItems = cdrTransactions.filter((t) => t.flagged)
    const unreconciledAccounts = bankAccountResults.filter((a) => !a.isReconciled)

    // ── AI ANALYSIS ──────────────────────────────────────────────────────────
    let aiAnalysis = ''
    if (githubToken) {
      const bankSummary = unreconciledAccounts.length === 0
        ? 'All bank accounts reconcile as at period end.'
        : `${unreconciledAccounts.length} bank account(s) do not reconcile: ${unreconciledAccounts.map((a) => `${a.accountName} (${a.unreconciledItems} items)`).join(', ')}.`

      const cdrSummary = flaggedItems.length === 0
        ? 'No GST coding issues identified in CDR review.'
        : flaggedItems.slice(0, 20).map((t) => `${t.confidence}: ${t.contact} — ${t.confidenceReason}`).join('\n')

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
              content: `You are an expert Australian tax accountant reviewing a BAS (Business Activity Statement) for a CA firm.
You understand GST compliance, ATO requirements, and Australian accounting standards.
Provide a concise, professional analysis for the BAS preparer.
Focus on: compliance risk, priority actions, and what needs human review before lodgement.
Keep your response under 200 words. Be direct and use numbered action items.
Never guess — only flag what is evidenced.`,
            },
            {
              role: 'user',
              content: `BAS Period: ${periodLabel} (${periodStart} to ${periodEnd})

BANK RECONCILIATION:
${bankSummary}

CDR TRANSACTION REVIEW:
Reviewed: ${cdrTransactions.length} line items
CONFIRMED: ${confirmed} | REVIEW: ${review} | UNCERTAIN: ${uncertain}

FLAGGED ITEMS:
${cdrSummary}

Provide a brief professional analysis and priority action list for the BAS preparer.`,
            },
          ],
          max_tokens: 250,
          temperature: 0.2,
        }),
      })

      const aiData = await aiResponse.json()
      aiAnalysis = aiData.choices?.[0]?.message?.content || ''
    }

    // ── SAVE TO gst_reconciliations ──────────────────────────────────────────
    const gstRecPayload = {
      bas_period_id: bas_period_id || null,
      run_by: 'System',
      bank_accounts: bankAccountResults,
      cdr_issues: flaggedItems,
      gst_summary: {
        totalReviewed: cdrTransactions.length,
        confirmed,
        review,
        uncertain,
        unreconciledBankAccounts: unreconciledAccounts.length,
      },
      ai_analysis: aiAnalysis,
      status: 'completed',
    }

    const { data: gstRec } = await supabaseClient
      .from('gst_reconciliations')
      .insert(gstRecPayload)
      .select()
      .single()

    // ── AUDIT LOG ────────────────────────────────────────────────────────────
    await supabaseClient.from('automation_runs').insert({
      automation_type: 'BAS Review',
      run_by: 'System',
      status: 'completed',
      records_reviewed: cdrTransactions.length,
      issues_found: flaggedItems.length,
      completed_at: new Date().toISOString(),
      report_data: {
        periodLabel,
        periodStart,
        periodEnd,
        bankAccounts: bankAccountResults,
        cdrSummary: { confirmed, review, uncertain },
        flaggedCount: flaggedItems.length,
        gstRecId: gstRec?.id,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        periodLabel,
        periodStart,
        periodEnd,
        bankAccounts: bankAccountResults,
        cdrTransactions,
        flaggedItems,
        summary: {
          totalReviewed: cdrTransactions.length,
          confirmed,
          review,
          uncertain,
          unreconciledBankAccounts: unreconciledAccounts.length,
        },
        aiAnalysis,
        gstRecId: gstRec?.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
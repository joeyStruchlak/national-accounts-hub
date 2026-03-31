import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const clientId = Deno.env.get('XERO_CLIENT_ID')
    const clientSecret = Deno.env.get('XERO_CLIENT_SECRET')
    const tenantId = Deno.env.get('XERO_TENANT_ID')
    const githubToken = Deno.env.get('GITHUB_TOKEN')

    if (!clientId || !clientSecret || !tenantId) {
      throw new Error('Missing Xero credentials')
    }

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

    if (!accessToken) {
      throw new Error(`Failed to get Xero token: ${JSON.stringify(tokenData)}`)
    }

    // Get P&L report
    const plResponse = await fetch('https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        'Accept': 'application/json',
      }
    })
    const plData = await plResponse.json()

    // Get Balance Sheet
    const bsResponse = await fetch('https://api.xero.com/api.xro/2.0/Reports/BalanceSheet', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        'Accept': 'application/json',
      }
    })
    const bsData = await bsResponse.json()

    // Get invoices for revenue analysis
    const invoicesResponse = await fetch('https://api.xero.com/api.xro/2.0/Invoices?Statuses=AUTHORISED,PAID&page=1', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        'Accept': 'application/json',
      }
    })
    const invoicesData = await invoicesResponse.json()
    const invoices = invoicesData.Invoices || []

    // Get all bank transactions for expense analysis
    const txResponse = await fetch('https://api.xero.com/api.xro/2.0/BankTransactions?page=1', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        'Accept': 'application/json',
      }
    })
    const txData = await txResponse.json()
    const transactions = (txData.BankTransactions || []).filter((t: any) => t.Status !== 'DELETED' && t.Status !== 'VOIDED')

    // Extract P&L data
    const plReport = plData.Reports?.[0]
    const plRows = plReport?.Rows || []

    let totalRevenue = 0
    let totalExpenses = 0
    let grossProfit = 0
    let netProfit = 0

    const extractValue = (rows: any[], sectionTitle: string): number => {
      for (const row of rows) {
        if (row.Title?.toLowerCase().includes(sectionTitle.toLowerCase())) {
          for (const subRow of row.Rows || []) {
            if (subRow.RowType === 'SummaryRow') {
              const val = parseFloat(subRow.Cells?.[1]?.Value || '0')
              return isNaN(val) ? 0 : Math.abs(val)
            }
          }
        }
      }
      return 0
    }

    totalRevenue = extractValue(plRows, 'Income') || extractValue(plRows, 'Revenue') || extractValue(plRows, 'Trading Income')
    totalExpenses = extractValue(plRows, 'Expense') || extractValue(plRows, 'Operating Expenses')
    grossProfit = totalRevenue - totalExpenses
    netProfit = grossProfit

    // If P&L extraction fails fall back to invoice data
    if (totalRevenue === 0) {
      totalRevenue = invoices.reduce((sum: number, inv: any) => sum + (inv.Total || 0), 0)
      const paidRevenue = invoices.filter((inv: any) => inv.Status === 'PAID').reduce((sum: number, inv: any) => sum + (inv.Total || 0), 0)
      totalExpenses = transactions
        .filter((t: any) => t.Type === 'SPEND')
        .reduce((sum: number, t: any) => sum + Math.abs(t.Total || 0), 0)
      grossProfit = paidRevenue - totalExpenses
      netProfit = grossProfit
    }

    // Extract Balance Sheet data
    const bsReport = bsData.Reports?.[0]
    const bsRows = bsReport?.Rows || []

    let totalAssets = 0
    let totalLiabilities = 0
    let equity = 0

    for (const row of bsRows) {
      if (row.Title?.toLowerCase().includes('asset')) {
        for (const subRow of row.Rows || []) {
          if (subRow.RowType === 'SummaryRow') {
            totalAssets += Math.abs(parseFloat(subRow.Cells?.[1]?.Value || '0') || 0)
          }
        }
      }
      if (row.Title?.toLowerCase().includes('liabilit')) {
        for (const subRow of row.Rows || []) {
          if (subRow.RowType === 'SummaryRow') {
            totalLiabilities += Math.abs(parseFloat(subRow.Cells?.[1]?.Value || '0') || 0)
          }
        }
      }
      if (row.Title?.toLowerCase().includes('equity')) {
        for (const subRow of row.Rows || []) {
          if (subRow.RowType === 'SummaryRow') {
            equity += Math.abs(parseFloat(subRow.Cells?.[1]?.Value || '0') || 0)
          }
        }
      }
    }

    // Calculate key financial ratios
    const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100) : 0
    const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0
    const debtToEquity = equity > 0 ? (totalLiabilities / equity) : 0
    const currentRatio = totalLiabilities > 0 ? (totalAssets / totalLiabilities) : 0

    // Revenue breakdown by month
    const revenueByMonth: Record<string, number> = {}
    for (const inv of invoices) {
      if (inv.Date) {
        const month = inv.Date.substring(0, 7)
        revenueByMonth[month] = (revenueByMonth[month] || 0) + (inv.Total || 0)
      }
    }

    // Expense breakdown by category
    const expenseByCategory: Record<string, number> = {}
    for (const tx of transactions.filter((t: any) => t.Type === 'SPEND')) {
      for (const line of tx.LineItems || []) {
        const cat = line.AccountCode || 'Other'
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Math.abs(line.LineAmount || 0)
      }
    }

    // Issues and warnings
    const issues: any[] = []
    const warnings: any[] = []

    if (grossMargin < 20) {
      issues.push({
        contact: 'Gross Margin',
        issue: `Gross margin of ${grossMargin.toFixed(1)}% is below the healthy threshold of 20%`,
        recommendation: 'Review pricing strategy and cost of sales. Consider increasing fees or reducing direct costs.'
      })
    }

    if (netMargin < 10) {
      warnings.push({
        contact: 'Net Margin',
        issue: `Net margin of ${netMargin.toFixed(1)}% indicates tight profitability`,
        recommendation: 'Review operating expenses for reduction opportunities. Target net margin above 10%.'
      })
    }

    if (currentRatio < 1.5 && currentRatio > 0) {
      warnings.push({
        contact: 'Liquidity',
        issue: `Current ratio of ${currentRatio.toFixed(2)} suggests potential liquidity pressure`,
        recommendation: 'Improve debtor collection and manage creditor payment terms to strengthen cash position.'
      })
    }

    if (debtToEquity > 2 && debtToEquity > 0) {
      warnings.push({
        contact: 'Debt to Equity',
        issue: `Debt to equity ratio of ${debtToEquity.toFixed(2)} indicates high leverage`,
        recommendation: 'Consider debt reduction strategy or equity injection to improve financial stability.'
      })
    }

    // Outstanding invoices risk
    const overdueInvoices = invoices.filter((inv: any) =>
      inv.Status === 'AUTHORISED' && inv.AmountDue > 0 && new Date(inv.DueDate) < new Date()
    )
    if (overdueInvoices.length > 0) {
      const overdueTotal = overdueInvoices.reduce((s: number, i: any) => s + i.AmountDue, 0)
      warnings.push({
        contact: 'Debtors',
        issue: `${overdueInvoices.length} overdue invoices totalling $${overdueTotal.toFixed(2)}`,
        recommendation: 'Implement immediate debtor follow-up process. Consider engagement with debt collection for invoices over 90 days.'
      })
    }

    const totalReviewed = invoices.length + transactions.length
    const totalIssues = issues.length + warnings.length

    // AI Analysis
    let aiAnalysis = ''
    if (githubToken) {
      const summary = `
Financial Review Summary:
Total Revenue: $${totalRevenue.toFixed(2)}
Total Expenses: $${totalExpenses.toFixed(2)}
Gross Profit: $${grossProfit.toFixed(2)}
Net Profit: $${netProfit.toFixed(2)}
Gross Margin: ${grossMargin.toFixed(1)}%
Net Margin: ${netMargin.toFixed(1)}%
Total Assets: $${totalAssets.toFixed(2)}
Total Liabilities: $${totalLiabilities.toFixed(2)}
Equity: $${equity.toFixed(2)}
Current Ratio: ${currentRatio.toFixed(2)}
Debt to Equity: ${debtToEquity.toFixed(2)}
Overdue Invoices: ${overdueInvoices.length}
Total Invoices Reviewed: ${invoices.length}
Total Transactions Reviewed: ${transactions.length}

Issues: ${issues.length}
Warnings: ${warnings.length}
${issues.map((i: any) => `- CRITICAL: ${i.contact}: ${i.issue}`).join('\n')}
${warnings.map((w: any) => `- WARNING: ${w.contact}: ${w.issue}`).join('\n')}
      `.trim()

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
              content: `You are an expert Australian chartered accountant conducting a financial review for an accounting firm's client.
              You understand Australian accounting standards (AASB), financial ratios, profitability analysis, and business health indicators.
              Analyse the financial data and provide a professional yearly review summary suitable for partner sign-off.
              Focus on: profitability trends, liquidity position, financial health risks, and strategic recommendations.
              Keep response under 200 words. Be direct, professional and specific to Australian business context.`
            },
            {
              role: 'user',
              content: `Conduct a financial review based on this data:\n\n${summary}\n\nProvide a professional financial health assessment with priority actions for the partner review.`
            }
          ],
          max_tokens: 250,
          temperature: 0.3
        })
      })

      const aiData = await aiResponse.json()
      aiAnalysis = aiData.choices?.[0]?.message?.content || ''
    }

    // Save to Supabase Storage
    let storageFileUrl = ''
    try {
      const reportContent = `Financial Review Report
Generated: ${new Date().toLocaleDateString('en-AU')}
National Accounts Internal Portal

FINANCIAL SUMMARY
Total Revenue: $${totalRevenue.toFixed(2)}
Total Expenses: $${totalExpenses.toFixed(2)}
Gross Profit: $${grossProfit.toFixed(2)}
Net Profit: $${netProfit.toFixed(2)}
Gross Margin: ${grossMargin.toFixed(1)}%
Net Margin: ${netMargin.toFixed(1)}%

BALANCE SHEET
Total Assets: $${totalAssets.toFixed(2)}
Total Liabilities: $${totalLiabilities.toFixed(2)}
Equity: $${equity.toFixed(2)}

KEY RATIOS
Current Ratio: ${currentRatio.toFixed(2)}
Debt to Equity: ${debtToEquity.toFixed(2)}

ISSUES
${issues.map((i: any) => `- ${i.contact}: ${i.issue}\n  Action: ${i.recommendation}`).join('\n') || 'None'}

WARNINGS
${warnings.map((w: any) => `- ${w.contact}: ${w.issue}\n  Action: ${w.recommendation}`).join('\n') || 'None'}

AI ANALYSIS
${aiAnalysis}

Generated by National Accounts AI Automation Hub
Stored securely via Xero OAuth 2.0 | Australian data sovereignty maintained`

      const filename = `financial-review/${new Date().toISOString().split('T')[0]}_Financial_Review.txt`
      const { data: storageData, error: storageError } = await supabaseClient
        .storage
        .from('automation-reports')
        .upload(filename, reportContent, { contentType: 'text/plain', upsert: true })

      if (!storageError) storageFileUrl = storageData?.path || ''
    } catch (storageErr: any) {
      console.error('Storage save failed:', storageErr.message)
    }

    // Save to database
    const { data: run } = await supabaseClient
      .from('automation_runs')
      .insert({
        automation_type: 'Financial Review',
        run_by: 'System',
        status: 'completed',
        records_reviewed: totalReviewed,
        issues_found: totalIssues,
        completed_at: new Date().toISOString(),
        report_data: {
          totalRevenue, totalExpenses, grossProfit, netProfit,
          grossMargin, netMargin, totalAssets, totalLiabilities,
          equity, currentRatio, debtToEquity, issues, warnings, aiAnalysis, storageFileUrl
        }
      })
      .select()
      .single()

    return new Response(
      JSON.stringify({
        success: true,
        totalRevenue,
        totalExpenses,
        grossProfit,
        netProfit,
        grossMargin,
        netMargin,
        totalAssets,
        totalLiabilities,
        equity,
        currentRatio,
        debtToEquity,
        issues,
        warnings,
        aiAnalysis,
        totalReviewed,
        totalIssues,
        storageFileUrl,
        runId: run?.id
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
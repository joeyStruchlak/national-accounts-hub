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

    // Get all bank transactions
    let allTransactions: any[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const transactionsResponse = await fetch(`https://api.xero.com/api.xro/2.0/BankTransactions?page=${page}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Xero-Tenant-Id': tenantId,
          'Accept': 'application/json',
        }
      })

      const transactionsData = await transactionsResponse.json()
      const transactions = transactionsData.BankTransactions || []
      allTransactions = [...allTransactions, ...transactions]

      if (transactions.length < 100) {
        hasMore = false
      } else {
        page++
      }
    }

    // Run rules-based GST checks
    const issues: any[] = []
    const warnings: any[] = []

    for (const tx of allTransactions) {
      if (tx.Status === 'DELETED' || tx.Status === 'VOIDED') continue

      for (const line of tx.LineItems || []) {
        if (!line.Description || line.Description.trim() === '') {
          warnings.push({
            transactionId: tx.BankTransactionID,
            contact: tx.Contact?.Name || 'Unknown',
            date: tx.Date,
            amount: tx.Total,
            issue: 'Missing description',
            severity: 'warning',
            recommendation: 'Add a meaningful description for ATO audit trail'
          })
        }

        if (line.AccountCode === '505' && line.TaxType === 'EXEMPTEXPENSES') {
          issues.push({
            transactionId: tx.BankTransactionID,
            contact: tx.Contact?.Name || 'Unknown',
            date: tx.Date,
            amount: line.LineAmount,
            issue: 'PAYE tax coded to P&L (Acc. 505) instead of liability account (Acc. 825)',
            severity: 'critical',
            recommendation: 'Recode to Acc. 825 PAYG Withholding Payable. Partner sign-off required.'
          })
        }
      }
    }

    const totalReviewed = allTransactions.filter((t: any) => t.Status !== 'DELETED' && t.Status !== 'VOIDED').length
    const totalIssues = issues.length + warnings.length

    // AI Analysis layer using GitHub Models
    let aiAnalysis = ''
    if (githubToken && totalIssues > 0) {
      const flaggedSummary = [
        ...issues.map(i => `CRITICAL: ${i.contact} - ${i.issue}`),
        ...warnings.map(w => `WARNING: ${w.contact} - ${w.issue} (Amount: $${w.amount})`)
      ].join('\n')

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
              content: `You are an expert Australian tax accountant reviewing BAS (Business Activity Statement) transactions. 
              You understand GST compliance, ATO requirements, and Australian accounting standards.
              Provide a concise, professional analysis of flagged issues.
              Focus on: compliance risk, ATO audit exposure, and priority actions.
              Keep your response under 150 words. Be direct and actionable.`
            },
            {
              role: 'user',
              content: `I have reviewed ${totalReviewed} bank transactions and found the following issues:\n\n${flaggedSummary}\n\nProvide a brief professional analysis of these issues and their compliance risk for an Australian accounting firm.`
            }
          ],
          max_tokens: 200,
          temperature: 0.3
        })
      })

      const aiData = await aiResponse.json()
      aiAnalysis = aiData.choices?.[0]?.message?.content || ''
    }

    // Save to database
    const { data: run } = await supabaseClient
      .from('automation_runs')
      .insert({
        automation_type: 'BAS Review',
        run_by: 'System',
        status: 'completed',
        records_reviewed: totalReviewed,
        issues_found: totalIssues,
        completed_at: new Date().toISOString(),
        report_data: { issues, warnings, totalReviewed, totalIssues, aiAnalysis }
      })
      .select()
      .single()

    return new Response(
      JSON.stringify({
        success: true,
        totalReviewed,
        totalIssues,
        issues,
        warnings,
        aiAnalysis,
        runId: run?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
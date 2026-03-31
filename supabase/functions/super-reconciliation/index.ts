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
      const response = await fetch(`https://api.xero.com/api.xro/2.0/BankTransactions?page=${page}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Xero-Tenant-Id': tenantId,
          'Accept': 'application/json',
        }
      })
      const data = await response.json()
      const transactions = data.BankTransactions || []
      allTransactions = [...allTransactions, ...transactions]
      if (transactions.length < 100) hasMore = false
      else page++
    }

    // Get payroll transactions to estimate super liability
    const activeTransactions = allTransactions.filter((t: any) =>
      t.Status !== 'DELETED' && t.Status !== 'VOIDED'
    )

    // Find wages transactions (Acc 477)
    const wagesTransactions = activeTransactions.filter((t: any) =>
      t.LineItems?.some((l: any) => l.AccountCode === '477')
    )

    // Group wages by employee
    const employeeWages: Record<string, number> = {}
    for (const tx of wagesTransactions) {
      const name = tx.Contact?.Name || 'Unknown'
      for (const line of tx.LineItems || []) {
        if (line.AccountCode === '477') {
          employeeWages[name] = (employeeWages[name] || 0) + line.LineAmount
        }
      }
    }

    // Find super payment transactions (look for super fund payments)
    // Super is typically coded to account 820 or similar liability accounts
    const superTransactions = activeTransactions.filter((t: any) =>
      t.LineItems?.some((l: any) =>
        l.AccountCode === '820' ||
        l.AccountCode === '826' ||
        (l.Description && l.Description.toLowerCase().includes('super'))
      )
    )

    // Calculate super liability vs payments
    const SGC_RATE = 0.115 // 11.5% for FY2025-26
    const totalGrossWages = Object.values(employeeWages).reduce((s, v) => s + v, 0)
    const estimatedSuperLiability = totalGrossWages * SGC_RATE

    const totalSuperPaid = superTransactions.reduce((sum: number, tx: any) => {
      return sum + (tx.LineItems || []).reduce((s: number, l: any) => {
        if (l.AccountCode === '820' || l.AccountCode === '826' ||
          (l.Description && l.Description.toLowerCase().includes('super'))) {
          return s + Math.abs(l.LineAmount)
        }
        return s
      }, 0)
    }, 0)

    const superVariance = estimatedSuperLiability - totalSuperPaid
    const superCompliant = Math.abs(superVariance) < 100 // within $100 tolerance

    // Build issues and warnings
    const issues: any[] = []
    const warnings: any[] = []

    if (!superCompliant && superVariance > 0) {
      issues.push({
        contact: 'Super Guarantee',
        issue: `Super liability of $${estimatedSuperLiability.toFixed(2)} exceeds payments of $${totalSuperPaid.toFixed(2)}. Shortfall: $${superVariance.toFixed(2)}`,
        recommendation: `Remit $${superVariance.toFixed(2)} to employee super funds before quarterly due date to avoid SGC charge`
      })
    }

    // Check each employee's super
    for (const [name, wages] of Object.entries(employeeWages)) {
      const expectedSuper = wages * SGC_RATE
      if (expectedSuper > 0 && totalSuperPaid === 0) {
        warnings.push({
          contact: name,
          issue: `Expected super of $${expectedSuper.toFixed(2)} based on $${wages.toFixed(2)} gross wages - no super payments found`,
          recommendation: `Verify super fund details and ensure payment has been lodged for ${name}`
        })
      }
    }

    // Check for overdue super (quarterly due dates)
    const now = new Date()
    const quarterlyDueDates = [
      new Date(now.getFullYear(), 0, 28), // Q2 due Jan 28
      new Date(now.getFullYear(), 3, 28), // Q3 due Apr 28
      new Date(now.getFullYear(), 6, 28), // Q4 due Jul 28
      new Date(now.getFullYear(), 9, 28), // Q1 due Oct 28
    ]

    const nextDueDate = quarterlyDueDates.find(d => d > now) || quarterlyDueDates[0]
    const daysUntilDue = Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilDue <= 14 && !superCompliant) {
      warnings.push({
        contact: 'ATO Deadline',
        issue: `Super payment due in ${daysUntilDue} days (${nextDueDate.toLocaleDateString('en-AU')})`,
        recommendation: 'Urgent: Process super payments immediately to avoid SGC charge and ATO penalties'
      })
    }

    const employees = Object.entries(employeeWages).map(([name, wages]) => ({
      name,
      grossWages: wages,
      expectedSuper: wages * SGC_RATE,
    }))

    const totalReviewed = wagesTransactions.length + superTransactions.length
    const totalIssues = issues.length + warnings.length

    // AI Analysis
    let aiAnalysis = ''
    if (githubToken) {
      const summary = `
Super reconciliation summary for FY2025-26:
SGC rate: 11.5%
Total gross wages: $${totalGrossWages.toFixed(2)}
Estimated super liability: $${estimatedSuperLiability.toFixed(2)}
Super payments found: $${totalSuperPaid.toFixed(2)}
Variance: $${superVariance.toFixed(2)}
Super compliant: ${superCompliant ? 'YES' : 'NO'}
Next quarterly due date: ${nextDueDate.toLocaleDateString('en-AU')} (${daysUntilDue} days)

Employees:
${employees.map(e => `- ${e.name}: Gross $${e.grossWages.toFixed(0)}, Expected super $${e.expectedSuper.toFixed(0)}`).join('\n')}

${issues.length > 0 ? `Issues:\n${issues.map(i => `- ${i.contact}: ${i.issue}`).join('\n')}` : 'No critical issues.'}
${warnings.length > 0 ? `Warnings:\n${warnings.map(w => `- ${w.contact}: ${w.issue}`).join('\n')}` : 'No warnings.'}
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
              content: `You are an expert Australian superannuation compliance specialist reviewing super guarantee obligations.
              You understand SGC rates, quarterly due dates, ATO penalties for late payment, and super fund requirements.
              Analyse the super reconciliation data and provide professional insights.
              Focus on: SGC compliance, payment timeliness, shortfall risk, ATO penalty exposure.
              Keep response under 150 words. Be direct and professional.`
            },
            {
              role: 'user',
              content: `Review this super reconciliation:\n\n${summary}\n\nProvide a brief professional analysis with priority actions.`
            }
          ],
          max_tokens: 200,
          temperature: 0.3
        })
      })

      const aiData = await aiResponse.json()
      aiAnalysis = aiData.choices?.[0]?.message?.content || ''
    }

    // Save to Supabase Storage
    let storageFileUrl = ''
    try {
      const reportContent = `Super Reconciliation Report
Generated: ${new Date().toLocaleDateString('en-AU')}
National Accounts Internal Portal

SUMMARY
SGC Rate: 11.5%
Total Gross Wages: $${totalGrossWages.toFixed(2)}
Estimated Super Liability: $${estimatedSuperLiability.toFixed(2)}
Super Payments Found: $${totalSuperPaid.toFixed(2)}
Variance: $${superVariance.toFixed(2)}
Compliant: ${superCompliant ? 'YES' : 'NO'}
Next Due Date: ${nextDueDate.toLocaleDateString('en-AU')}

EMPLOYEES
${employees.map(e => `- ${e.name}: Gross $${e.grossWages.toFixed(0)}, Expected super $${e.expectedSuper.toFixed(0)}`).join('\n')}

ISSUES
${issues.map((i: any) => `- ${i.contact}: ${i.issue}`).join('\n') || 'None'}

WARNINGS  
${warnings.map((w: any) => `- ${w.contact}: ${w.issue}`).join('\n') || 'None'}

AI ANALYSIS
${aiAnalysis}

Generated by National Accounts AI Automation Hub`

      const filename = `super-reconciliation/${new Date().toISOString().split('T')[0]}_Super_Rec.txt`
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
        automation_type: 'Super Reconciliation',
        run_by: 'System',
        status: 'completed',
        records_reviewed: totalReviewed,
        issues_found: totalIssues,
        completed_at: new Date().toISOString(),
        report_data: { employees, issues, warnings, totalGrossWages, estimatedSuperLiability, totalSuperPaid, superVariance, superCompliant, aiAnalysis }
      })
      .select()
      .single()

    return new Response(
      JSON.stringify({
        success: true,
        employees,
        issues,
        warnings,
        totalGrossWages,
        estimatedSuperLiability,
        totalSuperPaid,
        superVariance,
        superCompliant,
        nextDueDate: nextDueDate.toLocaleDateString('en-AU'),
        daysUntilDue,
        totalReviewed,
        totalIssues,
        aiAnalysis,
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
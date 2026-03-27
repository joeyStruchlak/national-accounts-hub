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

    // Filter active payroll transactions
    const activeTransactions = allTransactions.filter((t: any) =>
      t.Status !== 'DELETED' && t.Status !== 'VOIDED'
    )

    // Find payroll transactions (account 477 = wages, 825 = PAYG)
    const payrollTransactions = activeTransactions.filter((t: any) =>
      t.LineItems?.some((l: any) => l.AccountCode === '477' || l.AccountCode === '825')
    )

    // Group by employee (contact)
    const employeeMap: Record<string, {
      name: string
      grossPay: number
      payg: number
      netPay: number
      payRuns: number
      voided: number
    }> = {}

    for (const tx of payrollTransactions) {
      const name = tx.Contact?.Name || 'Unknown'
      if (!employeeMap[name]) {
        employeeMap[name] = { name, grossPay: 0, payg: 0, netPay: 0, payRuns: 0, voided: 0 }
      }

      for (const line of tx.LineItems || []) {
        if (line.AccountCode === '477') {
          employeeMap[name].grossPay += line.LineAmount
          employeeMap[name].payRuns++
        }
        if (line.AccountCode === '825') {
          employeeMap[name].payg += Math.abs(line.LineAmount)
        }
      }
      employeeMap[name].netPay = employeeMap[name].grossPay - employeeMap[name].payg
    }

    // Check for voided payroll entries
    const voidedPayroll = allTransactions.filter((t: any) =>
      t.Status === 'VOIDED' &&
      t.LineItems?.some((l: any) => l.AccountCode === '477')
    )

    const employees = Object.values(employeeMap)
    const issues: any[] = []
    const warnings: any[] = []

    // Check for voided entries per employee
    for (const emp of employees) {
      const voidedForEmp = voidedPayroll.filter((t: any) =>
        t.Contact?.Name === emp.name
      )
      if (voidedForEmp.length > 0) {
        warnings.push({
          contact: emp.name,
          issue: `${voidedForEmp.length} voided payroll entries - confirm no double payment`,
          recommendation: `Verify bank statement shows only net pay of $${emp.netPay.toFixed(0)} per pay run for ${emp.name}`
        })
      }
    }

    // Check PAYG rates are reasonable (should be 20-35% of gross)
    for (const emp of employees) {
      if (emp.grossPay > 0) {
        const paygRate = (emp.payg / emp.grossPay) * 100
        if (paygRate < 15 || paygRate > 45) {
          issues.push({
            contact: emp.name,
            issue: `PAYG withholding rate of ${paygRate.toFixed(1)}% is outside normal range (15-45%)`,
            recommendation: `Review PAYG calculation for ${emp.name} - confirm correct tax table applied`
          })
        }
      }
    }

    // Estimate super liability (11.5% SGC rate FY2025-26)
    const totalGross = employees.reduce((s, e) => s + e.grossPay, 0)
    const estimatedSuper = totalGross * 0.115
    const totalPayg = employees.reduce((s, e) => s + e.payg, 0)

    const totalReviewed = payrollTransactions.length
    const totalIssues = issues.length + warnings.length

    // AI Analysis
    let aiAnalysis = ''
    if (githubToken) {
      const summary = `
Payroll reconciliation summary:
Employees found: ${employees.length}
Total gross wages paid: $${totalGross.toFixed(2)}
Total PAYG withheld: $${totalPayg.toFixed(2)}
Estimated super liability (11.5% SGC): $${estimatedSuper.toFixed(2)}
Voided payroll entries: ${voidedPayroll.length}
Issues found: ${issues.length}
Warnings: ${warnings.length}

Employee breakdown:
${employees.map(e => `- ${e.name}: Gross $${e.grossPay.toFixed(0)}, PAYG $${e.payg.toFixed(0)}, Net $${e.netPay.toFixed(0)}, Pay runs: ${e.payRuns}`).join('\n')}

${issues.length > 0 ? `Issues:\n${issues.map(i => `- ${i.contact}: ${i.issue}`).join('\n')}` : ''}
${warnings.length > 0 ? `Warnings:\n${warnings.map(w => `- ${w.contact}: ${w.issue}`).join('\n')}` : ''}
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
              content: `You are an expert Australian payroll accountant reviewing payroll reconciliation data.
              You understand Australian payroll law, PAYG withholding, superannuation guarantee (SGC), and ATO requirements.
              Analyse the payroll data and provide professional insights for the accounting partners.
              Focus on: PAYG compliance, super guarantee obligations, payroll accuracy, and any risks.
              Keep response under 150 words. Be direct and professional.`
            },
            {
              role: 'user',
              content: `Review this payroll reconciliation:\n\n${summary}\n\nProvide a brief professional analysis with priority actions.`
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
        automation_type: 'Payroll Reconciliation',
        run_by: 'System',
        status: 'completed',
        records_reviewed: totalReviewed,
        issues_found: totalIssues,
        completed_at: new Date().toISOString(),
        report_data: { employees, issues, warnings, totalGross, totalPayg, estimatedSuper, aiAnalysis }
      })
      .select()
      .single()

    return new Response(
      JSON.stringify({
        success: true,
        employees,
        issues,
        warnings,
        totalGross,
        totalPayg,
        estimatedSuper,
        totalReviewed,
        totalIssues,
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
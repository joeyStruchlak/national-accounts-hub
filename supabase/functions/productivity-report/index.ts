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

    // Get invoices
    const invoicesResponse = await fetch('https://api.xero.com/api.xro/2.0/Invoices?Statuses=AUTHORISED,PAID&page=1', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        'Accept': 'application/json',
      }
    })
    const invoicesData = await invoicesResponse.json()
    const invoices = invoicesData.Invoices || []

    // Get P&L report
    const plResponse = await fetch('https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        'Accept': 'application/json',
      }
    })
    const plData = await plResponse.json()

    // Analyse invoices
    const totalInvoiced = invoices.reduce((sum: number, inv: any) => sum + (inv.Total || 0), 0)
    const totalPaid = invoices.filter((inv: any) => inv.Status === 'PAID').reduce((sum: number, inv: any) => sum + (inv.Total || 0), 0)
    const outstanding = invoices.filter((inv: any) => inv.Status === 'AUTHORISED' && inv.AmountDue > 0)
    const overdue = outstanding.filter((inv: any) => new Date(inv.DueDate) < new Date())

    const overdueClients = overdue.map((inv: any) => ({
      client: inv.Contact?.Name || 'Unknown',
      amount: inv.AmountDue,
      daysOverdue: Math.floor((new Date().getTime() - new Date(inv.DueDate).getTime()) / (1000 * 60 * 60 * 24))
    }))

    const flags = []
    if (overdue.length > 0) {
      flags.push({
        type: 'overdue',
        count: overdue.length,
        detail: `${overdue.length} invoices overdue totalling $${overdue.reduce((s: number, i: any) => s + i.AmountDue, 0).toFixed(2)}`
      })
    }

    const totalOutstanding = outstanding.reduce((sum: number, inv: any) => sum + (inv.AmountDue || 0), 0)

    // AI Analysis
    let aiAnalysis = ''
    if (githubToken) {
      const summary = `
Total invoiced this period: $${totalInvoiced.toFixed(2)}
Total collected: $${totalPaid.toFixed(2)}
Outstanding: $${totalOutstanding.toFixed(2)}
Overdue invoices: ${overdue.length}
${overdueClients.slice(0, 3).map((c: any) => `- ${c.client}: $${c.amount} (${c.daysOverdue} days overdue)`).join('\n')}
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
              content: `You are an expert Australian accounting firm practice manager reviewing weekly productivity and financial performance.
              Analyse the data and provide actionable insights for the partners.
              Focus on: cash flow health, collection efficiency, overdue risk, and recommended actions.
              Keep response under 150 words. Be direct and professional.`
            },
            {
              role: 'user',
              content: `Weekly productivity report data:\n\n${summary}\n\nProvide a brief professional analysis with priority actions for the partners.`
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
        automation_type: 'Weekly Productivity Report',
        run_by: 'System',
        status: 'completed',
        records_reviewed: invoices.length,
        issues_found: flags.length,
        completed_at: new Date().toISOString(),
        report_data: {
          totalInvoiced,
          totalPaid,
          totalOutstanding,
          overdueCount: overdue.length,
          overdueClients,
          flags,
          aiAnalysis
        }
      })
      .select()
      .single()

    return new Response(
      JSON.stringify({
        success: true,
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        overdueCount: overdue.length,
        overdueClients,
        flags,
        aiAnalysis,
        recordsReviewed: invoices.length,
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
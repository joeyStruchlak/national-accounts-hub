import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BillingTrigger {
  client_name: string
  job_type: string
  preparer: string
  billing_type: 'retainer' | 'completion'
  xpm_job_id?: string
  amount?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('billing-notification: invoked')

    let triggers: BillingTrigger[] = []
    let mode: 'scan' | 'manual' = 'scan'

    try {
      const text = await req.text()
      if (text && text.trim() !== '') {
        const body = JSON.parse(text)
        if (body.triggers) { triggers = body.triggers; mode = 'manual' }
      }
    } catch (e) {
      console.error('billing-notification: body parse error', e)
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const githubToken = Deno.env.get('GITHUB_TOKEN')

    // ── SCAN MODE: pull jobs from Supabase that are Sent and completion-billed ──
    if (mode === 'scan') {
      const { data: jobs } = await supabaseClient
        .from('jobs')
        .select('*')
        .eq('stage', 'Sent')

      const { data: existing } = await supabaseClient
        .from('billing_notifications')
        .select('xpm_job_id')
        .not('xpm_job_id', 'is', null)

      const alreadyNotified = new Set((existing || []).map((r: any) => r.xpm_job_id))

      for (const job of jobs || []) {
        if (alreadyNotified.has(String(job.id))) continue
        // Only completion billing — retainer clients don't need invoice notifications
        const billingType = job.billing_type || 'completion'
        if (billingType === 'retainer') continue

        triggers.push({
          client_name: job.client_name || 'Unknown Client',
          job_type: job.job_type || 'ITR',
          preparer: job.assigned_to || 'Unassigned',
          billing_type: 'completion',
          xpm_job_id: String(job.id),
          amount: job.fee || job.amount || undefined,
        })
      }
    }

    console.log('billing-notification: triggers found', triggers.length)

    if (triggers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          notified: 0,
          message: 'No completion-billed ITRs with Sent status pending notification.',
          notifications: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── PROCESS EACH TRIGGER ──────────────────────────────────────────────────
    const notifications: any[] = []

    for (const trigger of triggers) {
      // AI-generate the notification message
      let notificationMessage = `BILLING ALERT — ${trigger.client_name}\n\nJob: ${trigger.job_type}\nPreparer: @${trigger.preparer}\nBilling: Completion\n\nAction required: Please prepare and send invoice to ${trigger.client_name} for ${trigger.job_type} now marked as Sent.`

      if (githubToken) {
        try {
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
                  content: `You are an assistant for an Australian CA firm billing system.
Write a concise, professional billing channel notification.
Format: plain text, 3-4 lines max.
Always tag the preparer with @name.
Never guess amounts — only include if provided.
Tone: direct and action-oriented.`,
                },
                {
                  role: 'user',
                  content: `Generate a billing notification for:
Client: ${trigger.client_name}
Job: ${trigger.job_type}
Preparer: ${trigger.preparer}
Billing type: Completion (not retainer)
Status: ITR marked as Sent
${trigger.amount ? `Fee: $${trigger.amount}` : ''}

Tag the preparer and instruct them to prepare and send the invoice.`,
                },
              ],
              max_tokens: 100,
              temperature: 0.2,
            }),
          })
          const aiData = await aiResponse.json()
          const aiMsg = aiData.choices?.[0]?.message?.content
          if (aiMsg) notificationMessage = aiMsg
        } catch (e) {
          console.error('billing-notification: AI error', e)
        }
      }

      // ── SEND EMAIL VIA RESEND ──────────────────────────────────────────
      const resendKey = Deno.env.get('RESEND_API_KEY')
      let emailSent = false
      let emailError = ''

      if (resendKey) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'National Accounts Portal <onboarding@resend.dev>',
              to: ['josefpro21@gmail.com'],
              subject: `Billing Alert — ${trigger.client_name} ${trigger.job_type} marked as Sent`,
              text: notificationMessage,
              html: '<div style="font-family:sans-serif;max-width:600px"><div style="background:#2a3a5a;color:white;padding:16px 24px"><h2 style="margin:0;font-size:16px">Billing Notification — National Accounts</h2></div><div style="border:1px solid #e5e7eb;padding:24px"><p style="font-size:14px;color:#374151">' + notificationMessage.split('\n').join('<br>') + '</p><hr style="border-top:1px solid #e5e7eb;margin:16px 0"><p style="font-size:12px;color:#9ca3af">Sent by National Accounts Internal Portal · ' + new Date().toLocaleDateString('en-AU') + '</p></div></div>',
            }),
          })
          const emailData = await emailResponse.json()
          emailSent = emailResponse.ok
          if (!emailResponse.ok) emailError = JSON.stringify(emailData)
          console.log('billing-notification: email sent', emailSent, emailError || 'ok')
        } catch (e: any) {
          emailError = e.message
          console.error('billing-notification: email error', e.message)
        }
      } else {
        console.log('billing-notification: RESEND_API_KEY not set — email skipped')
        emailError = 'RESEND_API_KEY not configured'
      }

      // Save to billing_notifications table
      const { data: saved } = await supabaseClient
        .from('billing_notifications')
        .insert({
          client_name: trigger.client_name,
          job_type: trigger.job_type,
          preparer: trigger.preparer,
          billing_type: trigger.billing_type,
          notified_at: new Date().toISOString(),
          notification_channel: emailSent ? 'email:billing@nationalaccounts.com.au' : 'db_only',
          invoiced: false,
          xpm_job_id: trigger.xpm_job_id || null,
        })
        .select()
        .single()

      notifications.push({
        id: saved?.id,
        client_name: trigger.client_name,
        job_type: trigger.job_type,
        preparer: trigger.preparer,
        billing_type: trigger.billing_type,
        xpm_job_id: trigger.xpm_job_id,
        message: notificationMessage,
        notified_at: new Date().toISOString(),
        emailSent,
        emailError: emailError || undefined,
      })
    }

    // Audit log
    await supabaseClient.from('automation_runs').insert({
      automation_type: 'Billing Notification',
      run_by: 'System',
      status: 'completed',
      records_reviewed: triggers.length,
      issues_found: notifications.length,
      completed_at: new Date().toISOString(),
      report_data: {
        mode,
        triggered: triggers.length,
        notified: notifications.length,
        clients: notifications.map(n => n.client_name),
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        notified: notifications.length,
        message: `${notifications.length} billing notification(s) sent to billing channel.`,
        notifications,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('billing-notification: error', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
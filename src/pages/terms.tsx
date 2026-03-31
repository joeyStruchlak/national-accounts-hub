import { Shield, Lock, Server, Eye, FileText, AlertTriangle } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary px-8 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">National Accounts Internal Portal</h1>
          <p className="text-white/60 text-sm">Terms of Service & Privacy Policy</p>
        </div>
        <a href="/" className="text-accent text-sm underline">← Back to Portal</a>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-primary mb-2">Terms of Service & Privacy Policy</h2>
          <p className="text-muted-foreground text-sm">Last updated: 28 March 2026 · National Accounts Pty Ltd · Adelaide SA 5000</p>
        </div>

        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-primary">1. About This Portal</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The National Accounts Internal Portal ("the Portal") is a proprietary internal tool operated by National Accounts Pty Ltd. Access is restricted exclusively to authorised National Accounts staff members. The Portal provides AI-assisted automation for accounting workflows including BAS review, payroll reconciliation, superannuation compliance, and productivity reporting.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-primary">2. Xero Data Access & Third Party Services</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              This Portal connects to Xero's API via OAuth 2.0 to access accounting data on behalf of National Accounts Pty Ltd. By using this Portal you acknowledge and agree that:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>Xero accounting data is accessed only for the purpose of generating compliance reports and automating internal accounting workflows</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>Data is never sold, shared, or disclosed to third parties outside of National Accounts Pty Ltd</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>AI analysis is performed using GPT-4o-mini via GitHub Models API (Microsoft Azure infrastructure)</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>All AI outputs are advisory only and must be reviewed by a qualified accountant before acting</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>Xero credentials are stored as encrypted environment secrets and never exposed in source code</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-primary">3. Authentication & Access Control</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Access to this Portal requires authentication via Google OAuth 2.0 (Sign in with Google). This means:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>No passwords are stored by National Accounts or this Portal</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>Authentication is handled entirely by Google's secure infrastructure</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>Google's 2-factor authentication policies apply to all users</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>All login events are logged in the audit trail with timestamp and user identity</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>Access may be revoked at any time by the Portal administrator</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Server className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-primary">4. Data Storage & Australian Sovereignty</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              All data processed and stored by this Portal remains within Australian jurisdiction:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>Database and storage hosted on Supabase (Sydney, ap-southeast-2 region)</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>All data encrypted at rest using AES-256</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>All data encrypted in transit via TLS 1.2+</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>Automation reports archived in Supabase Storage (Sydney region)</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>Row-level security (RLS) enforced on all database tables</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>No client data is stored on local machines or exported outside approved systems</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-primary">5. Audit Logging & Monitoring</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              This Portal maintains comprehensive audit logs in compliance with Xero's security requirements:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>Every automation run is logged with timestamp, user identity, records reviewed, and issues found</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>All Xero API calls are logged and traceable</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>Security events are monitored via Supabase dashboard</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>Audit logs are retained for a minimum of 7 years in accordance with Australian tax law</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold shrink-0">•</span>Suspicious activity triggers automated alerts to the Portal administrator</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-primary">6. AI Advisory Disclaimer</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-generated reports and analysis provided by this Portal are advisory only. They are intended to assist qualified accounting professionals in identifying potential issues and do not constitute legal, tax, or financial advice. All AI outputs must be reviewed and approved by a registered tax agent or qualified accountant before being acted upon or communicated to clients. National Accounts Pty Ltd accepts no liability for decisions made solely on the basis of AI-generated content.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-primary">7. Xero Security Compliance</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              This Portal is designed to comply with Xero's API Consumer Security Standards:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { req: "Requirement 1", desc: "OAuth 2.0 authentication", status: "✅ Compliant" },
                { req: "Requirement 2", desc: "TLS 1.2+ encryption", status: "✅ Compliant" },
                { req: "Requirement 3", desc: "2FA/SSO login", status: "✅ Compliant (Google SSO)" },
                { req: "Requirement 4", desc: "Third party data policy", status: "✅ This document" },
                { req: "Requirement 5", desc: "Server hardening", status: "✅ Supabase managed" },
                { req: "Requirement 6", desc: "OWASP compliance", status: "✅ Compliant" },
                { req: "Requirement 7", desc: "Encryption at rest", status: "✅ AES-256" },
                { req: "Requirement 8", desc: "Audit logging", status: "✅ Full audit trail" },
                { req: "Requirement 9", desc: "Australian data hosting", status: "✅ Sydney region" },
                { req: "Requirement 10", desc: "Security monitoring", status: "✅ Supabase dashboard" },
              ].map((item) => (
                <div key={item.req} className="rounded border border-border p-2">
                  <p className="text-[11px] font-semibold text-primary">{item.req}: {item.desc}</p>
                  <p className="text-[11px] text-accent font-medium">{item.status}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">
              <strong className="text-primary">Contact:</strong> For questions about this policy or to report a security concern, contact the Portal administrator at{" "}
              <a href="mailto:jstruchlak@gmail.com" className="text-primary underline">jstruchlak@gmail.com</a>
              {" "}or National Accounts Pty Ltd at Level 2, 70 Hindmarsh Square, Adelaide SA 5000.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
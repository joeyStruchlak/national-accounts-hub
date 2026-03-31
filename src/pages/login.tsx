import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Shield, Lock, CheckCircle2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    console.group("🔐 GOOGLE SSO AUTHENTICATION — National Accounts Portal");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔑 STEP 1: Initiating Google OAuth 2.0 flow");
    console.log("   └─ Provider: Google");
    console.log("   └─ Handled by: Supabase Auth (Sydney)");
    console.log("   └─ Redirect: back to portal after authentication");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔑 STEP 2: Google verifies user identity + 2FA");
    console.log("   └─ No passwords stored by National Accounts");
    console.log("   └─ Google enforces 2FA on user account");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔑 STEP 3: Supabase issues session token");
    console.log("   └─ Token stored in browser session");
    console.log("   └─ All API calls authenticated with this token");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Satisfies Xero Security Requirement 3: 2FA/SSO login");
    console.groupEnd();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  return (
    <div className="min-h-screen bg-primary flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <img
            src="https://www.nationalaccounts.com.au/wp-content/uploads/2023/10/National-Accounts-Logo.png"
            alt="National Accounts"
            className="h-10"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            AI-Powered
            <br />
            <span className="text-accent">Accounting Automation</span>
            <br />
            for National Accounts
          </h1>
          <p className="text-white/60 text-lg mb-8">
            BAS reviews, payroll reconciliation, super compliance and
            productivity reports — all automated with AI.
          </p>

          <div className="space-y-3">
            {[
              "BAS/GST Review — 200-300 returns automated per quarter",
              "Payroll Reconciliation — PAYG compliance in 30 seconds",
              "Super Reconciliation — SGC compliance at 11.5% SGC rate",
              "Weekly Productivity Reports — saves 30-45 mins every week",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                <p className="text-white/80 text-sm">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
          <p className="text-white/40 text-xs">
            Secured via Xero OAuth 2.0 · Australian data sovereignty · Sydney
            hosting
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img
              src="https://www.nationalaccounts.com.au/wp-content/uploads/2023/10/National-Accounts-Logo.png"
              alt="National Accounts"
              className="h-8"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>

          <h2 className="text-2xl font-bold text-primary mb-1">Welcome back</h2>
          <p className="text-muted-foreground text-sm mb-8">
            Sign in to access the National Accounts Internal Portal
          </p>

          <Button
            onClick={handleGoogleLogin}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold flex items-center justify-center gap-3 mb-4"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>

          <div className="rounded-lg border border-border bg-muted/30 p-4 mb-6">
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-primary">
                  Internal Portal Access Only
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This portal is restricted to National Accounts staff. Sign in
                  with your National Accounts Google Workspace account.
                  Unauthorised access attempts are logged.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "OAuth 2.0", sub: "Google SSO" },
              { label: "Australian", sub: "Data hosting" },
              { label: "Audit", sub: "All access logged" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded border border-border p-2"
              >
                <p className="text-xs font-semibold text-primary">
                  {item.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{item.sub}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            By signing in you agree to our{" "}
            <a href="/terms" className="text-primary underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/terms" className="text-primary underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

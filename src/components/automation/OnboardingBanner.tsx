import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

interface OnboardingBannerProps {
  onConnect: () => void;
}

export function OnboardingBanner({ onConnect }: OnboardingBannerProps) {
  return (
    <div className="mb-8 rounded-md border border-accent/30 bg-accent/5 p-6 flex items-center gap-5">
      <div className="rounded-lg p-3 bg-accent/10 border border-accent/20">
        <Zap className="h-7 w-7 text-accent" strokeWidth={1.5} />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-bold text-primary font-display">Get Started with AI Automation</h3>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Connect your Xero account to begin. Once connected your team can run automated BAS reviews,
          payroll reconciliations and productivity reports in seconds.
        </p>
      </div>
      <Button className="gradient-green text-accent-foreground font-semibold h-11 px-6 shrink-0">
        Connect Xero
      </Button>
    </div>
  );
}

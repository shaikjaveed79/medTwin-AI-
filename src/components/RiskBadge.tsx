import { cn } from "@/lib/utils";

const riskConfig = {
  low: { label: "Low Risk", className: "bg-success/10 text-success border-success/20", color: "hsl(var(--success))", bgColor: "bg-success", score: 25 },
  moderate: { label: "Moderate Risk", className: "bg-warning/10 text-warning border-warning/20", color: "hsl(var(--warning))", bgColor: "bg-warning", score: 50 },
  high: { label: "High Risk", className: "bg-risk-high/10 text-risk-high border-risk-high/20", color: "hsl(var(--risk-high))", bgColor: "bg-risk-high", score: 75 },
  critical: { label: "Critical", className: "bg-critical/10 text-critical border-critical/20 animate-pulse-soft", color: "hsl(var(--critical))", bgColor: "bg-critical", score: 100 },
};

export function RiskBadge({ level }: { level: string }) {
  const config = riskConfig[level as keyof typeof riskConfig] ?? riskConfig.low;
  return (
    <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border", config.className)}>
      {config.label}
    </span>
  );
}

export function RiskScoreBar({ level, score }: { level: string; score?: number }) {
  const config = riskConfig[level as keyof typeof riskConfig] ?? riskConfig.low;
  const displayScore = score ?? config.score;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Risk Score</span>
        <span className={cn("text-xs font-bold", config.className.split(" ").find(c => c.startsWith("text-")))}>{displayScore}/100</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", config.bgColor)}
          style={{ width: `${displayScore}%` }}
        />
      </div>
    </div>
  );
}

export function RiskScoreGauge({ level, score }: { level: string; score?: number }) {
  const config = riskConfig[level as keyof typeof riskConfig] ?? riskConfig.low;
  const displayScore = score ?? config.score;
  const size = 100;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (displayScore / 100) * circumference;
  const dashOffset = circumference - progress;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={config.color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-display" style={{ color: config.color }}>{displayScore}</span>
        <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Risk</span>
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthScoreGauge } from "@/components/HealthScoreGauge";
import { TrendingUp, TrendingDown, Minus, Activity, AlertCircle, BarChart3 } from "lucide-react";
import type { TwinState } from "@/hooks/useTwinState";

interface TwinDashboardProps {
  twinState: TwinState;
  loading?: boolean;
}

const trendConfig = {
  improving: { icon: TrendingUp, label: "Improving", color: "text-success", bg: "bg-success/10" },
  stable: { icon: Minus, label: "Stable", color: "text-info", bg: "bg-info/10" },
  worsening: { icon: TrendingDown, label: "Worsening", color: "text-critical", bg: "bg-critical/10" },
};

export function TwinDashboard({ twinState, loading }: TwinDashboardProps) {
  if (loading) {
    return (
      <Card className="glass-card animate-pulse">
        <CardContent className="p-6 h-48" />
      </Card>
    );
  }

  const trend = trendConfig[twinState.trend as keyof typeof trendConfig] || trendConfig.stable;
  const TrendIcon = trend.icon;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" /> Digital Twin Intelligence
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Health Score */}
        <Card className="glass-card col-span-2 md:col-span-1">
          <CardContent className="p-4 flex flex-col items-center">
            <HealthScoreGauge score={twinState.health_score} size={100} strokeWidth={8} />
            <p className="text-xs text-muted-foreground mt-1">Overall Score</p>
          </CardContent>
        </Card>

        {/* Trend */}
        <Card className="glass-card">
          <CardContent className="p-4 flex flex-col items-center justify-center h-full gap-2">
            <div className={`h-10 w-10 rounded-xl ${trend.bg} flex items-center justify-center`}>
              <TrendIcon className={`h-5 w-5 ${trend.color}`} />
            </div>
            <p className={`text-sm font-semibold ${trend.color}`}>{trend.label}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Trend</p>
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card className="glass-card">
          <CardContent className="p-4 flex flex-col items-center justify-center h-full gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold font-display">{twinState.session_count}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sessions</p>
          </CardContent>
        </Card>

        {/* Risk Baseline */}
        <Card className="glass-card">
          <CardContent className="p-4 flex flex-col items-center justify-center h-full gap-2">
            <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
            <Badge variant={twinState.risk_baseline === "high" ? "destructive" : twinState.risk_baseline === "moderate" ? "secondary" : "outline"} className="capitalize">
              {twinState.risk_baseline}
            </Badge>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Baseline Risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Recurring Issues */}
      {(twinState.recurring_symptoms.length > 0 || twinState.recurring_conditions.length > 0) && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Recurring Issues Detected</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {twinState.recurring_symptoms.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Symptoms</p>
                <div className="flex flex-wrap gap-1.5">
                  {twinState.recurring_symptoms.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs border-warning/30 text-warning">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {twinState.recurring_conditions.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Conditions</p>
                <div className="flex flex-wrap gap-1.5">
                  {twinState.recurring_conditions.map((c) => (
                    <Badge key={c} variant="outline" className="text-xs border-critical/30 text-critical">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

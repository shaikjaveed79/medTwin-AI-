import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { AuthPage } from "@/pages/AuthPage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTreatmentSimulations, LifestyleInputs, SimulationResult } from "@/hooks/useTreatmentSimulations";
import { useMedications } from "@/hooks/useMedications";
import { Activity, TrendingUp, TrendingDown, Minus, Sparkles, Target, AlertTriangle, Trash2, FlaskConical, Pill } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

const CONDITIONS = [
  "Type 2 Diabetes",
  "Type 1 Diabetes",
  "Hypertension",
  "Heart Disease",
  "High Cholesterol",
  "Obesity",
  "Chronic Kidney Disease",
  "Fatty Liver Disease",
];

const trendIcons = { improving: TrendingUp, worsening: TrendingDown, stable: Minus };
const trendColors = { improving: "text-success", worsening: "text-critical", stable: "text-info" };

export default function SimulatorPage() {
  const { user, loading: authLoading } = useAuth();
  const { simulations, running, runSimulation, deleteSimulation } = useTreatmentSimulations();
  const { medications, adherenceRate, logs } = useMedications();

  const [condition, setCondition] = useState(CONDITIONS[0]);
  const [lifestyle, setLifestyle] = useState<LifestyleInputs>({
    diet_quality: 5,
    exercise_minutes_per_week: 90,
    medication_adherence: 80,
    sleep_hours: 7,
    stress_level: 5,
    smoking: false,
    alcohol_drinks_per_week: 2,
  });
  const [result, setResult] = useState<SimulationResult | null>(null);

  if (authLoading) return null;
  if (!user) return <AuthPage />;

  const handleRun = async () => {
    const activeMeds = medications.filter((m) => m.active).map((m) => ({
      name: m.name,
      dosage: m.dosage,
      times_per_day: m.times_per_day,
      start_date: m.start_date,
      purpose: m.purpose,
    }));
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = logs.filter((l) => new Date(l.scheduled_for) >= sevenDaysAgo);
    const taken = recent.filter((l) => l.status === "taken").length;
    const adherence_summary = recent.length
      ? { taken, total: recent.length, rate: Math.round((taken / recent.length) * 100) }
      : null;

    const { data, error } = await runSimulation(condition, lifestyle, undefined, activeMeds, adherence_summary);
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      setResult(data);
      toast.success("Simulation complete");
    }
  };

  const chartData = result?.projections.map((p) => ({
    month: `M${p.month}`,
    risk: p.risk_score,
    ...p.metrics,
  })) || [];

  const TrendIcon = result ? trendIcons[result.insights.trajectory] : Minus;
  const trendColor = result ? trendColors[result.insights.trajectory] : "";

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" /> Treatment Simulator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            See how lifestyle changes might affect your chronic condition over 12 months.
          </p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Simulation Inputs</CardTitle>
            <CardDescription>Adjust these to model "what if" scenarios.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {medications.filter((m) => m.active).length > 0 && (
              <div className="rounded-lg border bg-secondary/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <Pill className="h-3.5 w-3.5 text-primary" />
                    Current medications (factored in)
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    Real adherence: {adherenceRate}%
                  </span>
                </div>
                <ul className="space-y-1">
                  {medications.filter((m) => m.active).map((m) => {
                    const days = Math.max(0, Math.round((Date.now() - new Date(m.start_date).getTime()) / 86400000));
                    return (
                      <li key={m.id} className="text-xs text-muted-foreground flex items-center justify-between gap-2">
                        <span className="truncate">
                          <span className="font-medium text-foreground">{m.name}</span>
                          {m.dosage ? ` · ${m.dosage}` : ""} · {m.times_per_day}×/day
                        </span>
                        <span className="text-[10px] shrink-0">{days}d on this med</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <SliderField
              label="Diet quality"
              value={lifestyle.diet_quality}
              onChange={(v) => setLifestyle({ ...lifestyle, diet_quality: v })}
              min={1} max={10} step={1}
              hint={`${lifestyle.diet_quality}/10`}
            />
            <SliderField
              label="Exercise (min/week)"
              value={lifestyle.exercise_minutes_per_week}
              onChange={(v) => setLifestyle({ ...lifestyle, exercise_minutes_per_week: v })}
              min={0} max={420} step={15}
              hint={`${lifestyle.exercise_minutes_per_week} min`}
            />
            <SliderField
              label="Medication adherence"
              value={lifestyle.medication_adherence}
              onChange={(v) => setLifestyle({ ...lifestyle, medication_adherence: v })}
              min={0} max={100} step={5}
              hint={`${lifestyle.medication_adherence}%`}
            />
            <SliderField
              label="Sleep (hours/night)"
              value={lifestyle.sleep_hours}
              onChange={(v) => setLifestyle({ ...lifestyle, sleep_hours: v })}
              min={3} max={12} step={1}
              hint={`${lifestyle.sleep_hours} hrs`}
            />
            <SliderField
              label="Stress level"
              value={lifestyle.stress_level}
              onChange={(v) => setLifestyle({ ...lifestyle, stress_level: v })}
              min={1} max={10} step={1}
              hint={`${lifestyle.stress_level}/10`}
            />
            <div className="space-y-2">
              <Label>Alcohol (drinks/week)</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={lifestyle.alcohol_drinks_per_week}
                onChange={(e) => setLifestyle({ ...lifestyle, alcohol_drinks_per_week: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="smoking">Smoker</Label>
              <Switch
                id="smoking"
                checked={lifestyle.smoking}
                onCheckedChange={(v) => setLifestyle({ ...lifestyle, smoking: v })}
              />
            </div>

            <Button variant="hero" className="w-full gap-2" onClick={handleRun} disabled={running}>
              <Sparkles className="h-4 w-4" />
              {running ? "Simulating..." : "Run Simulation"}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="shadow-elevated border-primary/20 animate-fade-in">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> 12-Month Projection
                </CardTitle>
                <Badge variant="outline" className={`gap-1 ${trendColor}`}>
                  <TrendIcon className="h-3 w-3" /> {result.insights.trajectory}
                </Badge>
              </div>
              <CardDescription>{result.narrative}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="risk"
                      name="Risk score"
                      stroke="hsl(var(--critical))"
                      strokeWidth={2}
                    />
                    {result.primary_metrics.map((m, i) => (
                      <Line
                        key={m}
                        type="monotone"
                        dataKey={m}
                        name={`${m}${result.metric_units[m] ? ` (${result.metric_units[m]})` : ""}`}
                        stroke={i === 0 ? "hsl(var(--primary))" : "hsl(var(--accent))"}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid gap-3">
                <div className="p-3 rounded-lg bg-secondary/50 border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <Target className="h-3 w-3" /> BIGGEST LEVER
                  </p>
                  <p className="text-sm">{result.insights.biggest_lever}</p>
                </div>
                {result.insights.warning_signs?.length > 0 && (
                  <div className="p-3 rounded-lg bg-critical/10 border border-critical/30">
                    <p className="text-xs font-semibold text-critical mb-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> WARNING SIGNS
                    </p>
                    <ul className="text-sm space-y-0.5 list-disc list-inside">
                      {result.insights.warning_signs.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Recommendations</p>
                {result.recommendations.map((r, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-card">
                    <p className="font-medium text-sm">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                    <p className="text-xs text-success mt-1">→ {r.expected_impact}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {simulations.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-base">Past Simulations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {simulations.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/40">
                  <div>
                    <p className="text-sm font-medium">{s.condition}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()} · {s.insights?.trajectory || "—"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteSimulation(s.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function SliderField({
  label, value, onChange, min, max, step, hint,
}: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; hint: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

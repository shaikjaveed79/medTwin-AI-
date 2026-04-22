import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { SymptomInput } from "@/components/SymptomInput";
import { FollowUpQuestions } from "@/components/FollowUpQuestions";
import { DiagnosisResult } from "@/components/DiagnosisResult";
import { useHealthSession } from "@/hooks/useHealthSession";
import { useTwinState } from "@/hooks/useTwinState";
import { AuthPage } from "@/pages/AuthPage";
import { HealthScoreGauge } from "@/components/HealthScoreGauge";
import { Brain, Sparkles, Activity, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";

const trendIcons = { improving: TrendingUp, worsening: TrendingDown, stable: Minus };
const trendColors = { improving: "text-success", worsening: "text-critical", stable: "text-info" };

const AnalyzingState = () => (
  <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
    <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 animate-pulse-soft shadow-glow">
      <Brain className="h-8 w-8 text-primary-foreground" />
    </div>
    <h3 className="font-display text-lg font-semibold mb-2">MedTwin AI is thinking...</h3>
    <p className="text-muted-foreground text-sm text-center max-w-md">
      Analyzing your symptoms, medical history, and digital twin intelligence.
    </p>
    <div className="flex gap-1 mt-4">
      {[0, 1, 2].map(i => (
        <div key={i} className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" style={{ animationDelay: `${i * 200}ms` }} />
      ))}
    </div>
  </div>
);

export default function Index() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Activity className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <HeroSection />
        <SymptomAnalysisFlow />
      </div>
    </AppLayout>
  );
}

function HeroSection() {
  const { twinState, loading } = useTwinState();
  const TrendIcon = trendIcons[twinState.trend as keyof typeof trendIcons] || Minus;
  const trendColor = trendColors[twinState.trend as keyof typeof trendColors] || "text-info";

  return (
    <div className="text-center space-y-4 mb-2">
      <div className="flex items-center justify-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium uppercase tracking-widest text-primary">AI-Powered Health Analysis</span>
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Your Personal Health Assistant
      </h1>
      <p className="text-muted-foreground max-w-lg mx-auto text-sm">
        MedTwin AI understands you — not just your symptoms. It learns, evolves, and thinks with you.
      </p>

      {/* Twin State quick stats */}
      {!loading && twinState.session_count > 0 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <div className="flex items-center gap-2 glass-card px-3 py-2 rounded-xl">
            <HealthScoreGauge score={twinState.health_score} size={36} strokeWidth={4} showLabel={false} />
            <div className="text-left">
              <p className="text-xs font-bold">{twinState.health_score}</p>
              <p className="text-[9px] text-muted-foreground">Health</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 glass-card px-3 py-2 rounded-xl">
            <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            <div className="text-left">
              <p className={`text-xs font-bold capitalize ${trendColor}`}>{twinState.trend}</p>
              <p className="text-[9px] text-muted-foreground">Trend</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 glass-card px-3 py-2 rounded-xl">
            <BarChart3 className="h-4 w-4 text-primary" />
            <div className="text-left">
              <p className="text-xs font-bold">{twinState.session_count}</p>
              <p className="text-[9px] text-muted-foreground">Sessions</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SymptomAnalysisFlow() {
  const { stage, questions, result, loading, submitSymptoms, submitAnswers, simulateDecision, generateClinicalReport, reset } = useHealthSession();

  return (
    <>
      {stage === "input" && <SymptomInput onSubmit={submitSymptoms} loading={loading} />}
      {stage === "answering" && <FollowUpQuestions questions={questions} onSubmit={submitAnswers} loading={loading} />}
      {stage === "analyzing" && <AnalyzingState />}
      {stage === "complete" && result && (
        <DiagnosisResult
          result={result}
          onReset={reset}
          onSimulateDecision={simulateDecision}
          onGenerateReport={generateClinicalReport}
        />
      )}
    </>
  );
}

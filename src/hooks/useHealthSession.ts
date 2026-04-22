import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTwinState } from "@/hooks/useTwinState";

interface FollowUpQuestion {
  id: number;
  question: string;
  options?: string[];
}

export interface AnalysisResult {
  condition: string;
  risk_level: string;
  risk_score?: number;
  reasoning: string;
  recommended_action: string;
  explanation: {
    key_triggers: string[];
    history_influence: string;
    reasoning_logic: string;
  };
  session_comparison?: {
    has_previous: boolean;
    insight: string;
  };
}

type SessionStage = "input" | "questioning" | "answering" | "analyzing" | "complete";

async function fetchUserContext(userId: string) {
  const [profileRes, sessionsRes, reportsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).single(),
    supabase.from("health_sessions")
      .select("symptoms, condition, risk_level, created_at")
      .eq("user_id", userId).eq("status", "complete")
      .order("created_at", { ascending: false }).limit(5),
    supabase.from("medical_reports")
      .select("report_name, extracted_text, structured_data")
      .eq("user_id", userId).limit(10),
  ]);

  return {
    profile: profileRes.data ?? {},
    history: sessionsRes.data ?? [],
    reports: reportsRes.data ?? [],
  };
}

export function useHealthSession() {
  const { user } = useAuth();
  const { twinState, computeAndUpdate } = useTwinState();
  const [stage, setStage] = useState<SessionStage>("input");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<FollowUpQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const CRITICAL_SYMPTOMS = ["chest pain", "breathing difficulty", "fainting", "seizure", "severe bleeding", "unconscious"];

  const checkCritical = (syms: string[]): boolean => {
    const lower = syms.map(s => s.toLowerCase());
    return CRITICAL_SYMPTOMS.some(c => lower.some(s => s.includes(c)));
  };

  const submitSymptoms = async (syms: string[], desc: string) => {
    if (!user) return;
    setLoading(true);
    setSymptoms(syms);
    setDescription(desc);

    try {
      const { data: session, error: sessionError } = await supabase
        .from("health_sessions")
        .insert({ user_id: user.id, symptoms: syms, symptom_description: desc, status: "questioning" })
        .select()
        .single();

      if (sessionError) throw sessionError;
      setSessionId(session.id);

      if (checkCritical(syms)) {
        const critResult: AnalysisResult = {
          condition: "Critical Emergency Detected",
          risk_level: "critical",
          risk_score: 100,
          reasoning: "Your symptoms match critical emergency patterns. Rule-based safety override activated.",
          recommended_action: "Seek immediate emergency medical attention. Call emergency services (911) immediately.",
          explanation: {
            key_triggers: syms.filter(s => CRITICAL_SYMPTOMS.some(c => s.toLowerCase().includes(c))),
            history_influence: "Safety rules override — critical symptoms detected",
            reasoning_logic: "Rule Engine: Critical symptom patterns always trigger highest alert regardless of other factors."
          },
          session_comparison: { has_previous: false, insight: "Emergency override — no comparison needed." }
        };

        await supabase.from("health_sessions").update({
          condition: critResult.condition, risk_level: "critical", reasoning: critResult.reasoning,
          recommended_action: critResult.recommended_action, explanation: critResult.explanation as any, status: "complete",
        }).eq("id", session.id);

        await supabase.from("health_timeline").insert({
          user_id: user.id, event_type: "alert", title: "🚨 Critical Emergency",
          description: critResult.reasoning, session_id: session.id,
        });

        setResult(critResult);
        setStage("complete");
        setLoading(false);
        return;
      }

      const ctx = await fetchUserContext(user.id);

      const { data: aiData, error: aiError } = await supabase.functions.invoke("medtwin-analyze", {
        body: { stage: "questions", symptoms: syms, description: desc, twinState, ...ctx },
      });

      if (aiError) throw aiError;

      const generatedQuestions = aiData.questions || [];
      setQuestions(generatedQuestions);

      await supabase.from("health_sessions").update({
        followup_questions: generatedQuestions as any,
      }).eq("id", session.id);

      setStage("answering");
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze symptoms");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswers = async (userAnswers: Record<number, string>) => {
    if (!user || !sessionId) return;
    setLoading(true);
    setAnswers(userAnswers);
    setStage("analyzing");

    try {
      const ctx = await fetchUserContext(user.id);

      const { data: session } = await supabase
        .from("health_sessions")
        .select("symptoms, symptom_description, followup_questions")
        .eq("id", sessionId)
        .single();

      const { data: aiData, error: aiError } = await supabase.functions.invoke("medtwin-analyze", {
        body: {
          stage: "diagnosis",
          symptoms: session?.symptoms ?? symptoms,
          description: session?.symptom_description ?? description,
          questions: session?.followup_questions ?? [],
          answers: userAnswers,
          twinState,
          ...ctx,
        },
      });

      if (aiError) throw aiError;

      const diagnosis = aiData.diagnosis;
      setResult(diagnosis);

      await supabase.from("health_sessions").update({
        followup_answers: userAnswers as any,
        condition: diagnosis.condition, risk_level: diagnosis.risk_level,
        reasoning: diagnosis.reasoning, recommended_action: diagnosis.recommended_action,
        explanation: diagnosis.explanation as any, status: "complete",
      }).eq("id", sessionId);

      await supabase.from("health_timeline").insert({
        user_id: user.id, event_type: "diagnosis", title: diagnosis.condition,
        description: diagnosis.reasoning, session_id: sessionId,
        metadata: { risk_level: diagnosis.risk_level, risk_score: diagnosis.risk_score } as any,
      });
      // Update twin state after diagnosis
      await computeAndUpdate();

      setStage("complete");
    } catch (err: any) {
      toast.error(err.message || "Failed to complete analysis");
      setStage("answering");
    } finally {
      setLoading(false);
    }
  };

  const simulateDecision = async (): Promise<{ decision: string; reason: string } | null> => {
    if (!user || !result) return null;
    try {
      const ctx = await fetchUserContext(user.id);
      const { data, error } = await supabase.functions.invoke("medtwin-analyze", {
        body: { stage: "decision", diagnosis: result, ...ctx },
      });
      if (error) throw error;
      return data;
    } catch (err: any) {
      toast.error(err.message || "Decision simulation failed");
      return null;
    }
  };

  const generateClinicalReport = async (): Promise<any | null> => {
    if (!user || !result) return null;
    try {
      const ctx = await fetchUserContext(user.id);
      const { data, error } = await supabase.functions.invoke("medtwin-analyze", {
        body: {
          stage: "clinical-report", symptoms, description,
          questions, answers, diagnosis: result, ...ctx,
        },
      });
      if (error) throw error;
      return data.report;
    } catch (err: any) {
      toast.error(err.message || "Report generation failed");
      return null;
    }
  };

  const reset = () => {
    setStage("input");
    setSessionId(null);
    setSymptoms([]);
    setDescription("");
    setQuestions([]);
    setAnswers({});
    setResult(null);
  };

  return {
    stage, questions, answers, result, loading, symptoms, description,
    submitSymptoms, submitAnswers, simulateDecision, generateClinicalReport, reset,
  };
}

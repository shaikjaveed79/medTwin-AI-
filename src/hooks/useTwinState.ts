import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TwinState {
  health_score: number;
  risk_baseline: string;
  last_risk_level: string | null;
  trend: string;
  recurring_symptoms: string[];
  recurring_conditions: string[];
  session_count: number;
  last_session_at: string | null;
  contextual_factors: Record<string, any>;
}

const DEFAULT_TWIN: TwinState = {
  health_score: 70,
  risk_baseline: "low",
  last_risk_level: null,
  trend: "stable",
  recurring_symptoms: [],
  recurring_conditions: [],
  session_count: 0,
  last_session_at: null,
  contextual_factors: {},
};

const RISK_SCORES: Record<string, number> = {
  low: 10,
  moderate: 25,
  high: 50,
  critical: 75,
};

export function useTwinState() {
  const { user } = useAuth();
  const [twinState, setTwinState] = useState<TwinState>(DEFAULT_TWIN);
  const [loading, setLoading] = useState(true);

  const fetchTwinState = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("twin_state")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setTwinState({
        health_score: data.health_score ?? 70,
        risk_baseline: data.risk_baseline ?? "low",
        last_risk_level: data.last_risk_level,
        trend: data.trend ?? "stable",
        recurring_symptoms: (data.recurring_symptoms as string[]) ?? [],
        recurring_conditions: (data.recurring_conditions as string[]) ?? [],
        session_count: data.session_count ?? 0,
        last_session_at: data.last_session_at,
        contextual_factors: (data.contextual_factors as Record<string, any>) ?? {},
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTwinState();
  }, [fetchTwinState]);

  const computeAndUpdate = useCallback(async () => {
    if (!user) return;

    // Fetch last 10 completed sessions
    const { data: sessions } = await supabase
      .from("health_sessions")
      .select("symptoms, condition, risk_level, created_at")
      .eq("user_id", user.id)
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!sessions || sessions.length === 0) return;

    // Fetch profile for chronic conditions
    const { data: profile } = await supabase
      .from("profiles")
      .select("chronic_conditions")
      .eq("user_id", user.id)
      .single();

    const chronicConditions = (profile?.chronic_conditions as string[]) ?? [];

    // Detect recurring symptoms (3+ occurrences)
    const symptomCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      (s.symptoms || []).forEach((sym: string) => {
        symptomCounts[sym] = (symptomCounts[sym] || 0) + 1;
      });
    });
    const recurringSymptoms = Object.entries(symptomCounts)
      .filter(([, count]) => count >= 3)
      .map(([sym]) => sym);

    // Detect recurring conditions
    const condCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      if (s.condition) condCounts[s.condition] = (condCounts[s.condition] || 0) + 1;
    });
    const recurringConditions = Object.entries(condCounts)
      .filter(([, count]) => count >= 2)
      .map(([cond]) => cond);

    // Compute trend from last 3 sessions
    const last3 = sessions.slice(0, 3);
    const riskValues = last3.map((s) => RISK_SCORES[s.risk_level || "low"] || 10);
    let trend = "stable";
    if (riskValues.length >= 2) {
      const recent = riskValues[0];
      const older = riskValues[riskValues.length - 1];
      if (recent > older + 10) trend = "worsening";
      else if (recent < older - 10) trend = "improving";
    }

    // Health score: start at 70, adjust
    let healthScore = 70;
    const latestRisk = sessions[0]?.risk_level || "low";
    healthScore -= RISK_SCORES[latestRisk] || 0;
    if (recurringSymptoms.length > 0) healthScore -= recurringSymptoms.length * 3;
    if (chronicConditions.length > 0) healthScore -= chronicConditions.length * 5;
    if (trend === "improving") healthScore += 10;
    if (trend === "worsening") healthScore -= 10;
    healthScore = Math.max(5, Math.min(100, healthScore));

    // Risk baseline
    let riskBaseline = "low";
    if (chronicConditions.length >= 2 || recurringConditions.length >= 2) riskBaseline = "high";
    else if (chronicConditions.length >= 1 || recurringConditions.length >= 1) riskBaseline = "moderate";

    const newState: TwinState = {
      health_score: healthScore,
      risk_baseline: riskBaseline,
      last_risk_level: latestRisk,
      trend,
      recurring_symptoms: recurringSymptoms,
      recurring_conditions: recurringConditions,
      session_count: sessions.length,
      last_session_at: sessions[0]?.created_at || null,
      contextual_factors: twinState.contextual_factors,
    };

    // Upsert
    const { data: existing } = await supabase
      .from("twin_state")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      await supabase.from("twin_state").update({
        health_score: newState.health_score,
        risk_baseline: newState.risk_baseline,
        last_risk_level: newState.last_risk_level,
        trend: newState.trend,
        recurring_symptoms: newState.recurring_symptoms as any,
        recurring_conditions: newState.recurring_conditions as any,
        session_count: newState.session_count,
        last_session_at: newState.last_session_at,
        contextual_factors: newState.contextual_factors as any,
      }).eq("user_id", user.id);
    } else {
      await supabase.from("twin_state").insert({
        user_id: user.id,
        health_score: newState.health_score,
        risk_baseline: newState.risk_baseline,
        last_risk_level: newState.last_risk_level,
        trend: newState.trend,
        recurring_symptoms: newState.recurring_symptoms as any,
        recurring_conditions: newState.recurring_conditions as any,
        session_count: newState.session_count,
        last_session_at: newState.last_session_at,
        contextual_factors: newState.contextual_factors as any,
      } as any);
    }

    setTwinState(newState);
  }, [user, twinState.contextual_factors]);

  return { twinState, loading, computeAndUpdate, refetch: fetchTwinState };
}

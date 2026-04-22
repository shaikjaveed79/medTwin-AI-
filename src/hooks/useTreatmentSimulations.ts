import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LifestyleInputs {
  diet_quality: number;
  exercise_minutes_per_week: number;
  medication_adherence: number;
  sleep_hours: number;
  stress_level: number;
  smoking: boolean;
  alcohol_drinks_per_week: number;
}

export interface SimulationProjection {
  month: number;
  metrics: Record<string, number>;
  risk_score: number;
}

export interface SimulationResult {
  baseline_metrics: Record<string, number>;
  primary_metrics: string[];
  metric_units: Record<string, string>;
  projections: SimulationProjection[];
  insights: {
    trajectory: "improving" | "stable" | "worsening";
    key_drivers: string[];
    biggest_lever: string;
    warning_signs: string[];
  };
  recommendations: Array<{ title: string; description: string; expected_impact: string }>;
  narrative: string;
}

export interface TreatmentSimulation {
  id: string;
  user_id: string;
  condition: string;
  lifestyle_inputs: LifestyleInputs;
  baseline_metrics: Record<string, number>;
  projections: SimulationProjection[];
  insights: SimulationResult["insights"];
  narrative: string;
  created_at: string;
}

export const useTreatmentSimulations = () => {
  const { user } = useAuth();
  const [simulations, setSimulations] = useState<TreatmentSimulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchSimulations = useCallback(async () => {
    if (!user) {
      setSimulations([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("treatment_simulations")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setSimulations(data as unknown as TreatmentSimulation[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  const runSimulation = async (
    condition: string,
    lifestyle: LifestyleInputs,
    profile?: any,
    medications?: any[],
    adherence_summary?: { taken: number; total: number; rate: number } | null,
  ): Promise<{ data?: SimulationResult & { id: string }; error?: string }> => {
    if (!user) return { error: "Not authenticated" };
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("treatment-simulate", {
        body: { condition, lifestyle, profile, medications, adherence_summary },
      });
      if (error) return { error: error.message };
      if (data?.error) return { error: data.error };

      const result = data as SimulationResult;
      const { data: saved, error: saveError } = await supabase
        .from("treatment_simulations")
        .insert({
          user_id: user.id,
          condition,
          lifestyle_inputs: lifestyle as any,
          baseline_metrics: result.baseline_metrics as any,
          projections: result.projections as any,
          insights: result.insights as any,
          narrative: result.narrative,
        })
        .select()
        .single();

      if (saveError) return { error: saveError.message };
      await fetchSimulations();
      return { data: { ...result, id: saved!.id } };
    } catch (e: any) {
      return { error: e.message || "Simulation failed" };
    } finally {
      setRunning(false);
    }
  };

  const deleteSimulation = async (id: string) => {
    await supabase.from("treatment_simulations").delete().eq("id", id);
    await fetchSimulations();
  };

  return { simulations, loading, running, runSimulation, deleteSimulation, refetch: fetchSimulations };
};

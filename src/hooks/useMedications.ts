import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Medication = {
  id: string;
  user_id: string;
  name: string;
  dosage: string | null;
  frequency: string;
  times_per_day: number;
  reminder_times: string[];
  notes: string | null;
  start_date: string;
  end_date: string | null;
  active: boolean;
  color: string | null;
  purpose: string | null;
  missed_dose_instructions: string | null;
  created_at: string;
  updated_at: string;
};

export type MedicationLog = {
  id: string;
  user_id: string;
  medication_id: string;
  scheduled_for: string;
  taken_at: string | null;
  status: "pending" | "taken" | "skipped" | "missed";
  notes: string | null;
  created_at: string;
};

export type DoseSlot = {
  medication: Medication;
  scheduledFor: Date;
  log?: MedicationLog;
  key: string;
};

function todayAt(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function useMedications() {
  const { user } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [{ data: meds }, { data: logRows }] = await Promise.all([
      supabase
        .from("medications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("medication_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("scheduled_for", since.toISOString())
        .order("scheduled_for", { ascending: false }),
    ]);

    setMedications((meds as Medication[]) || []);
    setLogs((logRows as MedicationLog[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addMedication = async (
    input: Omit<Medication, "id" | "user_id" | "created_at" | "updated_at" | "purpose" | "missed_dose_instructions">,
  ): Promise<Medication | undefined> => {
    if (!user) return;
    let purpose: string | null = null;
    let missed: string | null = null;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("chronic_conditions")
        .eq("user_id", user.id)
        .maybeSingle();
      const { data: ctx } = await supabase.functions.invoke("medication-context", {
        body: {
          name: input.name,
          dosage: input.dosage,
          frequency: input.frequency,
          conditions: profile?.chronic_conditions || [],
        },
      });
      if (ctx && !ctx.error) {
        purpose = ctx.purpose || null;
        missed = ctx.missed_dose_instructions || null;
      }
    } catch (e) {
      console.warn("AI context fetch failed", e);
    }

    const { data: inserted, error } = await supabase
      .from("medications")
      .insert({ ...input, user_id: user.id, purpose, missed_dose_instructions: missed })
      .select()
      .single();
    if (error) {
      toast.error("Failed to add medication");
      return;
    }
    toast.success(`${input.name} added`);
    refresh();
    return inserted as Medication;
  };

  const updateMedication = async (id: string, patch: Partial<Medication>) => {
    const { error } = await supabase.from("medications").update(patch).eq("id", id);
    if (error) {
      toast.error("Failed to update medication");
      return;
    }
    refresh();
  };

  const deleteMedication = async (id: string) => {
    const { error } = await supabase.from("medications").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete medication");
      return;
    }
    toast.success("Medication removed");
    refresh();
  };

  const recordDose = async (
    medicationId: string,
    scheduledFor: Date,
    status: "taken" | "skipped",
    existingLogId?: string,
  ) => {
    if (!user) return;
    if (existingLogId) {
      await supabase
        .from("medication_logs")
        .update({
          status,
          taken_at: status === "taken" ? new Date().toISOString() : null,
        })
        .eq("id", existingLogId);
    } else {
      await supabase.from("medication_logs").insert({
        user_id: user.id,
        medication_id: medicationId,
        scheduled_for: scheduledFor.toISOString(),
        taken_at: status === "taken" ? new Date().toISOString() : null,
        status,
      });
    }
    toast.success(status === "taken" ? "Dose logged" : "Dose skipped");
    refresh();
  };

  // Build today's dose schedule from active medications
  const todaySlots: DoseSlot[] = medications
    .filter((m) => m.active)
    .flatMap((m) =>
      (m.reminder_times || []).map((t) => {
        const scheduledFor = todayAt(t);
        const log = logs.find(
          (l) =>
            l.medication_id === m.id &&
            Math.abs(new Date(l.scheduled_for).getTime() - scheduledFor.getTime()) < 60_000,
        );
        return {
          medication: m,
          scheduledFor,
          log,
          key: `${m.id}-${t}`,
        };
      }),
    )
    .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

  // Adherence over last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentLogs = logs.filter((l) => new Date(l.scheduled_for) >= sevenDaysAgo);
  const taken = recentLogs.filter((l) => l.status === "taken").length;
  const total = recentLogs.length;
  const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

  return {
    medications,
    logs,
    loading,
    todaySlots,
    adherenceRate,
    addMedication,
    updateMedication,
    deleteMedication,
    recordDose,
    refresh,
  };
}

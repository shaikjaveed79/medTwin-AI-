import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type FollowUpMessage = { role: "assistant" | "user"; content: string; ts: string };

export type FollowUp = {
  id: string;
  user_id: string;
  trigger_type: string;
  subject: string;
  context: string | null;
  status: "open" | "completed" | "dismissed";
  messages: FollowUpMessage[];
  medication_id: string | null;
  next_check_at: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

export function useFollowUps() {
  const { user } = useAuth();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setFollowUps([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("follow_ups")
      .select("*")
      .order("created_at", { ascending: false });
    setFollowUps((data as unknown as FollowUp[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startFollowUp = async (
    subject: string,
    trigger_type: string,
    context: string,
    medication_id?: string,
  ): Promise<FollowUp | null> => {
    if (!user) return null;
    setBusy(true);
    try {
      const { data: ai, error: aiErr } = await supabase.functions.invoke("followup-checkin", {
        body: { mode: "open", subject, trigger_type, context },
      });
      if (aiErr || ai?.error) {
        toast.error(ai?.error || aiErr?.message || "Failed to start check-in");
        return null;
      }
      const firstMsg: FollowUpMessage = {
        role: "assistant",
        content: ai.message,
        ts: new Date().toISOString(),
      };
      const { data: row, error } = await supabase
        .from("follow_ups")
        .insert({
          user_id: user.id,
          subject,
          trigger_type,
          context,
          medication_id: medication_id || null,
          messages: [firstMsg] as any,
          status: "open",
          last_checked_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) {
        toast.error(error.message);
        return null;
      }
      await refresh();
      return row as unknown as FollowUp;
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async (followUp: FollowUp, text: string): Promise<FollowUp | null> => {
    if (!user || !text.trim()) return null;
    setBusy(true);
    try {
      const userMsg: FollowUpMessage = {
        role: "user",
        content: text.trim(),
        ts: new Date().toISOString(),
      };
      const thread = [...followUp.messages, userMsg];

      const { data: ai, error: aiErr } = await supabase.functions.invoke("followup-checkin", {
        body: {
          mode: "reply",
          subject: followUp.subject,
          trigger_type: followUp.trigger_type,
          context: followUp.context,
          messages: followUp.messages,
          user_message: text.trim(),
        },
      });
      if (aiErr || ai?.error) {
        toast.error(ai?.error || aiErr?.message || "AI reply failed");
        return null;
      }

      const aiMsg: FollowUpMessage = {
        role: "assistant",
        content: ai.message,
        ts: new Date().toISOString(),
      };
      const updatedThread = [...thread, aiMsg];
      const newStatus: FollowUp["status"] = ai.complete ? "completed" : "open";

      if (ai.urgent) {
        toast.warning("Urgent: please contact your clinician or emergency services.");
      }

      const { data: row, error } = await supabase
        .from("follow_ups")
        .update({
          messages: updatedThread as any,
          status: newStatus,
          last_checked_at: new Date().toISOString(),
        })
        .eq("id", followUp.id)
        .select()
        .single();
      if (error) {
        toast.error(error.message);
        return null;
      }
      await refresh();
      return row as unknown as FollowUp;
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async (id: string) => {
    await supabase.from("follow_ups").update({ status: "dismissed" }).eq("id", id);
    refresh();
  };

  const remove = async (id: string) => {
    await supabase.from("follow_ups").delete().eq("id", id);
    refresh();
  };

  return { followUps, loading, busy, startFollowUp, sendReply, dismiss, remove, refresh };
}

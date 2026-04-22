import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface VisualAnalysisFindings {
  category?: string;
  description?: string;
  healing_status?: "improving" | "stable" | "worsening" | "new" | "unknown";
  comparison_notes?: string;
  infection_indicators?: string[];
  recommendations?: string[];
  red_flags?: string[];
  alert_doctor?: boolean;
  alert_reason?: string;
  patient_message?: string;
}

export interface VisualAnalysis {
  id: string;
  user_id: string;
  photo_url: string;
  body_location: string | null;
  user_notes: string | null;
  ai_findings: VisualAnalysisFindings;
  severity: string | null;
  urgency: string | null;
  infection_signs: boolean;
  alert_sent: boolean;
  alert_recipient: string | null;
  created_at: string;
  signed_url?: string;
}

const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const useVisualAnalyses = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<VisualAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchAnalyses = useCallback(async () => {
    if (!user) {
      setAnalyses([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("visual_analyses")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      // Generate signed URLs for display
      const withUrls = await Promise.all(
        data.map(async (a: any) => {
          const { data: signed } = await supabase.storage
            .from("wound_photos")
            .createSignedUrl(a.photo_url, 3600);
          return { ...a, signed_url: signed?.signedUrl } as VisualAnalysis;
        })
      );
      setAnalyses(withUrls);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const analyzePhoto = async (
    file: File,
    bodyLocation: string,
    userNotes: string
  ): Promise<{ data?: VisualAnalysis; error?: string }> => {
    if (!user) return { error: "Not authenticated" };
    setAnalyzing(true);
    try {
      // 1. Upload photo to private bucket (path: {userId}/{timestamp}-{filename})
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("wound_photos")
        .upload(path, file, { contentType: file.type });
      if (uploadError) return { error: uploadError.message };

      // 2. Convert to base64 for AI
      const { base64, mimeType } = await fileToBase64(file);

      // 3. Fetch previous analyses for the same body location
      let previousAnalyses: any[] = [];
      if (bodyLocation) {
        const { data: prev } = await supabase
          .from("visual_analyses")
          .select("created_at, severity, urgency, infection_signs, ai_findings")
          .eq("body_location", bodyLocation)
          .order("created_at", { ascending: true })
          .limit(5);
        if (prev) previousAnalyses = prev;
      }

      // 4. Call AI
      const { data: aiData, error: aiError } = await supabase.functions.invoke("visual-analyze", {
        body: {
          fileBase64: base64,
          fileMimeType: mimeType,
          bodyLocation,
          userNotes,
          previousAnalyses,
        },
      });
      if (aiError) return { error: aiError.message };
      if (aiData?.error) return { error: aiData.error };

      const findings = aiData as VisualAnalysisFindings & { severity?: string; urgency?: string; infection_signs?: boolean };

      // 5. Save analysis
      const { data: saved, error: saveError } = await supabase
        .from("visual_analyses")
        .insert({
          user_id: user.id,
          photo_url: path,
          body_location: bodyLocation || null,
          user_notes: userNotes || null,
          ai_findings: findings as any,
          severity: findings.severity || null,
          urgency: findings.urgency || "low",
          infection_signs: !!findings.infection_signs,
        })
        .select()
        .single();

      if (saveError) return { error: saveError.message };

      // 6. If alert needed, send email to emergency contact
      let alertSent = false;
      let alertRecipient: string | null = null;
      if (findings.alert_doctor) {
        const { data: contacts } = await supabase
          .from("emergency_contacts")
          .select("name, email")
          .not("email", "is", null)
          .limit(1);
        const contact = contacts?.[0] as { name: string; email: string | null } | undefined;
        if (contact && contact.email) {
          alertRecipient = `${contact.name} (${contact.email})`;
          await supabase
            .from("visual_analyses")
            .update({ alert_sent: false, alert_recipient: alertRecipient })
            .eq("id", saved!.id);
          // Email infrastructure is not yet configured in this project.
          // The alert intent is recorded; once email is set up, alerts will be sent.
          alertSent = false;
        }
      }

      const { data: signed } = await supabase.storage
        .from("wound_photos")
        .createSignedUrl(path, 3600);

      const finalAnalysis: VisualAnalysis = {
        ...(saved as any),
        ai_findings: findings,
        alert_sent: alertSent,
        alert_recipient: alertRecipient,
        signed_url: signed?.signedUrl,
      };

      await fetchAnalyses();
      return { data: finalAnalysis };
    } catch (e: any) {
      return { error: e.message || "Analysis failed" };
    } finally {
      setAnalyzing(false);
    }
  };

  const deleteAnalysis = async (id: string, photoPath: string) => {
    await supabase.storage.from("wound_photos").remove([photoPath]);
    await supabase.from("visual_analyses").delete().eq("id", id);
    await fetchAnalyses();
  };

  return { analyses, loading, analyzing, analyzePhoto, deleteAnalysis, refetch: fetchAnalyses };
};

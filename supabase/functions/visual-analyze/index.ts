import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabaseAuth.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { fileBase64, fileMimeType, bodyLocation, userNotes, previousAnalyses } = body;

    if (!fileBase64 || !fileMimeType) {
      return new Response(JSON.stringify({ error: "Missing image data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const previousContext = previousAnalyses && previousAnalyses.length > 0
      ? `\nPREVIOUS ANALYSES of the same body region (oldest to newest):\n${previousAnalyses.map((p: any, i: number) => `${i + 1}. ${p.created_at}: severity=${p.severity}, urgency=${p.urgency}, infection_signs=${p.infection_signs}. Findings: ${JSON.stringify(p.ai_findings || {}).slice(0, 300)}`).join("\n")}\n\nCompare the current image to these prior assessments and report whether the condition is improving, stable, or worsening.`
      : "";

    const systemPrompt = `You are MedTwin AI's visual triage assistant for skin conditions, wounds, rashes, and other surface-level findings.

You analyze a photo and produce a structured medical assessment. You are NOT a substitute for a doctor — your role is to triage and flag concerning signs for follow-up.

Look for:
- Wound/lesion characteristics: size, color, edges, exudate, granulation
- Infection signs: redness spreading beyond the wound (erythema), warmth, pus, bad odor, swelling, dark/necrotic tissue, red streaks (lymphangitis)
- Healing progression vs prior images if provided
- Concerning features: rapid change, irregular borders (for moles), bleeding, deep tissue exposure

Respond ONLY with valid JSON, no markdown:
{
  "category": "wound" | "skin_lesion" | "rash" | "burn" | "mole" | "other",
  "description": "Objective 1-2 sentence description of what you see",
  "severity": "mild" | "moderate" | "severe",
  "urgency": "low" | "medium" | "high",
  "infection_signs": true | false,
  "infection_indicators": ["specific signs you observed, e.g. 'spreading erythema', 'purulent discharge'"],
  "healing_status": "improving" | "stable" | "worsening" | "new" | "unknown",
  "comparison_notes": "How current image compares to previous, or 'no prior images' if none",
  "recommendations": ["actionable step 1", "step 2"],
  "red_flags": ["urgent flags requiring immediate doctor attention, or empty array"],
  "alert_doctor": true | false,
  "alert_reason": "Plain-language reason if alert_doctor is true, else empty string",
  "patient_message": "2-3 sentence reassuring or urgent plain-language summary for the patient"
}

Set alert_doctor=true ONLY when urgency is "high" OR infection_signs is true OR you observe a red flag like rapidly spreading erythema, deep tissue involvement, necrosis, or features suggestive of malignancy.

If the image is not a medical/skin photo, set category="other", urgency="low", alert_doctor=false, and explain in description.`;

    const userText = `Analyze this image.${bodyLocation ? ` Body location: ${bodyLocation}.` : ""}${userNotes ? ` Patient notes: ${userNotes}.` : ""}${previousContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${fileMimeType};base64,${fileBase64}` } },
              { type: "text", text: userText },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    let content = aiResponse.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visual-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

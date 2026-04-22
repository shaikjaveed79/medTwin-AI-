import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify JWT
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
    const { condition, lifestyle, profile, baseline, medications, adherence_summary } = body;

    if (!condition || !lifestyle) {
      return new Response(JSON.stringify({ error: "Missing condition or lifestyle inputs" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const profileContext = profile
      ? `Patient: Age ${profile.age || "unknown"}, chronic conditions: ${(profile.chronic_conditions || []).join(", ") || "none"}.`
      : "";

    const medsList = Array.isArray(medications) && medications.length > 0
      ? medications.map((m: any) => {
          const dur = m.start_date
            ? `${Math.max(0, Math.round((Date.now() - new Date(m.start_date).getTime()) / (1000 * 60 * 60 * 24)))} days`
            : "duration unknown";
          return `- ${m.name}${m.dosage ? ` ${m.dosage}` : ""}, ${m.times_per_day || 1}x/day, taken for ${dur}${m.purpose ? ` (purpose: ${m.purpose})` : ""}`;
        }).join("\n")
      : "None reported.";

    const adherenceContext = adherence_summary
      ? `Real adherence (last 7 days): ${adherence_summary.taken}/${adherence_summary.total} doses taken (${adherence_summary.rate}%).`
      : "";

    const systemPrompt = `You are MedTwin AI's chronic-disease lifestyle simulator. You model how lifestyle changes affect health metrics over time for chronic conditions.

You receive: a condition (e.g. type 2 diabetes, hypertension, heart disease), lifestyle inputs (diet quality 1-10, exercise minutes/week, medication adherence %, sleep hours/night, stress level 1-10), the patient's CURRENT MEDICATIONS (drug, dose, frequency, duration), real adherence data, and optionally baseline metrics.

You MUST factor in expected pharmacological effect of each medication on the condition (e.g. metformin lowers HbA1c ~1-1.5% over 3 months; ACE inhibitors lower SBP ~10mmHg; statins lower LDL ~30-50%). Combine medication effect with lifestyle change effects realistically — don't double-count benefits. If real adherence is poor, dampen expected medication benefit accordingly. Project the most relevant clinical metrics for the condition (e.g. HbA1c & weight for diabetes, systolic BP & LDL for hypertension/heart disease).

Respond ONLY with valid JSON, no markdown:
{
  "baseline_metrics": { "metric_name": number, ... },
  "primary_metrics": ["metric_name_1", "metric_name_2"],
  "metric_units": { "metric_name": "unit (e.g. mg/dL, mmHg, kg, %)" },
  "projections": [
    { "month": 0, "metrics": { "metric_name": number }, "risk_score": number },
    { "month": 1, "metrics": { ... }, "risk_score": number },
    { "month": 3, "metrics": { ... }, "risk_score": number },
    { "month": 6, "metrics": { ... }, "risk_score": number },
    { "month": 12, "metrics": { ... }, "risk_score": number }
  ],
  "insights": {
    "trajectory": "improving" | "stable" | "worsening",
    "key_drivers": ["driver 1", "driver 2"],
    "biggest_lever": "the lifestyle change with the largest impact",
    "warning_signs": ["sign 1"]
  },
  "recommendations": [
    { "title": "short title", "description": "specific actionable change", "expected_impact": "what improves and by how much" }
  ],
  "narrative": "2-3 sentence plain-language summary of where the patient is heading and what to focus on."
}

risk_score is 0-100 (lower = better cardiovascular/metabolic risk).
Be realistic — small lifestyle changes produce small effects. Bad habits worsen metrics over time.`;

    const userPrompt = `${profileContext}

Condition: ${condition}

Current medications:
${medsList}

${adherenceContext}

Lifestyle inputs:
- Diet quality: ${lifestyle.diet_quality}/10
- Exercise: ${lifestyle.exercise_minutes_per_week} min/week
- Medication adherence: ${lifestyle.medication_adherence}%
- Sleep: ${lifestyle.sleep_hours} hours/night
- Stress level: ${lifestyle.stress_level}/10
- Smoking: ${lifestyle.smoking ? "yes" : "no"}
- Alcohol: ${lifestyle.alcohol_drinks_per_week || 0} drinks/week

${baseline ? `Baseline metrics: ${JSON.stringify(baseline)}` : "Use realistic baseline values for this condition based on the patient profile."}

Generate the simulation.`;

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
          { role: "user", content: userPrompt },
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
    console.error("treatment-simulate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

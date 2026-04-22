import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function callAI(apiKey: string, systemPrompt: string, userPrompt: string) {
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
}

function buildContext(profile: any, history: any[], reports: any[], twinState?: any) {
  const profileContext = profile
    ? `Patient profile: Age: ${profile.age || "unknown"}, Blood type: ${profile.blood_type || "unknown"}, Allergies: ${(profile.allergies || []).join(", ") || "none"}, Chronic conditions: ${(profile.chronic_conditions || []).join(", ") || "none"}.`
    : "";

  const historyContext = history && history.length > 0
    ? `Recent health history: ${history.map((h: any) => `${h.symptoms?.join(", ")} → ${h.condition} (${h.risk_level}) on ${h.created_at}`).join("; ")}.`
    : "No prior health history.";

  const reportContext = reports && reports.length > 0
    ? `Medical reports on file:\n${reports.map((r: any) => {
        const sd = r.structured_data;
        if (sd) {
          return `- ${r.report_name}: Conditions: ${(sd.conditions_detected || []).join(", ") || "none"}. Key metrics: ${JSON.stringify(sd.key_metrics || {})}. Notes: ${sd.notes || "none"}`;
        }
        return `- ${r.report_name}: ${r.extracted_text?.slice(0, 200) || "No data extracted"}`;
      }).join("\n")}`
    : "No medical reports on file.";

  let twinContext = "";
  if (twinState && twinState.session_count > 0) {
    twinContext = `\n\nDIGITAL TWIN STATE (evolving intelligence model):
- Health Score: ${twinState.health_score}/100
- Trend: ${twinState.trend} (${twinState.trend === "worsening" ? "ATTENTION: patient health is declining" : twinState.trend === "improving" ? "patient is recovering" : "stable"})
- Risk Baseline: ${twinState.risk_baseline}
- Last Risk Level: ${twinState.last_risk_level || "none"}
- Recurring Symptoms: ${(twinState.recurring_symptoms || []).join(", ") || "none detected"}
- Recurring Conditions: ${(twinState.recurring_conditions || []).join(", ") || "none detected"}
- Total Sessions: ${twinState.session_count}
- Last Session: ${twinState.last_session_at || "unknown"}

IMPORTANT: You MUST reference the twin state in your analysis. If recurring symptoms exist, mention them. If the trend is worsening, flag it. If health score is low, consider it in your risk assessment.`;
  }

  return { profileContext, historyContext, reportContext, twinContext };
}

async function parseAIResponse(response: Response) {
  if (!response.ok) {
    if (response.status === 429) {
      return { error: "Rate limits exceeded, please try again later.", status: 429 };
    }
    if (response.status === 402) {
      return { error: "AI credits exhausted. Please add funds.", status: 402 };
    }
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    return { error: "AI gateway error", status: 500 };
  }

  const aiResponse = await response.json();
  let content = aiResponse.choices?.[0]?.message?.content || "";
  content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return { parsed: JSON.parse(content), status: 200 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify JWT - require authenticated user
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
    const { stage, symptoms, description, questions, answers, profile, history, reports, diagnosis, twinState: twinStateData } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { profileContext, historyContext, reportContext, twinContext } = buildContext(profile || {}, history || [], reports || [], twinStateData);
    const fullContext = `${profileContext}\n${historyContext}\n${reportContext}${twinContext}`;

    let systemPrompt = "";
    let userPrompt = "";

    if (stage === "questions") {
      systemPrompt = `You are MedTwin AI, an intelligent medical health assistant that behaves like an adaptive AI doctor conducting a thorough patient interview.
You NEVER give an immediate diagnosis. You ALWAYS ask 2-4 intelligent follow-up questions first, just like a real doctor would.

CRITICAL INSTRUCTIONS FOR QUESTION GENERATION:
1. You MUST cross-reference the patient's current symptoms against their PAST MEDICAL RECORDS, uploaded reports, and health history provided below.
2. If the patient has medical reports on file (lab results, imaging, etc.), at least ONE question MUST directly reference specific findings from those reports. For example: "Your recent blood test showed elevated glucose at 145 mg/dL — have you been experiencing increased thirst or frequent urination?"
3. If the patient has chronic conditions or past diagnoses, ask whether current symptoms could be a flare-up or related to those conditions.
4. Ask about medication adherence if past conditions are present.
5. Probe severity, duration, onset pattern, and associated symptoms.
6. Ask about environmental/lifestyle factors (stress, sleep, diet, hydration) when relevant.
7. Be specific — reference actual numbers, dates, and condition names from the patient's records when available.
8. If the DIGITAL TWIN STATE shows recurring symptoms, ask about pattern: "You've reported [symptom] multiple times recently — is it getting worse or staying the same?"
9. If the twin's health trend is "worsening", ask about recent lifestyle changes or missed treatments.
10. ALWAYS provide 2-4 option choices for each question AND allow free-text answers.

You must respond with a JSON object containing a "questions" array. Each question has:
- "id": number (1-4)
- "question": string (must be specific and personalized, referencing patient data when available)
- "options": string[] (optional, 2-4 common answer choices)

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation.`;

      userPrompt = `${fullContext}

Current symptoms: ${symptoms.join(", ")}
Additional description: ${description || "None provided"}

Generate 2-4 intelligent, personalized follow-up questions. If the patient has medical reports or past conditions, you MUST reference them in at least one question.`;

    } else if (stage === "diagnosis") {
      systemPrompt = `You are MedTwin AI, an intelligent medical health assistant providing personalized diagnoses.
You must combine ALL available context: symptoms, follow-up answers, patient profile, medical history, AND medical reports.

Your diagnosis must be:
- Personalized (reference specific patient data and reports when relevant)
- Explainable (explain why you reached this conclusion)
- Safety-first (err on the side of caution)
- Report-aware (incorporate medical report findings)

If the patient reported similar symptoms recently, MENTION IT.
If medical reports contain relevant conditions or metrics, REFERENCE THEM.

Also include a "session_comparison" field comparing this session to the most recent past session.

Respond with a JSON object:
{
  "diagnosis": {
    "condition": "Most likely condition name",
    "risk_level": "low" | "moderate" | "high" | "critical",
    "risk_score": number (0-100),
    "reasoning": "Detailed personalized reasoning",
    "recommended_action": "Clear actionable recommendation",
    "explanation": {
      "key_triggers": ["list", "of", "key", "symptom", "triggers"],
      "history_influence": "How patient history influenced this diagnosis",
      "reasoning_logic": "Step-by-step reasoning logic"
    },
    "session_comparison": {
      "has_previous": true/false,
      "insight": "How this compares to the last session (e.g. risk increased, similar condition, new symptoms)"
    }
  }
}

IMPORTANT: Respond ONLY with valid JSON. No markdown.
IMPORTANT: You are NOT a replacement for a real doctor. Always recommend consulting a healthcare professional for serious concerns.`;

      const answersFormatted = questions && answers
        ? questions.map((q: any) => `Q: ${q.question} → A: ${answers[q.id] || "Not answered"}`).join("\n")
        : "No follow-up answers provided.";

      userPrompt = `${fullContext}

Current symptoms: ${symptoms.join(", ")}
Additional description: ${description || "None provided"}

Follow-up Q&A:
${answersFormatted}

Provide your personalized diagnosis.`;

    } else if (stage === "decision") {
      systemPrompt = `You are MedTwin AI, providing decision support for health queries.
Based on all available patient context, symptoms, diagnosis, and medical reports, answer the patient's decision question.

Respond with a JSON object:
{
  "decision": "Yes/No/It depends - clear recommendation",
  "reason": "Detailed reasoning based on all available data"
}

IMPORTANT: Respond ONLY with valid JSON. No markdown.
Be direct but thorough. Reference specific data points when possible.`;

      userPrompt = `${fullContext}

Current diagnosis: ${diagnosis?.condition || "Unknown"}
Risk level: ${diagnosis?.risk_level || "Unknown"}
Reasoning: ${diagnosis?.reasoning || "None"}

The patient asks: "Should I go to the hospital?"

Provide your decision.`;

    } else if (stage === "report-analyze") {
      // Use multimodal Gemini to read actual file content
      const fileBase64 = body.fileBase64;
      const fileMimeType = body.fileMimeType;

      if (fileBase64 && fileMimeType) {
        // Send actual file to Gemini via multimodal content parts
        const multimodalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are MedTwin AI's report analysis engine with OCR + medical reasoning capabilities.
Read the provided medical document (PDF, scanned image, or lab printout) and extract ALL medical data using OCR + understanding.
Then produce TWO simplified explanations: one for patients (plain language, reassuring, actionable) and one for doctors (clinical, terminology-rich, differential-aware).

Respond with a JSON object:
{
  "extracted_text": "Full readable text content extracted from the document via OCR",
  "report_type": "e.g. Blood Test, Lipid Panel, X-Ray, MRI, Urinalysis, Pathology, Discharge Summary",
  "conditions_detected": ["list of conditions, abnormalities, or notable findings"],
  "key_metrics": {
    "blood_pressure": "value or empty string",
    "sugar_level": "value or empty string",
    "cholesterol": "value or empty string",
    "hemoglobin": "value or empty string"
  },
  "simplified_metrics": [
    {
      "name": "Metric name (e.g. Hemoglobin, LDL Cholesterol)",
      "value": "measured value with units",
      "reference_range": "normal range from report or standard",
      "status": "normal" | "low" | "high" | "critical" | "unknown",
      "plain_meaning": "One-sentence plain-English explanation of what this means for the patient"
    }
  ],
  "patient_explanation": {
    "summary": "2-3 sentence plain-language summary a patient with no medical background can understand",
    "what_it_means": "What the findings mean for the patient's day-to-day health",
    "key_concerns": ["plain-language concern 1", "concern 2"],
    "recommended_next_steps": ["actionable step 1", "step 2"],
    "reassurance": "A short reassuring note when appropriate (or note when urgent care is needed)"
  },
  "doctor_explanation": {
    "clinical_summary": "Concise clinical summary using proper medical terminology",
    "abnormal_findings": ["finding with value and clinical significance"],
    "differential_considerations": ["possible diagnoses or conditions to consider"],
    "suggested_workup": ["recommended follow-up tests or evaluations"],
    "red_flags": ["any urgent clinical red flags, or empty array"]
  },
  "notes": "Brief overall summary of key findings and recommendations from the report"
}

IMPORTANT: Respond ONLY with valid JSON. No markdown, no commentary.
- Use the document's reference ranges when present; otherwise use standard adult ranges.
- Mark "status": "critical" only for clearly dangerous values.
- Patient explanation MUST avoid jargon; doctor explanation MUST use clinical language.
- If the document is not a medical report, set conditions_detected to [] and explain in notes.`,
              },
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${fileMimeType};base64,${fileBase64}`,
                    },
                  },
                  {
                    type: "text",
                    text: `Analyze this medical document named "${body.reportName || "Unknown"}". Extract all text and medical data.`,
                  },
                ],
              },
            ],
          }),
        });

        const result = await parseAIResponse(multimodalResponse);

        if (result.error) {
          return new Response(JSON.stringify({ error: result.error }), {
            status: result.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(result.parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback: text-only analysis (legacy)
      systemPrompt = `You are MedTwin AI's report analysis engine.
Analyze the provided medical report text and extract structured data.

Respond with a JSON object:
{
  "extracted_text": "the input text",
  "conditions_detected": ["list of conditions or findings"],
  "key_metrics": {
    "blood_pressure": "value or empty string",
    "sugar_level": "value or empty string",
    "cholesterol": "value or empty string",
    "hemoglobin": "value or empty string"
  },
  "notes": "Summary of key findings and recommendations from the report"
}

IMPORTANT: Respond ONLY with valid JSON. No markdown.
Extract as much relevant medical data as possible. If a metric is not found, use empty string.`;

      userPrompt = `${fullContext}

Medical report text to analyze:
${body.reportText || "No text provided"}

Report name: ${body.reportName || "Unknown"}

Analyze this report and extract structured data.`;
    } else if (stage === "clinical-report") {
      systemPrompt = `You are MedTwin AI generating a clinical session summary report.
Create a professional, structured clinical report based on the session data.

Respond with a JSON object:
{
  "report": {
    "title": "Clinical Session Report",
    "date": "session date",
    "patient_summary": "Brief patient overview",
    "presenting_symptoms": ["list of symptoms"],
    "follow_up_assessment": "Summary of follow-up Q&A",
    "diagnosis": "Condition identified",
    "risk_assessment": "Risk level and score explanation",
    "recommended_actions": ["list of recommended actions"],
    "notes": "Additional clinical notes",
    "disclaimer": "This is an AI-generated report and should not replace professional medical advice."
  }
}

IMPORTANT: Respond ONLY with valid JSON. No markdown.`;

      const answersFormatted = questions && answers
        ? questions.map((q: any) => `Q: ${q.question} → A: ${answers[q.id] || "Not answered"}`).join("\n")
        : "";

      userPrompt = `${fullContext}

Session data:
Symptoms: ${(symptoms || []).join(", ")}
Description: ${description || "None"}
Follow-up Q&A:
${answersFormatted}
Diagnosis: ${diagnosis?.condition || "Unknown"}
Risk level: ${diagnosis?.risk_level || "Unknown"}
Reasoning: ${diagnosis?.reasoning || "None"}
Recommended action: ${diagnosis?.recommended_action || "None"}

Generate a clinical session report.`;

    } else {
      throw new Error("Invalid stage");
    }

    const response = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt);
    const result = await parseAIResponse(response);

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result.parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("medtwin-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

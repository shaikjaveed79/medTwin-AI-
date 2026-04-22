import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Msg = { role: "assistant" | "user"; content: string; ts?: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supa.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      mode,           // "open" -> generate first AI message; "reply" -> next AI turn
      subject,
      trigger_type,
      context,
      messages,       // existing thread (for "reply")
      user_message,   // patient reply (for "reply")
    } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `You are MedTwin AI's caring nurse-style follow-up assistant. You check in with patients between visits to track recovery, side effects, adherence, and concerns.

Style:
- Warm, brief, one focused question at a time. Max 3 short sentences per message.
- Use the patient's context (medication, surgery, condition) naturally.
- Probe gently: side effects, pain, sleep, mood, adherence challenges.
- If the patient describes red-flag symptoms (severe pain, bleeding, shortness of breath, fainting, suicidal thoughts, signs of infection like spreading redness/fever), respond with clear "seek urgent care" guidance and end with: [URGENT].
- When you have gathered enough info for this check-in (usually 3-5 turns), end your final message with: [COMPLETE].
- Never diagnose. Never prescribe. Suggest contacting their clinician for medical decisions.

Respond with PLAIN TEXT only — no JSON, no markdown headings.`;

    const baseContext = `Follow-up subject: ${subject}
Trigger: ${trigger_type || "general"}
Context: ${context || "none"}`;

    let aiMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    if (mode === "open") {
      aiMessages.push({
        role: "user",
        content: `${baseContext}\n\nWrite the opening check-in message for this patient. Greet them, mention the context, and ask one focused opening question.`,
      });
    } else {
      aiMessages.push({ role: "user", content: baseContext });
      const prior = (messages as Msg[] | undefined) || [];
      for (const m of prior) {
        aiMessages.push({ role: m.role, content: m.content });
      }
      if (user_message) {
        aiMessages.push({ role: "user", content: user_message });
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ai = await response.json();
    const content = (ai.choices?.[0]?.message?.content || "").trim();
    const urgent = /\[URGENT\]/i.test(content);
    const complete = /\[COMPLETE\]/i.test(content);
    const cleaned = content.replace(/\[URGENT\]/gi, "").replace(/\[COMPLETE\]/gi, "").trim();

    return new Response(
      JSON.stringify({ message: cleaned, urgent, complete }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("followup-checkin error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

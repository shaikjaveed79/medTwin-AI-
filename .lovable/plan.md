

## MedTwin AI — Deep Digital Twin Enhancement

This is a large enhancement covering 4 major areas: evolving twin intelligence, premium UI overhaul, smart hospital/doctor finder, and flashcard-style follow-up questions.

---

### 1. Database: Twin State Model

**New migration** — Add a `twin_state` table to track the evolving digital twin:

```sql
CREATE TABLE twin_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  health_score integer DEFAULT 70,
  risk_baseline text DEFAULT 'low',
  last_risk_level text,
  trend text DEFAULT 'stable', -- improving / stable / worsening
  recurring_symptoms jsonb DEFAULT '[]',
  recurring_conditions jsonb DEFAULT '[]',
  session_count integer DEFAULT 0,
  last_session_at timestamptz,
  contextual_factors jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
```

With RLS policies for authenticated users to read/update their own row. A database function `update_twin_state()` will be created to compute health_score and trend after each session completion.

---

### 2. Twin State Logic (useHealthSession.ts)

After every completed diagnosis:
- Fetch last 10 sessions, detect **recurring symptoms** (appeared 3+ times)
- Compute **trend** by comparing last 3 risk scores (improving/stable/worsening)
- Update **health_score**: start at 70, subtract/add based on risk levels
- Update **risk_baseline** from chronic conditions + recurring patterns
- Upsert the `twin_state` row

Pass the full twin state into ALL AI calls so the AI can say things like "You've reported headaches 4 times in the last month" or "Your health trend is worsening."

---

### 3. Edge Function Enhancement

Add twin state context to the `buildContext()` function:
- Include `health_score`, `trend`, `recurring_symptoms`, `risk_baseline`
- Instruct AI in all prompts to explicitly reference these when generating questions, diagnoses, and decisions
- Add predictive insight generation: "If symptoms persist, risk may increase"

---

### 4. Flashcard-Style Follow-Up Questions (FollowUpQuestions.tsx)

Complete redesign — each question displayed as a **full-width flashcard** with:
- One question per card, navigated with Next/Previous buttons
- Progress indicator (dots or bar) showing Q1 of 4
- Option chips for quick selection (large, tappable)
- **Plus** a text input below the options labeled "Or describe in your own words..."
- If user types custom text, it overrides the option selection
- Smooth slide animation between cards
- Card has a gradient top-border and subtle shadow

---

### 5. UI Overhaul — Premium Health App Feel

**Index page (hero section):**
- Gradient mesh background behind the header area
- Animated health pulse icon
- Stats row showing quick glance: health score, trend arrow, session count (from twin_state)

**SymptomInput.tsx:**
- Symptom chips with icons and subtle color coding by category (pain=red, respiratory=blue, general=yellow)
- Search/filter bar for symptoms
- Selected symptoms shown in a styled "active" card section with remove animation

**DiagnosisResult.tsx:**
- Circular gauge for risk score (animated SVG donut chart) instead of flat progress bar
- Color-coded sections with left border accents
- "What Changed?" section as a highlighted comparison card with up/down arrows
- Hospital/doctor finder integrated inline (not just a link)

**AppLayout + Sidebar:**
- Add health score badge in sidebar
- Gradient accent on active nav item

**General:**
- Add glass-morphism cards (backdrop-blur + subtle border)
- Micro-animations on interactions (scale on hover, slide-in on mount)
- Better spacing, larger touch targets

---

### 6. Smart Doctor/Hospital Finder

Replace the generic "hospitals near me" Google Maps link with an AI-powered recommendation:

**New edge function stage: `find-doctors`**
- Takes: diagnosis condition, risk level, user location (lat/lng)
- AI generates a list of **specialized doctor types** to look for (e.g., "cardiologist" for chest pain, "neurologist" for headaches)
- Returns specialty + search query

**Frontend (DiagnosisResult.tsx):**
- After diagnosis, show a "Find Specialized Care" section
- Display recommended specialist type based on condition
- "Find nearby {specialist}" button opens Google Maps with a **specific query** like `cardiologist+near+{lat},{lng}` instead of generic "hospitals near me"
- If geolocation unavailable, falls back to `cardiologist+near+me`
- Show 2-3 specialist recommendations with reasoning

---

### 7. Digital Twin Dashboard (new page or section on Profile)

Add a dashboard section to the Profile page showing:
- **Health Score** — animated circular gauge (0-100)
- **Trend** — arrow indicator with label (Improving/Stable/Worsening) and color
- **Recurring Issues** — list of symptoms/conditions that keep appearing
- **Risk Baseline** — badge showing baseline risk level
- **Session Frequency** — simple stat (X sessions in last 30 days)
- **Last Analysis** — quick summary of most recent diagnosis

---

### Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/migrations/...` | Create `twin_state` table with RLS |
| `supabase/functions/medtwin-analyze/index.ts` | Add twin state to context, add `find-doctors` stage |
| `src/hooks/useHealthSession.ts` | Compute and update twin state after each session |
| `src/hooks/useTwinState.ts` | **New** — hook to fetch/manage twin state |
| `src/components/FollowUpQuestions.tsx` | Flashcard redesign with per-card navigation + text input |
| `src/components/DiagnosisResult.tsx` | Circular gauge, specialist finder, premium layout |
| `src/components/SymptomInput.tsx` | Category-colored chips, search, better layout |
| `src/components/RiskBadge.tsx` | Add circular gauge component |
| `src/components/TwinDashboard.tsx` | **New** — health score gauge, trend, recurring issues |
| `src/pages/Index.tsx` | Add twin state stats row, premium hero |
| `src/pages/ProfilePage.tsx` | Integrate TwinDashboard section |
| `src/index.css` | Glass-morphism utilities, new animations |
| `src/components/AppSidebar.tsx` | Health score badge |
| `src/components/AppLayout.tsx` | Subtle background gradient |




# 🧠 MedTwin AI

### *Your Living Health Twin, Powered by AI*

MedTwin AI is an intelligent healthcare companion that goes beyond basic symptom checkers. It creates a **dynamic digital twin of the patient**, continuously learning from symptoms, medications, lifestyle, and reports to deliver **personalized health insights, simulations, and early risk detection**.

---

## 🚀 Why MedTwin?

Healthcare today is:

* ❌ Reactive instead of proactive
* ❌ Fragmented across reports, medications, and consultations
* ❌ Lacking personalized “what-if” guidance

### ✅ MedTwin solves this by:

* Tracking your **entire health journey**
* Simulating **future outcomes based on lifestyle**
* Providing **AI-powered follow-ups and alerts**
* Turning raw data into **actionable insights**

---

## 🏗️ System Architecture

```
Frontend (React + Vite)
        ↓
Supabase (Auth + DB + Storage + Edge Functions)
        ↓
AI Gateway (Gemini 2.5 Flash / Multimodal)
        ↓
Postgres (RLS secured data)
```

### 🔐 Security Model

* Row-Level Security (RLS) per user
* JWT verification in every edge function
* Private storage buckets for medical data
* No PHI stored in logs

---

## 🛠️ Tech Stack

| Layer        | Technology                            |
| ------------ | ------------------------------------- |
| Frontend     | React 18, Vite, TypeScript            |
| UI           | Tailwind CSS, shadcn/ui               |
| Charts       | Recharts                              |
| Backend      | Supabase (Postgres + Auth + Storage)  |
| Server Logic | Deno Edge Functions                   |
| AI Layer     | Lovable AI Gateway (Gemini 2.5 Flash) |

---

## ✨ Core Features

---

### 🩺 AI Symptom Diagnosis & Health Score

* Smart follow-up questioning (doctor-like)
* Personalized diagnosis using:

  * Profile
  * History
  * Reports
* Risk scoring + health trends

**Tech:**

* `medtwin-analyze` edge function
* `health_sessions` table
* Components: `HealthScoreGauge`, `RiskBadge`

---

### 💊 Medication Tracker + AI Reminders

* Tracks medications, dosage, adherence
* AI auto-generates:

  * Purpose of medication
  * Missed dose instructions
* Daily checklist UI

**Tech:**

* `medications`, `medication_logs`
* Edge function: `medication-context`

---

### 📈 Treatment Simulator (🔥 Key Innovation)

Simulates how lifestyle affects chronic conditions.

* Inputs:

  * Diet, exercise, sleep, stress
  * Medication adherence
* Outputs:

  * HbA1c / BP / Risk projections (0–12 months)
* Combines:

  * Pharmacology + lifestyle changes

**Tech:**

* `treatment-simulate` edge function
* `treatment_simulations` table
* Recharts graphs

---

### 🧬 Visual Health Analysis (Multimodal AI)

* Upload wound/skin images
* Detect:

  * Severity
  * Infection risk
* Compare with previous images → healing tracking

**Tech:**

* Private storage: `wound_photos`
* Edge function: `visual-analyze`
* Gemini Vision model

---

### 🤖 Automated AI Follow-Ups

* Nurse-style conversational check-ins
* Detects red flags (`[URGENT]`)
* Maintains conversation threads

**Tech:**

* `follow_ups` table (JSONB)
* `followup-checkin` edge function

---

### 📄 OCR & Lab Report Analysis

* Extracts data from reports
* Dual explanation:

  * 👤 Patient-friendly
  * 🧑‍⚕️ Doctor-level

**Tech:**

* `medical_reports` table
* OCR + AI parsing

---

### 🕒 Health Timeline

* Unified view of:

  * Symptoms
  * Medications
  * Simulations
  * Reports

---

### 🚨 Emergency Contacts

* Store emergency contacts
* Trigger alerts on critical conditions

---

## 🔄 Data Flow (Example)

### Diagnosis Flow

```
User Input → React Hook → Supabase Edge Function
→ AI Gateway → Processed Response → UI
```

### Treatment Simulator Flow

```
Lifestyle + Medications + Adherence
        ↓
Prompt Engineering
        ↓
Gemini Model
        ↓
Projection JSON
        ↓
Recharts Visualization
```

---

## 🧠 What Makes MedTwin Different?

🚫 Not just a chatbot
✅ A continuous **health intelligence system**

* 🔬 Combines **real adherence + pharmacology**
* 📊 Simulates **future outcomes**
* 🧠 Tracks **health trends over time**
* 🖼️ Visual AI tracks **healing progression**
* 💬 Follow-ups are **stateful conversations**

---

## 🔐 Security & Privacy

* Row-Level Security (RLS) on all tables
* Secure Edge Functions with JWT validation
* Private storage with access policies
* No sensitive data leakage

---

## 🛣️ Roadmap

* 📧 Email / SMS alerts
* ⌚ Wearable integration (Apple Watch, Fitbit)
* 🧑‍⚕️ Doctor dashboard
* 🌍 Multi-language support

---

## 📦 Getting Started

```bash
git clone https://github.com/<your-repo>
cd medtwin-ai
npm install
npm run dev
```

---

## 🔧 Environment Variables

Create `.env`:

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
LOVABLE_API_KEY=
```

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch

```bash
git checkout -b feature/your-feature
```

3. Commit changes

```bash
git commit -m "feat: add new feature"
```

4. Push

```bash
git push origin feature/your-feature
```

5. Open Pull Request

---

## 📄 License

MIT License

---

## 💡 Final Note

MedTwin is not just about diagnosing —
it’s about **understanding, predicting, and improving health outcomes over time**.

---



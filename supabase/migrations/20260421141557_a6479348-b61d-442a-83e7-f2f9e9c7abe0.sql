-- Medications table: stores prescription / supplement entries
CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily', -- daily | twice_daily | thrice_daily | custom
  times_per_day INTEGER NOT NULL DEFAULT 1,
  reminder_times TEXT[] NOT NULL DEFAULT ARRAY['09:00'], -- HH:MM strings
  notes TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  color TEXT DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own medications" ON public.medications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own medications" ON public.medications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medications" ON public.medications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medications" ON public.medications
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_medications_updated_at
BEFORE UPDATE ON public.medications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Medication logs: per-dose adherence record
CREATE TABLE public.medication_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  taken_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | taken | skipped | missed
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own medication logs" ON public.medication_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own medication logs" ON public.medication_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medication logs" ON public.medication_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medication logs" ON public.medication_logs
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_medication_logs_user_scheduled ON public.medication_logs(user_id, scheduled_for DESC);
CREATE INDEX idx_medication_logs_medication ON public.medication_logs(medication_id);
CREATE INDEX idx_medications_user_active ON public.medications(user_id, active);
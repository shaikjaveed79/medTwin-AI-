
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS missed_dose_instructions text;

CREATE TABLE IF NOT EXISTS public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trigger_type text NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  context text,
  status text NOT NULL DEFAULT 'open',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  medication_id uuid REFERENCES public.medications(id) ON DELETE SET NULL,
  next_check_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own follow-ups"
  ON public.follow_ups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own follow-ups"
  ON public.follow_ups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own follow-ups"
  ON public.follow_ups FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own follow-ups"
  ON public.follow_ups FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_follow_ups_updated_at
  BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_follow_ups_user_status ON public.follow_ups(user_id, status);

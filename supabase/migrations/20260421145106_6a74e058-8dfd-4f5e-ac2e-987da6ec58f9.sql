-- Treatment simulations table
CREATE TABLE public.treatment_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  condition TEXT NOT NULL,
  lifestyle_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  baseline_metrics JSONB DEFAULT '{}'::jsonb,
  projections JSONB DEFAULT '[]'::jsonb,
  insights JSONB DEFAULT '{}'::jsonb,
  narrative TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.treatment_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own simulations"
  ON public.treatment_simulations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own simulations"
  ON public.treatment_simulations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own simulations"
  ON public.treatment_simulations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own simulations"
  ON public.treatment_simulations FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_treatment_simulations_updated_at
  BEFORE UPDATE ON public.treatment_simulations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Visual analyses table
CREATE TABLE public.visual_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  body_location TEXT,
  user_notes TEXT,
  ai_findings JSONB DEFAULT '{}'::jsonb,
  severity TEXT,
  urgency TEXT DEFAULT 'low',
  infection_signs BOOLEAN DEFAULT false,
  alert_sent BOOLEAN DEFAULT false,
  alert_recipient TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.visual_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses"
  ON public.visual_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analyses"
  ON public.visual_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
  ON public.visual_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON public.visual_analyses FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_visual_analyses_user_location
  ON public.visual_analyses(user_id, body_location, created_at DESC);

-- Private storage bucket for wound photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('wound_photos', 'wound_photos', false);

CREATE POLICY "Users can upload own wound photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wound_photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own wound photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'wound_photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own wound photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'wound_photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
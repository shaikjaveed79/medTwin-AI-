
CREATE TABLE public.twin_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  health_score integer DEFAULT 70,
  risk_baseline text DEFAULT 'low',
  last_risk_level text,
  trend text DEFAULT 'stable',
  recurring_symptoms jsonb DEFAULT '[]',
  recurring_conditions jsonb DEFAULT '[]',
  session_count integer DEFAULT 0,
  last_session_at timestamptz,
  contextual_factors jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.twin_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own twin state"
ON public.twin_state FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own twin state"
ON public.twin_state FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own twin state"
ON public.twin_state FOR UPDATE
USING (auth.uid() = user_id);

CREATE TRIGGER update_twin_state_updated_at
BEFORE UPDATE ON public.twin_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

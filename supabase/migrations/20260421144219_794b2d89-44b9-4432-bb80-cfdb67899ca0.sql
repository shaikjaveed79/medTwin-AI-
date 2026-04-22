CREATE POLICY "Users can update own reports"
ON public.medical_reports
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
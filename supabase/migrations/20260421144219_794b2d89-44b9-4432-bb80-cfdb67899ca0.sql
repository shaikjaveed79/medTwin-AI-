CREATE POLICY ""Allow users to update their own reports""
ON public.medical_reports
FOR UPDATE
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);
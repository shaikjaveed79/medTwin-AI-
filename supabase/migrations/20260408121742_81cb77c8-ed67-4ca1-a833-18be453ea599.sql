-- =========================================
-- MedTwin AI Database Schema
-- Author: Rasool Shaik
-- Role: Backend Developer
-- Description: Core schema for health tracking system
-- =========================================

-- Create emergency_contacts table
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL
  REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- =========================================
-- Table: medical_reports
-- Stores uploaded reports and extracted data
-- =========================================

CREATE POLICY "Users can view own contacts" ON public.emergency_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own contacts" ON public.emergency_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.emergency_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON public.emergency_contacts FOR DELETE USING (auth.uid() = user_id);

-- =========================================
-- Table: health_timeline
-- Tracks chronological health events
-- =========================================

INSERT INTO storage.buckets (id, name, public) VALUES ('medical_reports', 'medical_reports', false);

-- Automatically creates user profile on signup

CREATE POLICY "Users can upload own reports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'medical_reports' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own reports" ON storage.objects FOR SELECT USING (bucket_id = 'medical_reports' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own reports" ON storage.objects FOR DELETE USING (bucket_id = 'medical_reports' AND auth.uid()::text = (storage.foldername(name))[1]);

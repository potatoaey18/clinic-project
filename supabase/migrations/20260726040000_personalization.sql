-- ============ Personalization: theme prefs, favorites, branding storage ============

-- Per-user UI preferences
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_mode TEXT NOT NULL DEFAULT 'system' CHECK (theme_mode IN ('light', 'dark', 'system')),
  ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT 'blue' CHECK (accent_color IN ('blue', 'teal', 'violet', 'rose', 'emerald', 'amber'));

-- Pinned/favorite patients (per doctor). "Recently viewed" is derived from
-- audit_logs (action='view', entity='patient') instead of a separate table,
-- since that's already recorded on every patient page visit.
CREATE TABLE IF NOT EXISTS public.patient_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, patient_id)
);
GRANT SELECT, INSERT, DELETE ON public.patient_favorites TO authenticated;
GRANT ALL ON public.patient_favorites TO service_role;
ALTER TABLE public.patient_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites: self read" ON public.patient_favorites
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "favorites: self insert" ON public.patient_favorites
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "favorites: self delete" ON public.patient_favorites
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ Storage buckets ============
-- avatars & clinic-logos are small public-read images; lab-results stays
-- private (added here too in case this project's storage was never bootstrapped
-- with it — safe to run even if it already exists).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 2097152, ARRAY['image/png','image/jpeg','image/webp']),
  ('clinic-logos', 'clinic-logos', true, 2097152, ARRAY['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('lab-results', 'lab-results', false, 20971520, ARRAY['application/pdf','image/png','image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- Avatars: path convention <user_id>/<filename>. Public read (bucket is public),
-- but only the owning user may write/replace/delete their own folder.
CREATE POLICY "avatars public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars self insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (string_to_array(name, '/'))[1] = auth.uid()::text);
CREATE POLICY "avatars self update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());
CREATE POLICY "avatars self delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());

-- Clinic logos: path convention <clinic_id>/<filename>. Public read; only
-- active members of that clinic may upload/replace/remove its logo.
CREATE POLICY "clinic logos public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'clinic-logos');
CREATE POLICY "clinic logos member insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-logos'
    AND public.is_clinic_member((string_to_array(name, '/'))[1]::uuid, auth.uid())
  );
CREATE POLICY "clinic logos member update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'clinic-logos' AND public.is_clinic_member((string_to_array(name, '/'))[1]::uuid, auth.uid()))
  WITH CHECK (bucket_id = 'clinic-logos' AND public.is_clinic_member((string_to_array(name, '/'))[1]::uuid, auth.uid()));
CREATE POLICY "clinic logos member delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'clinic-logos' AND public.is_clinic_member((string_to_array(name, '/'))[1]::uuid, auth.uid()));

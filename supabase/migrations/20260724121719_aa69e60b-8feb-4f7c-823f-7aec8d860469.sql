
-- Lock down search_path & execute on helpers
ALTER FUNCTION public.set_updated_at() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_clinic_created() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_clinic_member(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_clinic_owner(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinic_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinic_owner(uuid, uuid) TO authenticated;

-- Storage policies for lab-results bucket. Path convention: <clinic_id>/<patient_id>/<filename>
CREATE POLICY "labs storage read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'lab-results'
    AND public.is_clinic_member((string_to_array(name, '/'))[1]::uuid, auth.uid())
  );
CREATE POLICY "labs storage insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lab-results'
    AND public.is_clinic_member((string_to_array(name, '/'))[1]::uuid, auth.uid())
  );
CREATE POLICY "labs storage update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lab-results' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'lab-results' AND owner = auth.uid());
CREATE POLICY "labs storage delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lab-results' AND owner = auth.uid());

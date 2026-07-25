
CREATE TYPE public.appointment_status AS ENUM ('scheduled','confirmed','checked_in','completed','cancelled','no_show');

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  reason text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX appointments_clinic_start_idx ON public.appointments(clinic_id, starts_at);
CREATE INDEX appointments_doctor_start_idx ON public.appointments(doctor_id, starts_at);
CREATE INDEX appointments_patient_idx ON public.appointments(patient_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appt: clinic members read" ON public.appointments
  FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "appt: clinic members create" ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "appt: clinic members update" ON public.appointments
  FOR UPDATE TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid())) WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "appt: doctor or owner delete" ON public.appointments
  FOR DELETE TO authenticated USING (doctor_id = auth.uid() OR public.is_clinic_owner(clinic_id, auth.uid()));

CREATE TRIGGER appointments_set_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clinic_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_clinic_idx ON public.audit_logs(clinic_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs(entity, entity_id);
CREATE INDEX audit_logs_user_idx ON public.audit_logs(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit: clinic members read" ON public.audit_logs
  FOR SELECT TO authenticated USING (
    (clinic_id IS NOT NULL AND public.is_clinic_member(clinic_id, auth.uid()))
    OR user_id = auth.uid()
  );
CREATE POLICY "audit: self insert" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());


-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'clinic_owner', 'doctor', 'receptionist', 'nurse');
CREATE TYPE public.clinic_member_role AS ENUM ('owner', 'doctor', 'receptionist', 'nurse');
CREATE TYPE public.consultation_type AS ENUM ('walk_in', 'appointment', 'teleconsult', 'home_visit');
CREATE TYPE public.sex_type AS ENUM ('male', 'female', 'other');

-- ============ HELPER: updated_at ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  license_no TEXT,
  specialty TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ USER ROLES (platform-wide) ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ CLINICS ============
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER clinics_updated BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CLINIC MEMBERS ============
CREATE TABLE public.clinic_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.clinic_member_role NOT NULL DEFAULT 'doctor',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_members TO authenticated;
GRANT ALL ON public.clinic_members TO service_role;
ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_clinic_member(_clinic UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id = _clinic AND user_id = _user AND active);
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_owner(_clinic UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id = _clinic AND user_id = _user AND role = 'owner' AND active);
$$;

-- Clinics policies
CREATE POLICY "clinics: members read" ON public.clinics FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.is_clinic_member(id, auth.uid()));
CREATE POLICY "clinics: any user create own" ON public.clinics FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "clinics: owner update" ON public.clinics FOR UPDATE TO authenticated
  USING (public.is_clinic_owner(id, auth.uid())) WITH CHECK (public.is_clinic_owner(id, auth.uid()));
CREATE POLICY "clinics: owner delete" ON public.clinics FOR DELETE TO authenticated
  USING (public.is_clinic_owner(id, auth.uid()));

-- clinic_members policies
CREATE POLICY "cm: read own memberships" ON public.clinic_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "cm: owner manage" ON public.clinic_members FOR INSERT TO authenticated
  WITH CHECK (public.is_clinic_owner(clinic_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "cm: owner update" ON public.clinic_members FOR UPDATE TO authenticated
  USING (public.is_clinic_owner(clinic_id, auth.uid())) WITH CHECK (public.is_clinic_owner(clinic_id, auth.uid()));
CREATE POLICY "cm: owner delete" ON public.clinic_members FOR DELETE TO authenticated
  USING (public.is_clinic_owner(clinic_id, auth.uid()));

-- Auto-add creator as owner member
CREATE OR REPLACE FUNCTION public.on_clinic_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.clinic_members (clinic_id, user_id, role) VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER clinics_add_owner_member AFTER INSERT ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.on_clinic_created();

-- ============ PATIENTS ============
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  mrn TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  date_of_birth DATE,
  sex public.sex_type,
  civil_status TEXT,
  nationality TEXT,
  address TEXT,
  contact_number TEXT,
  email TEXT,
  occupation TEXT,
  -- Government IDs
  philhealth_no TEXT,
  senior_citizen_id TEXT,
  pwd_id TEXT,
  passport_no TEXT,
  drivers_license_no TEXT,
  -- Medical
  blood_type TEXT,
  allergies TEXT,
  existing_conditions TEXT,
  family_history TEXT,
  surgical_history TEXT,
  current_medications TEXT,
  smoking_history TEXT,
  alcohol_history TEXT,
  pregnancy_history TEXT,
  medical_alerts TEXT,
  -- Insurance
  insurance_provider TEXT,
  insurance_policy_no TEXT,
  -- Emergency
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  photo_url TEXT,
  signature_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX patients_clinic_idx ON public.patients(clinic_id) WHERE deleted_at IS NULL;
CREATE INDEX patients_name_idx ON public.patients(last_name, first_name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER patients_updated BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "patients: clinic members read" ON public.patients FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "patients: clinic members create" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "patients: clinic members update" ON public.patients FOR UPDATE TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid())) WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "patients: owner delete" ON public.patients FOR DELETE TO authenticated
  USING (public.is_clinic_owner(clinic_id, auth.uid()));

-- ============ CONSULTATIONS ============
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id),
  consult_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  consultation_type public.consultation_type NOT NULL DEFAULT 'walk_in',
  chief_complaint TEXT,
  history_present_illness TEXT,
  review_of_systems TEXT,
  physical_exam TEXT,
  assessment TEXT,
  diagnosis TEXT,
  icd10_codes TEXT[],
  treatment_plan TEXT,
  doctor_notes TEXT,
  follow_up_date DATE,
  duration_min INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX consult_patient_idx ON public.consultations(patient_id, consult_date DESC);
CREATE INDEX consult_doctor_idx ON public.consultations(doctor_id, consult_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultations TO authenticated;
GRANT ALL ON public.consultations TO service_role;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER consult_updated BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "consult: clinic members read" ON public.consultations FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "consult: doctors create" ON public.consultations FOR INSERT TO authenticated
  WITH CHECK (doctor_id = auth.uid() AND public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "consult: author update" ON public.consultations FOR UPDATE TO authenticated
  USING (doctor_id = auth.uid()) WITH CHECK (doctor_id = auth.uid());
CREATE POLICY "consult: author delete" ON public.consultations FOR DELETE TO authenticated
  USING (doctor_id = auth.uid());

-- ============ VITALS ============
CREATE TABLE public.vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  bp_systolic INT, bp_diastolic INT,
  heart_rate INT,
  temperature_c NUMERIC(4,1),
  respiratory_rate INT,
  height_cm NUMERIC(5,1),
  weight_kg NUMERIC(5,1),
  bmi NUMERIC(4,1),
  spo2 INT,
  blood_sugar NUMERIC(6,1),
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vitals_patient_idx ON public.vitals(patient_id, recorded_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vitals TO authenticated;
GRANT ALL ON public.vitals TO service_role;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vitals: read via patient" ON public.vitals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = vitals.patient_id AND public.is_clinic_member(p.clinic_id, auth.uid())));
CREATE POLICY "vitals: insert via patient" ON public.vitals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND public.is_clinic_member(p.clinic_id, auth.uid())));
CREATE POLICY "vitals: update own" ON public.vitals FOR UPDATE TO authenticated
  USING (recorded_by = auth.uid()) WITH CHECK (recorded_by = auth.uid());
CREATE POLICY "vitals: delete own" ON public.vitals FOR DELETE TO authenticated
  USING (recorded_by = auth.uid());

-- ============ PRESCRIPTIONS ============
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL REFERENCES auth.users(id),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX rx_patient_idx ON public.prescriptions(patient_id, issued_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rx: clinic members read" ON public.prescriptions FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "rx: doctor create" ON public.prescriptions FOR INSERT TO authenticated
  WITH CHECK (doctor_id = auth.uid() AND public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "rx: author update" ON public.prescriptions FOR UPDATE TO authenticated
  USING (doctor_id = auth.uid()) WITH CHECK (doctor_id = auth.uid());
CREATE POLICY "rx: author delete" ON public.prescriptions FOR DELETE TO authenticated
  USING (doctor_id = auth.uid());

CREATE TABLE public.prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medicine TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  instructions TEXT,
  sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX rx_items_idx ON public.prescription_items(prescription_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescription_items TO authenticated;
GRANT ALL ON public.prescription_items TO service_role;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rx_items: read via rx" ON public.prescription_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.prescriptions r WHERE r.id = prescription_id AND public.is_clinic_member(r.clinic_id, auth.uid())));
CREATE POLICY "rx_items: insert via rx" ON public.prescription_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.prescriptions r WHERE r.id = prescription_id AND r.doctor_id = auth.uid()));
CREATE POLICY "rx_items: update via rx" ON public.prescription_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.prescriptions r WHERE r.id = prescription_id AND r.doctor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.prescriptions r WHERE r.id = prescription_id AND r.doctor_id = auth.uid()));
CREATE POLICY "rx_items: delete via rx" ON public.prescription_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.prescriptions r WHERE r.id = prescription_id AND r.doctor_id = auth.uid()));

-- ============ LAB RESULTS ============
CREATE TABLE public.lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  category TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT,
  notes TEXT,
  result_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lab_patient_idx ON public.lab_results(patient_id, result_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_results TO authenticated;
GRANT ALL ON public.lab_results TO service_role;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "labs: clinic members read" ON public.lab_results FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "labs: clinic members create" ON public.lab_results FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "labs: uploader update" ON public.lab_results FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid()) WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "labs: uploader delete" ON public.lab_results FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

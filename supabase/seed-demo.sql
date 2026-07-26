-- ============================================================
-- Demo data for DocTrack Pinas / MedFolio
-- ============================================================
-- Every table in this app is scoped by Row Level Security to
-- auth.uid(), so seed data can't just use made-up user IDs — it
-- has to belong to a real account. Steps:
--
--   1. Run the app (npm run dev) and sign up once at /auth.
--      This creates your auth.users row + a matching profiles row.
--   2. Find your user id:
--        - Supabase Dashboard -> Authentication -> Users -> copy the UUID, OR
--        - run:  select id, email from auth.users;
--   3. Paste that UUID into v_user_id below, replacing the placeholder.
--   4. Run this whole file in the Supabase SQL Editor
--      (or: supabase db execute -f supabase/seed-demo.sql --linked)
--
-- This uses the service role / SQL editor context, which bypasses
-- RLS, but every row is still correctly attributed to your user so
-- the app's normal RLS-scoped queries will find it afterwards.
-- Safe to re-run: it clears out any previously seeded demo clinic
-- for this user first (matched by name) before reinserting.
-- ============================================================

DO $$
DECLARE
  v_user_id   uuid := 'REPLACE_WITH_YOUR_USER_ID'; -- <-- put your auth user id here
  v_clinic_id uuid;
  v_p1 uuid; v_p2 uuid; v_p3 uuid; v_p4 uuid; v_p5 uuid; v_p6 uuid; v_p7 uuid; v_p8 uuid;
  v_c1 uuid; v_c2 uuid; v_c3 uuid;
  v_rx1 uuid;
BEGIN
  IF v_user_id = 'REPLACE_WITH_YOUR_USER_ID' THEN
    RAISE EXCEPTION 'Set v_user_id to your real auth.users id before running this script (see the header comment).';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'No auth.users row with id %. Sign up in the app first, then re-check the id.', v_user_id;
  END IF;

  -- Clean up any previous run for this user (idempotent re-seed)
  DELETE FROM public.clinics WHERE owner_id = v_user_id AND name = 'Bayanihan Family Clinic';

  -- ---------- Clinic ----------
  INSERT INTO public.clinics (name, address, phone, email, owner_id)
  VALUES (
    'Bayanihan Family Clinic',
    '2F JC Building, Katipunan Ave, Quezon City, Metro Manila',
    '+63 2 8123 4567',
    'frontdesk@bayanihanclinic.ph',
    v_user_id
  )
  RETURNING id INTO v_clinic_id;
  -- (a trigger auto-adds v_user_id as the 'owner' clinic_member)

  -- Give the seeded doctor a realistic profile if it's still blank
  UPDATE public.profiles
  SET full_name = COALESCE(NULLIF(full_name, ''), 'Dr. Maria Santos'),
      license_no = COALESCE(NULLIF(license_no, ''), 'PRC-0123456'),
      specialty = COALESCE(NULLIF(specialty, ''), 'Family Medicine')
  WHERE id = v_user_id;

  -- ---------- Patients ----------
  INSERT INTO public.patients (clinic_id, first_name, last_name, middle_name, date_of_birth, sex, civil_status, nationality, address, contact_number, email, occupation, philhealth_no, blood_type, allergies, existing_conditions, current_medications, created_by)
  VALUES (v_clinic_id, 'Juan', 'Dela Cruz', 'Reyes', '1985-03-14', 'male', 'Married', 'Filipino', 'Blk 5 Lot 12, Marikina Heights, Marikina City', '+63 917 234 5678', 'juan.delacruz@gmail.com', 'Jeepney operator', '12-345678901-2', 'O+', 'Penicillin', 'Hypertension', 'Losartan 50mg OD', v_user_id)
  RETURNING id INTO v_p1;

  INSERT INTO public.patients (clinic_id, first_name, last_name, middle_name, date_of_birth, sex, civil_status, nationality, address, contact_number, email, occupation, philhealth_no, blood_type, allergies, existing_conditions, created_by)
  VALUES (v_clinic_id, 'Maria', 'Santos', 'Garcia', '1992-07-22', 'female', 'Single', 'Filipino', '45 Aurora Blvd, Cubao, Quezon City', '+63 918 345 6789', 'maria.santos92@gmail.com', 'Call center agent', '34-567890123-4', 'A+', NULL, NULL, v_user_id)
  RETURNING id INTO v_p2;

  INSERT INTO public.patients (clinic_id, first_name, last_name, middle_name, date_of_birth, sex, civil_status, nationality, address, contact_number, occupation, philhealth_no, blood_type, allergies, existing_conditions, current_medications, created_by)
  VALUES (v_clinic_id, 'Pedro', 'Reyes', 'Manalo', '1958-11-02', 'male', 'Widowed', 'Filipino', '78 Rizal St, Marikina City', '+63 919 456 7890', 'Retired teacher', '56-789012345-6', 'B+', 'Sulfa drugs', 'Type 2 Diabetes, Hypertension', 'Metformin 500mg BID, Amlodipine 5mg OD', v_user_id)
  RETURNING id INTO v_p3;

  INSERT INTO public.patients (clinic_id, first_name, last_name, middle_name, date_of_birth, sex, civil_status, nationality, address, contact_number, email, occupation, philhealth_no, blood_type, created_by)
  VALUES (v_clinic_id, 'Angelica', 'Torres', 'Bautista', '2001-01-30', 'female', 'Single', 'Filipino', '12 Mabini St, Cainta, Rizal', '+63 920 567 8901', 'angelica.torres@yahoo.com', 'College student', '78-901234567-8', 'AB+', v_user_id)
  RETURNING id INTO v_p4;

  INSERT INTO public.patients (clinic_id, first_name, last_name, date_of_birth, sex, civil_status, nationality, address, contact_number, occupation, philhealth_no, blood_type, allergies, existing_conditions, created_by)
  VALUES (v_clinic_id, 'Ramon', 'Villanueva', '1975-05-19', 'male', 'Married', 'Filipino', '33 Bonifacio Ave, Pasig City', '+63 921 678 9012', 'Construction foreman', '90-123456789-0', 'O-', NULL, 'Asthma', v_user_id)
  RETURNING id INTO v_p5;

  INSERT INTO public.patients (clinic_id, first_name, last_name, middle_name, date_of_birth, sex, civil_status, nationality, address, contact_number, email, occupation, philhealth_no, blood_type, created_by)
  VALUES (v_clinic_id, 'Liza', 'Mendoza', 'Cruz', '1998-09-08', 'female', 'Single', 'Filipino', '5 Katipunan Ext, Marikina City', '+63 922 789 0123', 'liza.mendoza@gmail.com', 'Nurse', '11-222333444-5', 'A-', v_user_id)
  RETURNING id INTO v_p6;

  INSERT INTO public.patients (clinic_id, first_name, last_name, date_of_birth, sex, civil_status, nationality, address, contact_number, occupation, philhealth_no, blood_type, allergies, senior_citizen_id, created_by)
  VALUES (v_clinic_id, 'Antonio', 'Gonzales', '1950-02-27', 'male', 'Married', 'Filipino', '19 Del Pilar St, San Juan City', '+63 923 890 1234', 'Retired', '22-333444555-6', 'B-', 'Aspirin', 'SC-2024-0451', v_user_id)
  RETURNING id INTO v_p7;

  INSERT INTO public.patients (clinic_id, first_name, last_name, middle_name, date_of_birth, sex, civil_status, nationality, address, contact_number, email, occupation, philhealth_no, blood_type, created_by)
  VALUES (v_clinic_id, 'Katrina', 'Aquino', 'Ramos', '2015-06-11', 'female', 'Single', 'Filipino', '5 Katipunan Ext, Marikina City', '+63 922 789 0123', NULL, 'Student (Grade 4)', '33-444555666-7', 'A+', v_user_id)
  RETURNING id INTO v_p8;

  -- ---------- Consultations ----------
  INSERT INTO public.consultations (patient_id, clinic_id, doctor_id, consult_date, consultation_type, chief_complaint, history_present_illness, physical_exam, assessment, diagnosis, treatment_plan, follow_up_date)
  VALUES (v_p1, v_clinic_id, v_user_id, now() - interval '3 days', 'walk_in', 'Headache and dizziness for 2 days',
    'Patient reports intermittent frontal headache, worse in the afternoon, no visual disturbance. Denies fever or trauma.',
    'BP 150/95, HR 88. Alert, no focal neuro deficits.',
    'Uncontrolled hypertension likely contributing to symptoms.',
    'Essential hypertension, stage 2',
    'Increase Losartan to 100mg OD, low-salt diet, home BP monitoring, recheck in 2 weeks.',
    (current_date + interval '14 days')::date)
  RETURNING id INTO v_c1;

  INSERT INTO public.consultations (patient_id, clinic_id, doctor_id, consult_date, consultation_type, chief_complaint, physical_exam, assessment, diagnosis, treatment_plan)
  VALUES (v_p2, v_clinic_id, v_user_id, now() - interval '1 day', 'appointment', 'Annual physical exam, no complaints',
    'BP 110/70, HR 72, BMI 21.4. Unremarkable exam.',
    'Healthy adult, routine screening.',
    'Well visit', 'Continue current lifestyle, repeat CBC and lipid panel next visit.')
  RETURNING id INTO v_c2;

  INSERT INTO public.consultations (patient_id, clinic_id, doctor_id, consult_date, consultation_type, chief_complaint, history_present_illness, physical_exam, assessment, diagnosis, treatment_plan, follow_up_date)
  VALUES (v_p3, v_clinic_id, v_user_id, now() - interval '10 days', 'appointment', 'Follow-up for diabetes and hypertension',
    'Compliant with medications. Occasional numbness in feet.',
    'BP 138/86, HR 76, FBS 142 mg/dL. Decreased sensation both feet on monofilament test.',
    'Diabetic peripheral neuropathy, blood pressure at goal.',
    'Type 2 Diabetes Mellitus with early peripheral neuropathy',
    'Continue Metformin and Amlodipine, start Gabapentin 100mg at night, refer to podiatry, HbA1c in 3 months.',
    (current_date + interval '30 days')::date)
  RETURNING id INTO v_c3;

  INSERT INTO public.consultations (patient_id, clinic_id, doctor_id, consult_date, consultation_type, chief_complaint, physical_exam, assessment, diagnosis, treatment_plan, follow_up_date)
  VALUES (v_p5, v_clinic_id, v_user_id, now() - interval '5 days', 'walk_in', 'Shortness of breath and wheezing',
    'RR 22, mild bilateral expiratory wheeze, O2 sat 96% room air.',
    'Mild asthma exacerbation, likely triggered by dust exposure at work site.',
    'Asthma exacerbation, mild',
    'Salbutamol nebulization given in clinic, prescribed rescue inhaler, avoid dust exposure, follow up if not improving.',
    (current_date + interval '7 days')::date);

  -- ---------- Vitals ----------
  INSERT INTO public.vitals (patient_id, bp_systolic, bp_diastolic, heart_rate, temperature_c, respiratory_rate, spo2, weight_kg, height_cm, recorded_by, recorded_at)
  VALUES (v_p1, 150, 95, 88, 36.8, 18, 98, 78.5, 170, v_user_id, now() - interval '3 days');
  INSERT INTO public.vitals (patient_id, bp_systolic, bp_diastolic, heart_rate, temperature_c, respiratory_rate, spo2, weight_kg, height_cm, recorded_by, recorded_at)
  VALUES (v_p2, 110, 70, 72, 36.5, 16, 99, 58.0, 160, v_user_id, now() - interval '1 day');
  INSERT INTO public.vitals (patient_id, bp_systolic, bp_diastolic, heart_rate, temperature_c, respiratory_rate, spo2, weight_kg, height_cm, blood_sugar, recorded_by, recorded_at)
  VALUES (v_p3, 138, 86, 76, 36.6, 18, 97, 82.0, 165, 142, v_user_id, now() - interval '10 days');
  INSERT INTO public.vitals (patient_id, bp_systolic, bp_diastolic, heart_rate, respiratory_rate, spo2, weight_kg, height_cm, recorded_by, recorded_at)
  VALUES (v_p5, 128, 82, 94, 22, 96, 70.0, 172, v_user_id, now() - interval '5 days');

  -- ---------- Prescription (for Juan's consult) ----------
  INSERT INTO public.prescriptions (patient_id, consultation_id, doctor_id, clinic_id, issued_at, notes)
  VALUES (v_p1, v_c1, v_user_id, v_clinic_id, now() - interval '3 days', 'Take with food. Return if BP remains above 140/90 after 1 week.')
  RETURNING id INTO v_rx1;
  INSERT INTO public.prescription_items (prescription_id, medicine, dosage, frequency, duration, instructions, sort_order) VALUES
    (v_rx1, 'Losartan', '100mg', 'Once daily', '30 days', 'Take in the morning', 1),
    (v_rx1, 'Amlodipine', '5mg', 'Once daily', '30 days', 'Take at night', 2);

  INSERT INTO public.prescriptions (patient_id, consultation_id, doctor_id, clinic_id, issued_at, notes)
  VALUES (v_p3, v_c3, v_user_id, v_clinic_id, now() - interval '10 days', 'Diabetic foot care counseling provided.')
  RETURNING id INTO v_rx1;
  INSERT INTO public.prescription_items (prescription_id, medicine, dosage, frequency, duration, instructions, sort_order) VALUES
    (v_rx1, 'Metformin', '500mg', 'Twice daily', '90 days', 'Take with meals', 1),
    (v_rx1, 'Gabapentin', '100mg', 'Once daily at night', '30 days', 'May cause drowsiness', 2);

  -- ---------- Appointments (this week) ----------
  INSERT INTO public.appointments (clinic_id, patient_id, doctor_id, starts_at, ends_at, status, reason, created_by) VALUES
    (v_clinic_id, v_p4, v_user_id, date_trunc('day', now()) + interval '9 hours',  date_trunc('day', now()) + interval '9 hours 30 minutes',  'confirmed', 'Pre-employment physical exam', v_user_id),
    (v_clinic_id, v_p6, v_user_id, date_trunc('day', now()) + interval '10 hours', date_trunc('day', now()) + interval '10 hours 30 minutes', 'scheduled', 'Consultation for recurring migraines', v_user_id),
    (v_clinic_id, v_p8, v_user_id, date_trunc('day', now()) + interval '1 day 9 hours',  date_trunc('day', now()) + interval '1 day 9 hours 20 minutes', 'scheduled', 'Well-child checkup', v_user_id),
    (v_clinic_id, v_p7, v_user_id, date_trunc('day', now()) + interval '1 day 14 hours', date_trunc('day', now()) + interval '1 day 14 hours 30 minutes', 'scheduled', 'Senior citizen wellness check', v_user_id),
    (v_clinic_id, v_p2, v_user_id, date_trunc('day', now()) - interval '1 day' + interval '11 hours', date_trunc('day', now()) - interval '1 day' + interval '11 hours 30 minutes', 'completed', 'Annual physical exam', v_user_id);

  -- ---------- Audit log samples ----------
  INSERT INTO public.audit_logs (user_id, clinic_id, action, entity, entity_id) VALUES
    (v_user_id, v_clinic_id, 'create', 'patient', v_p1),
    (v_user_id, v_clinic_id, 'view', 'patient', v_p3),
    (v_user_id, v_clinic_id, 'create', 'consultation', v_c1),
    (v_user_id, v_clinic_id, 'print', 'prescription', v_rx1);

  RAISE NOTICE 'Seed complete: clinic %, % patients, appointments and consultations added.', v_clinic_id, 8;
END $$;

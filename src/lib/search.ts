import { supabase } from "@/integrations/supabase/client";

export type PatientHit = {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  date_of_birth: string | null;
  contact_number: string | null;
  clinic: { id: string; name: string } | null;
};

export type ConsultationHit = {
  id: string;
  consult_date: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  patient: { id: string; first_name: string; last_name: string } | null;
};

export type AppointmentHit = {
  id: string;
  starts_at: string;
  reason: string | null;
  status: string;
  patient: { id: string; first_name: string; last_name: string } | null;
};

export type ClinicHit = { id: string; name: string };

/** RLS already scopes every query below to clinics the current user belongs to. */

export async function searchPatients(query: string, limit = 8): Promise<PatientHit[]> {
  const q = query.trim();
  if (!q) return [];
  const { data } = await supabase
    .from("patients")
    .select("id, first_name, last_name, middle_name, date_of_birth, contact_number, clinic:clinics(id, name)")
    .is("deleted_at", null)
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,mrn.ilike.%${q}%,contact_number.ilike.%${q}%`)
    .order("last_name")
    .limit(limit);
  return (data ?? []) as unknown as PatientHit[];
}

export async function searchConsultations(query: string, limit = 6): Promise<ConsultationHit[]> {
  const q = query.trim();
  if (!q) return [];
  const { data } = await supabase
    .from("consultations")
    .select("id, consult_date, chief_complaint, diagnosis, patient:patients(id, first_name, last_name)")
    .or(`chief_complaint.ilike.%${q}%,diagnosis.ilike.%${q}%,assessment.ilike.%${q}%`)
    .order("consult_date", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as ConsultationHit[];
}

export async function searchAppointments(query: string, limit = 6): Promise<AppointmentHit[]> {
  const q = query.trim();
  if (!q) return [];
  const { data } = await supabase
    .from("appointments")
    .select("id, starts_at, reason, status, patient:patients(id, first_name, last_name)")
    .ilike("reason", `%${q}%`)
    .order("starts_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as AppointmentHit[];
}

export async function searchClinics(query: string, limit = 5): Promise<ClinicHit[]> {
  const q = query.trim();
  if (!q) return [];
  const { data } = await supabase
    .from("clinics")
    .select("id, name")
    .is("deleted_at", null)
    .ilike("name", `%${q}%`)
    .limit(limit);
  return (data ?? []) as ClinicHit[];
}

export async function searchEverything(query: string) {
  const [patients, consultations, appointments, clinics] = await Promise.all([
    searchPatients(query),
    searchConsultations(query),
    searchAppointments(query),
    searchClinics(query),
  ]);
  return { patients, consultations, appointments, clinics };
}

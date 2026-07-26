import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Search,
  Trash2,
  Stethoscope,
  CalendarClock,
  Activity,
  Pill,
} from "lucide-react";
import { ageFrom, formatDate, formatDateTime, fullName } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { searchPatients, type PatientHit } from "@/lib/search";

export const Route = createFileRoute("/_authenticated/consultations/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    patientId: typeof search.patientId === "string" ? search.patientId : undefined,
    appointmentId: typeof search.appointmentId === "string" ? search.appointmentId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "New Consultation — MedFolio" },
      { name: "description", content: "Record a new patient consultation." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewConsultationScreen,
});

function NewConsultationScreen() {
  const { patientId, appointmentId } = Route.useSearch();
  const navigate = useNavigate();

  if (!patientId) {
    return <PatientPickerScreen appointmentId={appointmentId} />;
  }
  return <ConsultationForm patientId={patientId} appointmentId={appointmentId} onBack={() => navigate({ to: "/consultations" })} />;
}

// ---------------------------------------------------------------------------
// Step 1: pick a patient (skipped if we arrived with ?patientId=... already,
// e.g. from a patient's own record or from "Start consultation" on a visit)
// ---------------------------------------------------------------------------
function PatientPickerScreen({ appointmentId }: { appointmentId?: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data: results = [], isFetching } = useQuery({
    queryKey: ["consult-patient-search", q],
    queryFn: () => searchPatients(q, 10),
    enabled: q.trim().length > 1,
  });

  function pick(p: PatientHit) {
    navigate({ to: "/consultations/new", search: { patientId: p.id, appointmentId }, replace: true });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/consultations"><ArrowLeft className="mr-1 h-4 w-4" /> Consultations</Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New consultation</h1>
        <p className="text-sm text-muted-foreground">Search for the patient you're seeing.</p>
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, MRN, or contact number…"
              className="pl-9"
            />
          </div>
          {q.trim().length > 1 && (
            <div className="divide-y divide-border rounded-md border border-border">
              {isFetching ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Searching…</div>
              ) : results.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No patients found.</div>
              ) : (
                results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => pick(p)}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm hover:bg-accent"
                  >
                    <div>
                      <div className="font-medium">{fullName(p)}</div>
                      <div className="text-xs text-muted-foreground">
                        {ageFrom(p.date_of_birth) ?? "—"} yrs · {p.contact_number ?? "no contact number"}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{p.clinic?.name ?? "—"}</Badge>
                  </button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: the actual two-column consultation screen
// ---------------------------------------------------------------------------
type RxItem = { medicine: string; dosage: string; frequency: string; duration: string; instructions: string };
const emptyRxItem = (): RxItem => ({ medicine: "", dosage: "", frequency: "", duration: "", instructions: "" });

function ConsultationForm({ patientId, appointmentId, onBack }: { patientId: string; appointmentId?: string; onBack: () => void }) {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("*, clinic:clinics(id, name)").eq("id", patientId).maybeSingle();
      return data;
    },
  });

  const { data: appointment } = useQuery({
    queryKey: ["appointment", appointmentId],
    enabled: !!appointmentId,
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("*").eq("id", appointmentId!).maybeSingle();
      return data;
    },
  });

  const { data: latestVitals } = useQuery({
    queryKey: ["vitals", "latest", patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("vitals")
        .select("*")
        .eq("patient_id", patientId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["consultations", "history", patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("consultations")
        .select("id, consult_date, diagnosis, chief_complaint")
        .eq("patient_id", patientId)
        .order("consult_date", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  const [f, setF] = useState({
    consultation_type: (appointmentId ? "appointment" : "walk_in") as "walk_in" | "appointment" | "teleconsult" | "home_visit",
    chief_complaint: "",
    history_present_illness: "",
    physical_exam: "",
    assessment: "",
    diagnosis: "",
    treatment_plan: "",
    follow_up_date: "",
  });
  const [rxItems, setRxItems] = useState<RxItem[]>([]);

  const canSave = f.chief_complaint.trim() || f.assessment.trim() || f.diagnosis.trim();

  const m = useMutation({
    mutationFn: async () => {
      if (!patient) throw new Error("Patient not loaded");
      const { data: consult, error } = await supabase
        .from("consultations")
        .insert({
          patient_id: patient.id,
          clinic_id: patient.clinic_id,
          doctor_id: user.id,
          consultation_type: f.consultation_type,
          chief_complaint: f.chief_complaint || null,
          history_present_illness: f.history_present_illness || null,
          physical_exam: f.physical_exam || null,
          assessment: f.assessment || null,
          diagnosis: f.diagnosis || null,
          treatment_plan: f.treatment_plan || null,
          follow_up_date: f.follow_up_date || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const validItems = rxItems.filter((i) => i.medicine.trim());
      if (validItems.length > 0) {
        const { data: rx, error: rxE } = await supabase
          .from("prescriptions")
          .insert({ patient_id: patient.id, clinic_id: patient.clinic_id, doctor_id: user.id, consultation_id: consult.id })
          .select("id")
          .single();
        if (rxE) throw rxE;
        const { error: itemsE } = await supabase.from("prescription_items").insert(
          validItems.map((it, idx) => ({
            prescription_id: rx.id,
            medicine: it.medicine,
            dosage: it.dosage || null,
            frequency: it.frequency || null,
            duration: it.duration || null,
            instructions: it.instructions || null,
            sort_order: idx,
          })),
        );
        if (itemsE) throw itemsE;
      }

      if (appointmentId) {
        await supabase.from("appointments").update({ status: "completed" }).eq("id", appointmentId);
        await logAudit({ action: "update", entity: "appointment", entity_id: appointmentId, metadata: { status: "completed" } });
      }

      await logAudit({ action: "create", entity: "consultation", entity_id: consult.id, clinic_id: patient.clinic_id });
      return consult.id;
    },
    onSuccess: () => {
      toast.success("Consultation saved");
      qc.invalidateQueries({ queryKey: ["consultations"] });
      qc.invalidateQueries({ queryKey: ["prescriptions"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      navigate({ to: "/patients/$patientId", params: { patientId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save consultation"),
  });

  if (patientLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!patient) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Patient not found.</p>
        <Button variant="link" onClick={onBack}>Back to consultations</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <div>
            <div className="text-sm font-semibold">{fullName(patient)}</div>
            <div className="text-xs text-muted-foreground">
              {ageFrom(patient.date_of_birth) ?? "—"} yrs · <span className="capitalize">{patient.sex ?? "—"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onBack} disabled={m.isPending}>Cancel</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !canSave}>
            {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save consultation
          </Button>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 p-6 lg:grid-cols-[320px_1fr]">
        {/* Left: patient context */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Patient</span>
                <Badge variant="secondary" className="rounded-sm font-normal">{(patient.clinic as { name?: string } | null)?.name ?? "—"}</Badge>
              </div>
              <Link to="/patients/$patientId" params={{ patientId: patient.id }} className="block font-medium hover:underline">
                {fullName(patient)}
              </Link>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>DOB: {formatDate(patient.date_of_birth)}</div>
                <div className="capitalize">Sex: {patient.sex ?? "—"}</div>
                <div>Blood type: {patient.blood_type ?? "—"}</div>
                <div>Contact: {patient.contact_number ?? "—"}</div>
              </div>
              {patient.allergies && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                  <span className="font-semibold">Allergies:</span> {patient.allergies}
                </div>
              )}
              {patient.existing_conditions && (
                <div className="text-xs"><span className="text-muted-foreground">Conditions:</span> {patient.existing_conditions}</div>
              )}
              {patient.current_medications && (
                <div className="text-xs"><span className="text-muted-foreground">Current meds:</span> {patient.current_medications}</div>
              )}
            </CardContent>
          </Card>

          {appointment && (
            <Card>
              <CardContent className="space-y-1 p-4 text-sm">
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" /> This visit
                </div>
                <div>{formatDateTime(appointment.starts_at)}</div>
                {appointment.reason && <div className="text-muted-foreground">{appointment.reason}</div>}
              </CardContent>
            </Card>
          )}

          {latestVitals && (
            <Card>
              <CardContent className="space-y-2 p-4 text-sm">
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" /> Latest vitals
                  <span className="ml-auto normal-case text-muted-foreground/70">{formatDate(latestVitals.recorded_at)}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div>BP: {latestVitals.bp_systolic ? `${latestVitals.bp_systolic}/${latestVitals.bp_diastolic ?? "?"}` : "—"}</div>
                  <div>HR: {latestVitals.heart_rate ?? "—"}</div>
                  <div>Temp: {latestVitals.temperature_c ? `${latestVitals.temperature_c}°C` : "—"}</div>
                  <div>SpO₂: {latestVitals.spo2 ? `${latestVitals.spo2}%` : "—"}</div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="space-y-2 p-4 text-sm">
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                <Stethoscope className="h-3.5 w-3.5" /> Previous consultations
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground">No prior consultations.</p>
              ) : (
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="border-l-2 border-border pl-2">
                      <div className="text-xs text-muted-foreground">{formatDate(h.consult_date)}</div>
                      <div className="truncate text-xs">{h.diagnosis ?? h.chief_complaint ?? "—"}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: SOAP form */}
        <div className="space-y-5">
          <div className="max-w-xs">
            <Label>Consultation type</Label>
            <Select value={f.consultation_type} onValueChange={(v) => setF({ ...f, consultation_type: v as typeof f.consultation_type })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="walk_in">Walk-in</SelectItem>
                <SelectItem value="appointment">Appointment</SelectItem>
                <SelectItem value="teleconsult">Teleconsult</SelectItem>
                <SelectItem value="home_visit">Home visit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Section title="Subjective">
            <Field label="Chief complaint">
              <Textarea rows={2} value={f.chief_complaint} onChange={(e) => setF({ ...f, chief_complaint: e.target.value })} />
            </Field>
            <Field label="History of present illness">
              <Textarea rows={2} value={f.history_present_illness} onChange={(e) => setF({ ...f, history_present_illness: e.target.value })} />
            </Field>
          </Section>

          <Section title="Objective">
            <Field label="Physical exam">
              <Textarea rows={2} value={f.physical_exam} onChange={(e) => setF({ ...f, physical_exam: e.target.value })} />
            </Field>
          </Section>

          <Section title="Assessment">
            <Field label="Assessment">
              <Textarea rows={2} value={f.assessment} onChange={(e) => setF({ ...f, assessment: e.target.value })} />
            </Field>
            <Field label="Diagnosis">
              <Textarea rows={2} value={f.diagnosis} onChange={(e) => setF({ ...f, diagnosis: e.target.value })} />
            </Field>
          </Section>

          <Section title="Plan">
            <Field label="Treatment plan">
              <Textarea rows={2} value={f.treatment_plan} onChange={(e) => setF({ ...f, treatment_plan: e.target.value })} />
            </Field>
            <Field label="Follow-up date">
              <Input type="date" className="max-w-xs" value={f.follow_up_date} onChange={(e) => setF({ ...f, follow_up_date: e.target.value })} />
            </Field>

            <div className="rounded-md border border-border">
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Pill className="h-3.5 w-3.5" /> Prescription
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setRxItems((r) => [...r, emptyRxItem()])}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add medicine
                </Button>
              </div>
              {rxItems.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">No medicines added. This consultation can still be saved without a prescription.</p>
              ) : (
                <div className="divide-y divide-border">
                  {rxItems.map((item, idx) => (
                    <div key={idx} className="space-y-2 p-3">
                      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                        <div className="grid gap-2 md:grid-cols-4">
                          <Input placeholder="Medicine" value={item.medicine} onChange={(e) => updateRx(setRxItems, idx, { medicine: e.target.value })} />
                          <Input placeholder="Dosage" value={item.dosage} onChange={(e) => updateRx(setRxItems, idx, { dosage: e.target.value })} />
                          <Input placeholder="Frequency" value={item.frequency} onChange={(e) => updateRx(setRxItems, idx, { frequency: e.target.value })} />
                          <Input placeholder="Duration" value={item.duration} onChange={(e) => updateRx(setRxItems, idx, { duration: e.target.value })} />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setRxItems((r) => r.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                      <Input placeholder="Instructions (optional)" value={item.instructions} onChange={(e) => updateRx(setRxItems, idx, { instructions: e.target.value })} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function updateRx(setRxItems: Dispatch<SetStateAction<RxItem[]>>, idx: number, patch: Partial<RxItem>) {
  setRxItems((items) => items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

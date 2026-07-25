import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ClipboardList, FlaskConical, Pill, Stethoscope, Activity, Plus, Loader2, FileText, ExternalLink, Printer, UploadCloud } from "lucide-react";
import { ageFrom, formatDate, formatDateTime, fullName } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { generatePrescriptionPdf } from "@/lib/rx-pdf";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/patients/$patientId")({
  head: () => ({
    meta: [
      { title: "Patient — MedFolio" },
      { name: "description", content: "Patient medical record and history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PatientDetail,
});

function PatientDetail() {
  const { patientId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  useEffect(() => {
    logAudit({ action: "view", entity: "patient", entity_id: patientId });
  }, [patientId]);

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("*, clinic:clinics(id, name)").eq("id", patientId).maybeSingle();
      return data;
    },
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ["consultations", patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("consultations")
        .select("*")
        .eq("patient_id", patientId)
        .order("consult_date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: vitals = [] } = useQuery({
    queryKey: ["vitals", patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("vitals")
        .select("*")
        .eq("patient_id", patientId)
        .order("recorded_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ["prescriptions", patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("prescriptions")
        .select("*, items:prescription_items(*)")
        .eq("patient_id", patientId)
        .order("issued_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: labs = [] } = useQuery({
    queryKey: ["labs", patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lab_results")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!patient) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Patient not found.</p>
        <Button variant="link" onClick={() => navigate({ to: "/patients" })}>
          Back to patients
        </Button>
      </div>
    );
  }

  type EventItem =
    | { kind: "consult"; when: string; title: string; sub: string; id: string }
    | { kind: "vitals"; when: string; title: string; sub: string; id: string }
    | { kind: "rx"; when: string; title: string; sub: string; id: string }
    | { kind: "lab"; when: string; title: string; sub: string; id: string };
  const timeline: EventItem[] = [
    ...consultations.map((c): EventItem => ({
      kind: "consult",
      when: c.consult_date,
      title: "Consultation",
      sub: c.chief_complaint || c.diagnosis || "SOAP recorded",
      id: c.id,
    })),
    ...vitals.map((v): EventItem => ({
      kind: "vitals",
      when: v.recorded_at,
      title: "Vitals recorded",
      sub: [v.bp_systolic && `BP ${v.bp_systolic}/${v.bp_diastolic}`, v.heart_rate && `HR ${v.heart_rate}`, v.temperature_c && `Temp ${v.temperature_c}°C`]
        .filter(Boolean)
        .join(" · "),
      id: v.id,
    })),
    ...prescriptions.map((r): EventItem => ({
      kind: "rx",
      when: r.issued_at,
      title: "Prescription issued",
      sub: (r.items ?? []).map((i: { medicine: string }) => i.medicine).slice(0, 3).join(", "),
      id: r.id,
    })),
    ...labs.map((l): EventItem => ({
      kind: "lab",
      when: l.created_at,
      title: `Lab: ${l.title}`,
      sub: l.category || "Uploaded",
      id: l.id,
    })),
  ].sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

  const iconOf = { consult: Stethoscope, vitals: Activity, rx: Pill, lab: FlaskConical };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/patients" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Patients
        </Button>
        <div className="flex gap-2">
          <NewVitalsDialog patientId={patient.id} userId={user.id} />
          <NewLabDialog patientId={patient.id} clinicId={patient.clinic_id} userId={user.id} />
          <Button asChild>
            <Link to="/consultations/new" search={{ patientId: patient.id }}>
              <ClipboardList className="mr-1 h-4 w-4" /> New consultation
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
              {initialsOf(patient)}
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{fullName(patient)}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span>{ageFrom(patient.date_of_birth) ?? "—"} yrs</span>
                <span className="text-border">·</span>
                <span className="capitalize">{patient.sex ?? "—"}</span>
                <span className="text-border">·</span>
                <span>{patient.contact_number ?? "—"}</span>
                <span className="text-border">·</span>
                <Badge variant="secondary" className="rounded-sm font-normal">
                  {(patient.clinic as { name?: string } | null)?.name ?? "—"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-3 text-sm md:grid-cols-4 md:border-t-0 md:border-l md:pt-0 md:pl-6">
            <Info label="Blood type" v={patient.blood_type} />
            <Info label="PhilHealth" v={patient.philhealth_no} />
            <Info label="Allergies" v={patient.allergies} highlight />
            <Info label="Conditions" v={patient.existing_conditions} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="timeline">
        <TabsList className="h-9 rounded-md bg-muted p-0.5">
          <TabsTrigger value="timeline" className="rounded-sm text-xs">Timeline</TabsTrigger>
          <TabsTrigger value="consults" className="rounded-sm text-xs">Consultations ({consultations.length})</TabsTrigger>
          <TabsTrigger value="rx" className="rounded-sm text-xs">Prescriptions ({prescriptions.length})</TabsTrigger>
          <TabsTrigger value="labs" className="rounded-sm text-xs">Lab results ({labs.length})</TabsTrigger>
          <TabsTrigger value="vitals" className="rounded-sm text-xs">Vitals ({vitals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-4">
              {timeline.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No events yet.</p>
              ) : (
                <ol className="divide-y divide-border">
                  {timeline.map((e) => {
                    const Icon = iconOf[e.kind];
                    return (
                      <li key={e.kind + e.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-muted text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <div className="font-medium">{e.title}</div>
                            <div className="shrink-0 text-xs text-muted-foreground">{formatDateTime(e.when)}</div>
                          </div>
                          {e.sub && <div className="truncate text-sm text-muted-foreground">{e.sub}</div>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consults" className="space-y-3">
          {consultations.length === 0 && <Empty text="No consultations yet." />}
          {consultations.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {formatDateTime(c.consult_date)} · <span className="text-muted-foreground">{c.consultation_type?.replace("_", " ")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {c.chief_complaint && <Row label="Chief complaint" v={c.chief_complaint} />}
                {c.history_present_illness && <Row label="HPI" v={c.history_present_illness} />}
                {c.physical_exam && <Row label="Physical exam" v={c.physical_exam} />}
                {c.assessment && <Row label="Assessment" v={c.assessment} />}
                {c.diagnosis && <Row label="Diagnosis" v={c.diagnosis} />}
                {c.treatment_plan && <Row label="Treatment plan" v={c.treatment_plan} />}
                {c.follow_up_date && <Row label="Follow-up" v={formatDate(c.follow_up_date)} />}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rx" className="space-y-3">
          {prescriptions.length === 0 && <Empty text="No prescriptions yet." />}
          {prescriptions.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Rx · {formatDate(r.issued_at)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {(r.items ?? []).map((it: { id: string; medicine: string; dosage?: string | null; frequency?: string | null; duration?: string | null; instructions?: string | null }) => (
                  <div key={it.id} className="rounded-md border border-border p-2">
                    <div className="font-medium">{it.medicine}</div>
                    <div className="text-xs text-muted-foreground">
                      {[it.dosage, it.frequency, it.duration].filter(Boolean).join(" · ")}
                    </div>
                    {it.instructions && <div className="mt-1 text-xs">{it.instructions}</div>}
                  </div>
                ))}
                {r.notes && <p className="text-muted-foreground">{r.notes}</p>}
                <div className="pt-2">
                  <PrintRxButton rx={r} patient={patient} doctorId={user.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="labs" className="space-y-3">
          {labs.length === 0 && <Empty text="No lab results uploaded yet." />}
          {labs.map((l) => (
            <Card key={l.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-muted text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{l.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {[l.category, l.result_date ? formatDate(l.result_date) : formatDate(l.created_at)].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
                <OpenLabButton path={l.file_path} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="vitals" className="space-y-3">
          {vitals.length === 0 && <Empty text="No vitals recorded yet." />}
          {vitals.length > 0 && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                      <th className="p-2 font-medium">Recorded</th>
                      <th className="p-2 font-medium">BP</th>
                      <th className="p-2 font-medium">HR</th>
                      <th className="p-2 font-medium">Temp</th>
                      <th className="p-2 font-medium">RR</th>
                      <th className="p-2 font-medium">SpO₂</th>
                      <th className="p-2 font-medium">Weight</th>
                      <th className="p-2 font-medium">Height</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vitals.map((v) => (
                      <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="p-2 text-muted-foreground">{formatDateTime(v.recorded_at)}</td>
                        <td className="p-2">{v.bp_systolic ? `${v.bp_systolic}/${v.bp_diastolic ?? "?"}` : "—"}</td>
                        <td className="p-2">{v.heart_rate ?? "—"}</td>
                        <td className="p-2">{v.temperature_c ?? "—"}</td>
                        <td className="p-2">{v.respiratory_rate ?? "—"}</td>
                        <td className="p-2">{v.spo2 ?? "—"}</td>
                        <td className="p-2">{v.weight_kg ?? "—"}</td>
                        <td className="p-2">{v.height_cm ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function initialsOf(p: { first_name: string; last_name: string }) {
  return `${p.first_name?.[0] ?? ""}${p.last_name?.[0] ?? ""}`.toUpperCase() || "?";
}
function Info({ label, v, highlight }: { label: string; v?: string | null; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-medium ${highlight && v ? "text-amber-600 dark:text-amber-500" : ""}`}>
        {v || "—"}
      </div>
    </div>
  );
}
function Row({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap">{v}</div>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

function OpenLabButton({ path }: { path: string }) {
  const [loading, setLoading] = useState(false);
  async function open() {
    setLoading(true);
    const { data, error } = await supabase.storage.from("lab-results").createSignedUrl(path, 300);
    setLoading(false);
    if (error || !data) return toast.error("Could not open file");
    logAudit({ action: "download", entity: "lab_result", metadata: { path } });
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  return (
    <Button variant="outline" size="sm" onClick={open} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
      <span className="ml-1">Open</span>
    </Button>
  );
}

function PrintRxButton({ rx, patient, doctorId }: {
  rx: { id: string; issued_at: string; notes: string | null; items?: Array<{ medicine: string; dosage?: string | null; frequency?: string | null; duration?: string | null; instructions?: string | null }> };
  patient: { first_name: string; last_name: string; middle_name?: string | null; date_of_birth?: string | null; sex?: string | null; clinic_id: string; clinic?: unknown };
  doctorId: string;
}) {
  const [busy, setBusy] = useState(false);
  async function print() {
    setBusy(true);
    try {
      const [clinicRes, docRes] = await Promise.all([
        supabase.from("clinics").select("name, address, phone, email").eq("id", patient.clinic_id).maybeSingle(),
        supabase.from("profiles").select("full_name, license_no, specialty").eq("id", doctorId).maybeSingle(),
      ]);
      generatePrescriptionPdf({
        clinic: clinicRes.data ?? {},
        doctor: docRes.data ?? {},
        patient,
        issuedAt: rx.issued_at,
        items: rx.items ?? [],
        notes: rx.notes,
      });
      logAudit({ action: "print", entity: "prescription", entity_id: rx.id, clinic_id: patient.clinic_id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate PDF");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={print} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
      <span className="ml-1">Print / PDF</span>
    </Button>
  );
}

function NewVitalsDialog({ patientId, userId }: { patientId: string; userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ bp_systolic: "", bp_diastolic: "", heart_rate: "", temperature_c: "", respiratory_rate: "", spo2: "", weight_kg: "", height_cm: "", blood_sugar: "" });
  const numOrNull = (s: string) => (s === "" ? null : Number(s));
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("vitals").insert({
        patient_id: patientId,
        recorded_by: userId,
        bp_systolic: numOrNull(f.bp_systolic),
        bp_diastolic: numOrNull(f.bp_diastolic),
        heart_rate: numOrNull(f.heart_rate),
        temperature_c: numOrNull(f.temperature_c),
        respiratory_rate: numOrNull(f.respiratory_rate),
        spo2: numOrNull(f.spo2),
        weight_kg: numOrNull(f.weight_kg),
        height_cm: numOrNull(f.height_cm),
        blood_sugar: numOrNull(f.blood_sugar),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vitals recorded");
      qc.invalidateQueries({ queryKey: ["vitals", patientId] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Activity className="mr-1 h-4 w-4" /> Vitals</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record vitals</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>BP systolic</Label><Input value={f.bp_systolic} onChange={(e) => setF({ ...f, bp_systolic: e.target.value })} /></div>
          <div><Label>BP diastolic</Label><Input value={f.bp_diastolic} onChange={(e) => setF({ ...f, bp_diastolic: e.target.value })} /></div>
          <div><Label>Heart rate</Label><Input value={f.heart_rate} onChange={(e) => setF({ ...f, heart_rate: e.target.value })} /></div>
          <div><Label>Temp °C</Label><Input value={f.temperature_c} onChange={(e) => setF({ ...f, temperature_c: e.target.value })} /></div>
          <div><Label>Resp rate</Label><Input value={f.respiratory_rate} onChange={(e) => setF({ ...f, respiratory_rate: e.target.value })} /></div>
          <div><Label>SpO₂ %</Label><Input value={f.spo2} onChange={(e) => setF({ ...f, spo2: e.target.value })} /></div>
          <div><Label>Weight kg</Label><Input value={f.weight_kg} onChange={(e) => setF({ ...f, weight_kg: e.target.value })} /></div>
          <div><Label>Height cm</Label><Input value={f.height_cm} onChange={(e) => setF({ ...f, height_cm: e.target.value })} /></div>
          <div><Label>Blood sugar</Label><Input value={f.blood_sugar} onChange={(e) => setF({ ...f, blood_sugar: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewLabDialog({ patientId, clinicId, userId }: { patientId: string; clinicId: string; userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [f, setF] = useState({ title: "", category: "", result_date: "", notes: "" });

  function pickFile(next: File | null) {
    setFile(next);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(next && next.type.startsWith("image/") ? URL.createObjectURL(next) : null);
  }

  const m = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Pick a file to upload");
      if (!f.title.trim()) throw new Error("Give the result a title");
      const path = `${clinicId}/${patientId}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("lab-results").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const { data, error } = await supabase.from("lab_results").insert({
        patient_id: patientId,
        clinic_id: clinicId,
        uploaded_by: userId,
        title: f.title,
        category: f.category || null,
        result_date: f.result_date || null,
        notes: f.notes || null,
        file_path: path,
        file_type: file.type,
      }).select("id").single();
      if (error) throw error;
      await logAudit({ action: "upload", entity: "lab_result", entity_id: data?.id, clinic_id: clinicId, metadata: { title: f.title } });
    },
    onSuccess: () => {
      toast.success("Lab result uploaded");
      qc.invalidateQueries({ queryKey: ["labs", patientId] });
      setOpen(false);
      pickFile(null);
      setF({ title: "", category: "", result_date: "", notes: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not upload"),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><FlaskConical className="mr-1 h-4 w-4" /> Upload lab</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload lab result</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. CBC, Chest X-ray" /></div>
          <div>
            <Label>Category</Label>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
              <SelectTrigger><SelectValue placeholder="Pick category" /></SelectTrigger>
              <SelectContent>
                {["Hematology","Chemistry","Urinalysis","Radiology","Pathology","Microbiology","Cardiology","Other"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Result date</Label><Input type="date" value={f.result_date} onChange={(e) => setF({ ...f, result_date: e.target.value })} /></div>
          <div><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <div>
            <Label>File (PDF or image)</Label>
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f0 = e.dataTransfer.files?.[0]; if (f0) pickFile(f0); }}
              className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-4 text-center transition ${dragOver ? "border-primary bg-accent" : "border-border"}`}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="preview" className="max-h-40 rounded object-contain" />
              ) : file ? (
                <div className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" /> {file.name}</div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                  <UploadCloud className="h-6 w-6" />
                  <span>Drag & drop or click to choose</span>
                  <span className="text-xs">PDF, JPG, PNG</span>
                </div>
              )}
              <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            </label>
            {file && <button type="button" className="mt-1 text-xs text-muted-foreground hover:underline" onClick={() => pickFile(null)}>Remove file</button>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Plus className="mr-1 h-4 w-4" /> Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
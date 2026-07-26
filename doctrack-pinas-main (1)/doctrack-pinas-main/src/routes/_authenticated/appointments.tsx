import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarClock, Loader2, Plus, ChevronLeft, ChevronRight, Stethoscope, Search } from "lucide-react";
import { formatDate, fullName } from "@/lib/format";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — MedFolio" },
      { name: "description", content: "Book and manage patient appointments across your clinics." },
    ],
  }),
  component: AppointmentsPage,
});

type ApptStatus = "scheduled" | "confirmed" | "checked_in" | "completed" | "cancelled" | "no_show";

const STATUS_STYLES: Record<ApptStatus, string> = {
  scheduled: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  confirmed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  checked_in: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  no_show: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function AppointmentsPage() {
  const { user } = Route.useRouteContext();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [q, setQ] = useState("");
  const weekEnd = useMemo(() => {
    const e = new Date(weekStart);
    e.setDate(e.getDate() + 7);
    return e;
  }, [weekStart]);

  const { data: appts = [], isLoading } = useQuery({
    queryKey: ["appointments", weekStart.toISOString(), user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, starts_at, ends_at, status, reason, patient:patients(id, first_name, last_name), clinic:clinics(id, name), doctor_id")
        .gte("starts_at", weekStart.toISOString())
        .lt("starts_at", weekEnd.toISOString())
        .order("starts_at", { ascending: true });
      return data ?? [];
    },
  });

  const needle = q.trim().toLowerCase();
  const filteredAppts = needle
    ? appts.filter((a) => {
        const p = a.patient as { first_name: string; last_name: string } | null;
        const haystack = [p ? fullName(p) : "", a.reason].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(needle);
      })
    : appts;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const byDay = days.map((d) => ({
    date: d,
    items: filteredAppts.filter((a) => {
      const t = new Date(a.starts_at);
      return t.toDateString() === d.toDateString();
    }),
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground">Weekly view across every clinic you belong to.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <NewAppointmentDialog userId={user.id} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {formatDate(days[0].toISOString())} — {formatDate(days[6].toISOString())}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter this week by patient or reason…"
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {byDay.map(({ date, items }) => (
          <Card key={date.toDateString()} className="min-h-[180px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {date.toLocaleDateString(undefined, { weekday: "short" })}
                <span className="ml-1 text-muted-foreground">{date.getDate()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <div className="text-xs text-muted-foreground">Loading…</div>
              ) : items.length === 0 ? (
                <div className="text-xs text-muted-foreground">—</div>
              ) : (
                items.map((a) => {
                  const p = a.patient as { id: string; first_name: string; last_name: string } | null;
                  const time = new Date(a.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                  return (
                    <ApptItem key={a.id} appt={a} time={time} patient={p} />
                  );
                })
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ApptItem({ appt, time, patient }: { appt: { id: string; status: ApptStatus; reason: string | null; clinic: unknown }; time: string; patient: { id: string; first_name: string; last_name: string } | null }) {
  const qc = useQueryClient();
  const set = useMutation({
    mutationFn: async (status: ApptStatus) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", appt.id);
      if (error) throw error;
      await logAudit({ action: "update", entity: "appointment", entity_id: appt.id, metadata: { status } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });
  const clinicName = (appt.clinic as { name?: string } | null)?.name;
  const canStart = patient && appt.status !== "completed" && appt.status !== "cancelled" && appt.status !== "no_show";
  return (
    <div className="rounded-md border border-border p-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">{time}</div>
        <Badge className={STATUS_STYLES[appt.status]} variant="outline">{appt.status.replace("_", " ")}</Badge>
      </div>
      {patient ? (
        <Link to="/patients/$patientId" params={{ patientId: patient.id }} className="mt-1 block text-sm font-medium hover:underline">
          {fullName(patient)}
        </Link>
      ) : <div className="text-sm">—</div>}
      {appt.reason && <div className="text-xs text-muted-foreground line-clamp-1">{appt.reason}</div>}
      {clinicName && <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{clinicName}</div>}
      <div className="mt-2 space-y-1.5">
        <Select value={appt.status} onValueChange={(v) => set.mutate(v as ApptStatus)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["scheduled","confirmed","checked_in","completed","cancelled","no_show"] as ApptStatus[]).map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace("_"," ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canStart && (
          <Button asChild size="sm" variant="outline" className="h-7 w-full text-xs">
            <Link to="/consultations/new" search={{ patientId: patient!.id, appointmentId: appt.id }}>
              <Stethoscope className="mr-1 h-3.5 w-3.5" /> Start consultation
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function NewAppointmentDialog({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    clinic_id: "",
    patient_id: "",
    date: new Date().toISOString().slice(0, 10),
    time: "09:00",
    duration: "30",
    reason: "",
    notes: "",
  });

  const { data: clinics = [] } = useQuery({
    queryKey: ["my-clinics"],
    queryFn: async () => {
      const { data } = await supabase.from("clinic_members").select("clinic:clinics(id, name)").eq("user_id", userId).eq("active", true);
      return (data ?? []).map((r) => r.clinic as { id: string; name: string } | null).filter((c): c is { id: string; name: string } => !!c);
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-for-appt", f.clinic_id],
    enabled: !!f.clinic_id,
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("id, first_name, last_name").eq("clinic_id", f.clinic_id).is("deleted_at", null).order("last_name").limit(500);
      return data ?? [];
    },
  });

  const m = useMutation({
    mutationFn: async () => {
      if (!f.clinic_id || !f.patient_id) throw new Error("Pick clinic and patient");
      const starts = new Date(`${f.date}T${f.time}:00`);
      const ends = new Date(starts.getTime() + Number(f.duration) * 60_000);
      const { data, error } = await supabase.from("appointments").insert({
        clinic_id: f.clinic_id, patient_id: f.patient_id, doctor_id: userId, created_by: userId,
        starts_at: starts.toISOString(), ends_at: ends.toISOString(),
        reason: f.reason || null, notes: f.notes || null,
      }).select("id").single();
      if (error) throw error;
      await logAudit({ action: "create", entity: "appointment", entity_id: data.id, clinic_id: f.clinic_id });
    },
    onSuccess: () => {
      toast.success("Appointment booked");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not book"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><CalendarClock className="mr-1 h-4 w-4" /> New appointment</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Book appointment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Clinic</Label>
            <Select value={f.clinic_id} onValueChange={(v) => setF({ ...f, clinic_id: v, patient_id: "" })}>
              <SelectTrigger><SelectValue placeholder="Select clinic" /></SelectTrigger>
              <SelectContent>
                {clinics.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Patient</Label>
            <Select value={f.patient_id} onValueChange={(v) => setF({ ...f, patient_id: v })} disabled={!f.clinic_id}>
              <SelectTrigger><SelectValue placeholder={f.clinic_id ? "Select patient" : "Pick clinic first"} /></SelectTrigger>
              <SelectContent>
                {patients.map((p) => <SelectItem key={p.id} value={p.id}>{fullName(p)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Date</Label><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div><Label>Time</Label><Input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></div>
            <div><Label>Duration (min)</Label><Input type="number" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} /></div>
          </div>
          <div><Label>Reason</Label><Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="e.g. Follow-up" /></div>
          <div><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<Plus className="mr-1 h-4 w-4" />Book
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
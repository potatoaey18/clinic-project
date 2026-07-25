import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, ClipboardList, CalendarClock, Building2, ArrowRight, Search } from "lucide-react";
import { formatDate, fullName } from "@/lib/format";
import { searchPatients, type PatientHit } from "@/lib/search";
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MedFolio" },
      { name: "description", content: "Your clinical overview across every clinic." },
    ],
  }),
  component: Dashboard,
});

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function Dashboard() {
  const { user } = Route.useRouteContext();

  const { data: clinics = [] } = useQuery({
    queryKey: ["my-clinics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clinic_members")
        .select("role, clinic:clinics(id, name)")
        .eq("user_id", user.id)
        .eq("active", true);
      return data ?? [];
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients", "recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, first_name, last_name, middle_name, updated_at, clinic:clinics(name)")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ["consultations", "recent", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("consultations")
        .select("id, consult_date, chief_complaint, patient:patients(id, first_name, last_name)")
        .eq("doctor_id", user.id)
        .order("consult_date", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: followUps = [] } = useQuery({
    queryKey: ["followups", user.id],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("consultations")
        .select("id, follow_up_date, patient:patients(id, first_name, last_name)")
        .eq("doctor_id", user.id)
        .gte("follow_up_date", today)
        .order("follow_up_date", { ascending: true })
        .limit(5);
      return data ?? [];
    },
  });

  // ---- Analytics: real, derived from actual records (no placeholder numbers) ----

  const fourteenDaysAgo = useMemo(() => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - 13);
    return d;
  }, []);

  const { data: apptWindow = [] } = useQuery({
    queryKey: ["appointments", "trend", fourteenDaysAgo.toISOString()],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("starts_at, status")
        .gte("starts_at", fourteenDaysAgo.toISOString())
        .order("starts_at", { ascending: true });
      return data ?? [];
    },
  });

  const apptTrend = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(fourteenDaysAgo);
      d.setDate(d.getDate() + i);
      return d;
    });
    return days.map((d) => {
      const count = apptWindow.filter((a) => new Date(a.starts_at).toDateString() === d.toDateString()).length;
      return { day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), appointments: count };
    });
  }, [apptWindow, fourteenDaysAgo]);

  const { data: consultTypes = [] } = useQuery({
    queryKey: ["consultations", "type-breakdown", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("consultations")
        .select("consultation_type")
        .eq("doctor_id", user.id)
        .limit(1000);
      return data ?? [];
    },
  });

  const consultTypeData = useMemo(() => {
    const labels: Record<string, string> = { walk_in: "Walk-in", appointment: "Appointment", teleconsult: "Teleconsult", home_visit: "Home visit" };
    const counts = new Map<string, number>();
    for (const c of consultTypes) {
      const key = c.consultation_type ?? "walk_in";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([type, count]) => ({ type: labels[type] ?? type, count }));
  }, [consultTypes]);

  const chartConfig: ChartConfig = {
    appointments: { label: "Appointments", color: "var(--chart-2)" },
  };
  const pieColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  const stats = [
    { icon: Building2, label: "Clinics", value: clinics.length },
    { icon: Users, label: "Recent patients", value: patients.length },
    { icon: ClipboardList, label: "Consultations (recent)", value: consultations.length },
    { icon: CalendarClock, label: "Upcoming follow-ups", value: followUps.length },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Good day, doctor</h1>
          <p className="text-sm text-muted-foreground">
            Your practice at a glance — across every clinic you work in.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/patients/new">New patient</Link>
          </Button>
          <Button asChild>
            <Link to="/consultations/new">
              New consultation <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <QuickSearch />

      {clinics.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <Badge variant="secondary">Get started</Badge>
            <h3 className="text-lg font-semibold">Add your first clinic</h3>
            <p className="text-sm text-muted-foreground">
              You need at least one clinic to start adding patients. It only takes a few seconds.
            </p>
            <Button asChild>
              <Link to="/clinics">Add a clinic</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 divide-x divide-border rounded-md border border-border bg-card lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 px-5 py-4">
            <s.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <div className="text-xl font-semibold tabular-nums tracking-tight">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Appointments, last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            {apptWindow.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No appointments in this window yet.</p>
            ) : (
              <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
                <BarChart data={apptTrend} margin={{ left: -20 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} interval={1} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="appointments" fill="var(--color-appointments)" radius={2} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your consultations by type</CardTitle>
          </CardHeader>
          <CardContent>
            {consultTypeData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No consultations recorded yet.</p>
            ) : (
              <ChartContainer config={chartConfig} className="mx-auto aspect-square h-56">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="type" hideLabel />} />
                  <Pie data={consultTypeData} dataKey="count" nameKey="type" innerRadius={45} outerRadius={75} strokeWidth={2}>
                    {consultTypeData.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
            {consultTypeData.length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {consultTypeData.map((d, i) => (
                  <span key={d.type} className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: pieColors[i % pieColors.length] }} />
                    {d.type} ({d.count})
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent patients</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/patients">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {patients.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No patients yet.</p>
            )}
            {patients.map((p) => (
              <Link
                key={p.id}
                to="/patients/$patientId"
                params={{ patientId: p.id }}
                className="flex items-center justify-between rounded-md p-2 hover:bg-accent"
              >
                <div className="text-sm font-medium">{fullName(p)}</div>
                <div className="text-xs text-muted-foreground">
                  {(p.clinic as { name?: string } | null)?.name ?? "—"}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming follow-ups</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/schedule">View schedule</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {followUps.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No follow-ups scheduled.
              </p>
            )}
            {followUps.map((f) => {
              const patient = f.patient as { id: string; first_name: string; last_name: string } | null;
              if (!patient) return null;
              return (
                <Link
                  key={f.id}
                  to="/patients/$patientId"
                  params={{ patientId: patient.id }}
                  className="flex items-center justify-between rounded-md p-2 hover:bg-accent"
                >
                  <div className="text-sm font-medium">{fullName(patient)}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(f.follow_up_date)}</div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const { data: results = [], isFetching } = useQuery({
    queryKey: ["dashboard-quick-search", q],
    queryFn: () => searchPatients(q, 6),
    enabled: q.trim().length > 1,
  });

  function pick(p: PatientHit) {
    setQ("");
    setFocused(false);
    navigate({ to: "/patients/$patientId", params: { patientId: p.id } });
  }

  const showDropdown = focused && q.trim().length > 1;

  return (
    <div className="relative max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Quick search — find a patient by name, MRN, or contact number…"
        className="pl-9"
      />
      {showDropdown && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {isFetching ? (
            <div className="p-3 text-center text-sm text-muted-foreground">Searching…</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">No patients found.</div>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="font-medium">{fullName(p)}</span>
                <span className="text-xs text-muted-foreground">{p.clinic?.name ?? "—"}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

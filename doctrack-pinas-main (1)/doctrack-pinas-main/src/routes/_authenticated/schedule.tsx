import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, fullName } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "My Schedule — MedFolio" },
      { name: "description", content: "Upcoming follow-ups across every clinic." },
    ],
  }),
  component: Schedule,
});

function Schedule() {
  const { user } = Route.useRouteContext();
  const today = new Date().toISOString().slice(0, 10);
  const { data = [] } = useQuery({
    queryKey: ["schedule", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("consultations")
        .select("id, follow_up_date, chief_complaint, patient:patients(id, first_name, last_name), clinic:clinics(name)")
        .eq("doctor_id", user.id)
        .gte("follow_up_date", today)
        .order("follow_up_date", { ascending: true });
      return data ?? [];
    },
  });

  // Group by date
  const groups = data.reduce<Record<string, typeof data>>((acc, item) => {
    const key = item.follow_up_date ?? "unscheduled";
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Schedule</h1>
        <p className="text-sm text-muted-foreground">Upcoming follow-ups across every clinic.</p>
      </div>
      {data.length === 0 && (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nothing scheduled.</CardContent></Card>
      )}
      {Object.entries(groups).map(([date, items]) => (
        <Card key={date}>
          <CardHeader><CardTitle className="text-base">{formatDate(date)}</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {items.map((i) => {
              const patient = i.patient as { id: string; first_name: string; last_name: string } | null;
              if (!patient) return null;
              return (
                <Link key={i.id} to="/patients/$patientId" params={{ patientId: patient.id }} className="flex items-center justify-between rounded-md p-2 hover:bg-accent">
                  <div className="font-medium">{fullName(patient)}</div>
                  <div className="text-xs text-muted-foreground">
                    {(i.clinic as { name?: string } | null)?.name} · {i.chief_complaint ?? "Follow-up"}
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
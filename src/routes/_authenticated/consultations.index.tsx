import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, fullName } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/consultations/")({
  head: () => ({
    meta: [
      { title: "My Consultations — MedFolio" },
      { name: "description", content: "Every consultation you have authored, across clinics." },
    ],
  }),
  component: MyConsultations,
});

function MyConsultations() {
  const { user } = Route.useRouteContext();
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["consultations", "mine", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("consultations")
        .select("id, consult_date, consultation_type, chief_complaint, diagnosis, patient:patients(id, first_name, last_name), clinic:clinics(name)")
        .eq("doctor_id", user.id)
        .order("consult_date", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((c) => {
      const patient = c.patient as { first_name: string; last_name: string } | null;
      const haystack = [
        patient ? fullName(patient) : "",
        c.chief_complaint,
        c.diagnosis,
        c.consultation_type,
        (c.clinic as { name?: string } | null)?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [data, q]);

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Consultations</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${filtered.length} of ${data.length} consultations`}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/consultations/new">
            <Plus className="mr-1 h-4 w-4" /> New consultation
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search patient, complaint, diagnosis…"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>When</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Chief complaint</TableHead>
              <TableHead>Clinic</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  {data.length === 0 ? (
                    <>
                      <ClipboardList className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
                      No consultations yet.{" "}
                      <Link to="/consultations/new" className="font-medium text-primary underline underline-offset-2">
                        Start your first consultation
                      </Link>
                      .
                    </>
                  ) : (
                    "No consultations match your search."
                  )}
                </TableCell>
              </TableRow>
            ) : filtered.map((c) => {
              const patient = c.patient as { id: string; first_name: string; last_name: string } | null;
              return (
                <TableRow key={c.id}>
                  <TableCell className="text-muted-foreground">{formatDateTime(c.consult_date)}</TableCell>
                  <TableCell className="font-medium">
                    {patient ? (
                      <Link to="/patients/$patientId" params={{ patientId: patient.id }} className="hover:underline">
                        {fullName(patient)}
                      </Link>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="capitalize">{c.consultation_type?.replace("_", " ")}</TableCell>
                  <TableCell className="max-w-md truncate">{c.chief_complaint ?? c.diagnosis ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{(c.clinic as { name?: string } | null)?.name ?? "—"}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

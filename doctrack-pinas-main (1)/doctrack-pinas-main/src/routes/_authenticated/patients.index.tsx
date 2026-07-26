import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { ageFrom, formatDate, fullName } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/patients/")({
  head: () => ({
    meta: [
      { title: "Patients — MedFolio" },
      { name: "description", content: "All patients across every clinic you practice in." },
    ],
  }),
  component: PatientsList,
});

function PatientsList() {
  const [q, setQ] = useState("");
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients", "all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, first_name, middle_name, last_name, date_of_birth, sex, contact_number, updated_at, clinic:clinics(id, name)")
        .is("deleted_at", null)
        .order("last_name", { ascending: true });
      return data ?? [];
    },
  });

  const filtered = patients.filter((p) => {
    if (!q.trim()) return true;
    const s = (p.first_name + " " + p.last_name + " " + (p.middle_name ?? "")).toLowerCase();
    return s.includes(q.toLowerCase());
  });

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Patients</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${filtered.length} of ${patients.length} patients`}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/patients/new">
            <Plus className="mr-1 h-4 w-4" /> New patient
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
              placeholder="Search by name…"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Sex</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Clinic</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  {patients.length === 0 ? (
                    <>
                      No patients yet.{" "}
                      <Link to="/patients/new" className="font-medium text-primary underline underline-offset-2">
                        Add your first patient
                      </Link>
                      .
                    </>
                  ) : (
                    "No patients match your search."
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id} className="group cursor-pointer" data-state={undefined}>
                  <TableCell className="font-medium p-0">
                    <Link
                      to="/patients/$patientId"
                      params={{ patientId: p.id }}
                      className="block px-2 py-2 group-hover:text-primary"
                    >
                      {fullName(p)}
                    </Link>
                  </TableCell>
                  <TableCell>{ageFrom(p.date_of_birth) ?? "—"}</TableCell>
                  <TableCell className="capitalize">{p.sex ?? "—"}</TableCell>
                  <TableCell>{p.contact_number ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-sm font-normal">
                      {(p.clinic as { name?: string } | null)?.name ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(p.updated_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
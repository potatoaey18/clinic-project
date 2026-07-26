import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { ShieldCheck, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit log — MedFolio" },
      { name: "description", content: "Compliance-grade activity log per Philippine Data Privacy Act." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { user } = Route.useRouteContext();
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["audit", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("id, created_at, action, entity, entity_id, clinic_id, metadata, user_id")
        .order("created_at", { ascending: false })
        .limit(300);
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((r) => {
      const haystack = [r.action, r.entity, r.entity_id, r.metadata ? JSON.stringify(r.metadata) : ""].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [data, q]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
          <p className="text-sm text-muted-foreground">Every access and change to patient data is recorded for DPA compliance.</p>
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search action, entity, reference…"
              className="h-8 pl-8 text-sm"
            />
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {isLoading ? "Loading…" : `${filtered.length} of ${data.length} entries`}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">{data.length === 0 ? "No activity yet." : "No entries match your search."}</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{r.action}</Badge></TableCell>
                <TableCell className="capitalize">{r.entity.replace("_", " ")}</TableCell>
                <TableCell className="font-mono text-xs">{r.entity_id?.slice(0, 8) ?? "—"}</TableCell>
                <TableCell className="max-w-md truncate text-xs text-muted-foreground">{r.metadata ? JSON.stringify(r.metadata) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

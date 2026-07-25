import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Loader2, Mail, Phone, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clinics")({
  head: () => ({
    meta: [
      { title: "Clinics — MedFolio" },
      { name: "description", content: "Manage the clinics you belong to." },
    ],
  }),
  component: Clinics,
});

function Clinics() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: memberships = [] } = useQuery({
    queryKey: ["my-clinics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clinic_members")
        .select("role, clinic:clinics(id, name, address, phone, email)")
        .eq("user_id", user.id)
        .eq("active", true);
      return data ?? [];
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "" });
  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Clinic name is required");
      const { error } = await supabase.from("clinics").insert({ ...form, owner_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clinic created");
      qc.invalidateQueries({ queryKey: ["my-clinics"] });
      setOpen(false);
      setForm({ name: "", address: "", phone: "", email: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create clinic"),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clinics</h1>
          <p className="text-sm text-muted-foreground">Every clinic you belong to. Owners can invite doctors, nurses and receptionists.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> New clinic</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New clinic</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Address</Label><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => create.mutate()} disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create clinic
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {memberships.length === 0 && (
          <Card className="col-span-full border-dashed">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              You don't belong to any clinics yet. Create one to get started.
            </CardContent>
          </Card>
        )}
        {memberships.map((m) => {
          const c = m.clinic as { id: string; name: string; address?: string; phone?: string; email?: string } | null;
          if (!c) return null;
          return (
            <Card key={c.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-accent text-accent-foreground">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <div className="text-xs text-muted-foreground">{c.address || "No address"}</div>
                  </div>
                </div>
                <Badge variant="secondary" className="capitalize">{m.role}</Badge>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {c.phone}</div>}
                {c.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {c.email}</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
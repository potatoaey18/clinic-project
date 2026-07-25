import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/patients/new")({
  head: () => ({
    meta: [
      { title: "New patient — MedFolio" },
      { name: "description", content: "Register a new patient in your clinic." },
    ],
  }),
  component: NewPatient,
});

function NewPatient() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext();

  const { data: clinics = [] } = useQuery({
    queryKey: ["my-clinics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clinic_members")
        .select("clinic:clinics(id, name)")
        .eq("user_id", user.id)
        .eq("active", true);
      return (data ?? [])
        .map((r) => r.clinic as { id: string; name: string } | null)
        .filter((c): c is { id: string; name: string } => !!c);
    },
  });

  const [form, setForm] = useState({
    clinic_id: "",
    first_name: "",
    last_name: "",
    middle_name: "",
    date_of_birth: "",
    sex: "" as "" | "male" | "female" | "other",
    civil_status: "",
    nationality: "",
    address: "",
    contact_number: "",
    email: "",
    occupation: "",
    philhealth_no: "",
    senior_citizen_id: "",
    pwd_id: "",
    passport_no: "",
    drivers_license_no: "",
    blood_type: "",
    allergies: "",
    existing_conditions: "",
    family_history: "",
    surgical_history: "",
    current_medications: "",
    smoking_history: "",
    alcohol_history: "",
    pregnancy_history: "",
    medical_alerts: "",
    insurance_provider: "",
    insurance_policy_no: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relation: "",
    notes: "",
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.clinic_id) throw new Error("Please pick a clinic");
      if (!form.first_name || !form.last_name) throw new Error("Name is required");
      const payload = {
        ...form,
        sex: form.sex || null,
        date_of_birth: form.date_of_birth || null,
        created_by: user.id,
      };
      const { data, error } = await supabase.from("patients").insert(payload).select("id").single();
      if (error) throw error;
      await import("@/lib/audit").then(({ logAudit }) => logAudit({ action: "create", entity: "patient", entity_id: data.id, clinic_id: form.clinic_id }));
      return data.id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient registered");
      navigate({ to: "/patients/$patientId", params: { patientId: id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save patient"),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New patient</h1>
        <p className="text-sm text-muted-foreground">
          Register a new medical record. You can complete extra fields later.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinic & identity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Clinic</Label>
              <Select value={form.clinic_id} onValueChange={(v) => update("clinic_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder={clinics.length ? "Pick a clinic" : "No clinics yet — add one first"} />
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field label="First name" value={form.first_name} onChange={(v) => update("first_name", v)} required />
            <Field label="Last name" value={form.last_name} onChange={(v) => update("last_name", v)} required />
            <Field label="Middle name" value={form.middle_name} onChange={(v) => update("middle_name", v)} />
            <Field label="Date of birth" type="date" value={form.date_of_birth} onChange={(v) => update("date_of_birth", v)} />
            <div>
              <Label>Sex</Label>
              <Select value={form.sex} onValueChange={(v) => update("sex", v as typeof form.sex)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Field label="Civil status" value={form.civil_status} onChange={(v) => update("civil_status", v)} />
            <Field label="Nationality" value={form.nationality} onChange={(v) => update("nationality", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Contact number" value={form.contact_number} onChange={(v) => update("contact_number", v)} />
            <Field label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} />
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Textarea value={form.address} onChange={(e) => update("address", e.target.value)} rows={2} />
            </div>
            <Field label="Occupation" value={form.occupation} onChange={(v) => update("occupation", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">IDs & insurance</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="PhilHealth number" value={form.philhealth_no} onChange={(v) => update("philhealth_no", v)} />
            <Field label="Senior citizen ID" value={form.senior_citizen_id} onChange={(v) => update("senior_citizen_id", v)} />
            <Field label="PWD ID" value={form.pwd_id} onChange={(v) => update("pwd_id", v)} />
            <Field label="Passport no." value={form.passport_no} onChange={(v) => update("passport_no", v)} />
            <Field label="Driver's license" value={form.drivers_license_no} onChange={(v) => update("drivers_license_no", v)} />
            <Field label="Insurance provider" value={form.insurance_provider} onChange={(v) => update("insurance_provider", v)} />
            <Field label="Insurance policy no." value={form.insurance_policy_no} onChange={(v) => update("insurance_policy_no", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Medical history</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Blood type" value={form.blood_type} onChange={(v) => update("blood_type", v)} placeholder="e.g. O+" />
            <Field label="Medical alerts" value={form.medical_alerts} onChange={(v) => update("medical_alerts", v)} placeholder="Critical warnings" />
            <div>
              <Label>Allergies</Label>
              <Textarea value={form.allergies} onChange={(e) => update("allergies", e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Existing conditions</Label>
              <Textarea value={form.existing_conditions} onChange={(e) => update("existing_conditions", e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Current medications</Label>
              <Textarea value={form.current_medications} onChange={(e) => update("current_medications", e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Family history</Label>
              <Textarea value={form.family_history} onChange={(e) => update("family_history", e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Surgical history</Label>
              <Textarea value={form.surgical_history} onChange={(e) => update("surgical_history", e.target.value)} rows={2} />
            </div>
            <Field label="Smoking history" value={form.smoking_history} onChange={(v) => update("smoking_history", v)} placeholder="e.g. Never, 10 pack-years" />
            <Field label="Alcohol history" value={form.alcohol_history} onChange={(v) => update("alcohol_history", v)} placeholder="e.g. Occasional" />
            <div className="md:col-span-2">
              <Label>Pregnancy history (if applicable)</Label>
              <Textarea value={form.pregnancy_history} onChange={(e) => update("pregnancy_history", e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Emergency contact</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Name" value={form.emergency_contact_name} onChange={(v) => update("emergency_contact_name", v)} />
            <Field label="Phone" value={form.emergency_contact_phone} onChange={(v) => update("emergency_contact_phone", v)} />
            <Field label="Relationship" value={form.emergency_contact_relation} onChange={(v) => update("emergency_contact_relation", v)} />
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/patients" })}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save patient
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}{required && " *"}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} type={type} required={required} placeholder={placeholder} />
    </div>
  );
}
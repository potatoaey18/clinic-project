import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Camera, Sun, Moon, Monitor, Check } from "lucide-react";
import { avatarInitials } from "@/lib/profile";
import { useTheme, type AccentColor, type ThemeMode } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MedFolio" },
      { name: "description", content: "Your doctor profile settings." },
    ],
  }),
  component: Settings,
});

const ACCENTS: { value: AccentColor; label: string; swatch: string }[] = [
  { value: "blue", label: "Blue", swatch: "oklch(0.44 0.15 258)" },
  { value: "teal", label: "Teal", swatch: "oklch(0.42 0.12 175)" },
  { value: "violet", label: "Violet", swatch: "oklch(0.46 0.16 295)" },
  { value: "rose", label: "Rose", swatch: "oklch(0.5 0.18 15)" },
  { value: "emerald", label: "Emerald", swatch: "oklch(0.45 0.13 150)" },
  { value: "amber", label: "Amber", swatch: "oklch(0.55 0.15 75)" },
];

function Settings() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });
  const [form, setForm] = useState({ full_name: "", phone: "", license_no: "", specialty: "" });
  useEffect(() => {
    if (profile) setForm({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      license_no: profile.license_no ?? "",
      specialty: profile.specialty ?? "",
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  async function handleAvatarPick(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so the new image shows immediately even though the path is unchanged.
      const url = `${pub.publicUrl}?t=${Date.now()}`;
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (error) throw error;
      toast.success("Photo updated");
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setUploading(false);
    }
  }

  const { mode, accent, setMode, setAccent } = useTheme();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Your professional profile and how MedFolio looks for you.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
                <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                  {avatarInitials(profile?.full_name, user.email)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
                title="Change photo"
              >
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleAvatarPick(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              PNG, JPG, or WebP. Square images look best.
            </div>
          </div>

          <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>License number</Label><Input value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} /></div>
          <div><Label>Specialty</Label><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={user.email ?? ""} disabled /></div>
          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Applies on this device instantly, and syncs to any device you sign in on.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "light" as ThemeMode, label: "Light", icon: Sun },
                { value: "dark" as ThemeMode, label: "Dark", icon: Moon },
                { value: "system" as ThemeMode, label: "System", icon: Monitor },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-md border p-3 text-xs transition-colors ${
                    mode === opt.value ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Accent color</Label>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAccent(a.value)}
                  title={a.label}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border transition-transform hover:scale-105"
                  style={{ backgroundColor: a.swatch }}
                >
                  {accent === a.value && <Check className="h-4 w-4 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

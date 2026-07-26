import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  license_no: string | null;
  specialty: string | null;
  avatar_url: string | null;
  theme_mode: "light" | "dark" | "system";
  accent_color: "blue" | "teal" | "violet" | "rose" | "emerald" | "amber";
};

export function useProfile(userId: string) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      return data as Profile | null;
    },
  });
}

export function useInvalidateProfile(userId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["profile", userId] });
}

/** "Dr. Santos" from "Maria Santos Garcia" — falls back to the first name, then email, then "doctor". */
export function displayName(profile?: Profile | null, email?: string | null) {
  const full = profile?.full_name?.trim();
  if (full) {
    const parts = full.split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
  }
  if (email) return email.split("@")[0];
  return "doctor";
}

export function greeting(now: Date = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function avatarInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

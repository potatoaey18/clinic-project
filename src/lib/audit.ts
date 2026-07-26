import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "download"
  | "upload"
  | "print";

export type AuditEntity =
  | "patient"
  | "consultation"
  | "prescription"
  | "lab_result"
  | "vitals"
  | "appointment"
  | "clinic";

export async function logAudit(input: {
  action: AuditAction;
  entity: AuditEntity;
  entity_id?: string | null;
  clinic_id?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    await supabase.from("audit_logs").insert({
      user_id: uid,
      action: input.action,
      entity: input.entity,
      entity_id: input.entity_id ?? null,
      clinic_id: input.clinic_id ?? null,
      metadata: (input.metadata ?? null) as never,
    });
  } catch {
    // Non-blocking; audit failures must not break UX.
  }
}
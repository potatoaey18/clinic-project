export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string
          doctor_id: string
          ends_at: string
          id: string
          notes: string | null
          patient_id: string
          reason: string | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by: string
          doctor_id: string
          ends_at: string
          id?: string
          notes?: string | null
          patient_id: string
          reason?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string
          doctor_id?: string
          ends_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          reason?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          clinic_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          clinic_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          clinic_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      clinic_members: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["clinic_member_role"]
          user_id: string
        }
        Insert: {
          active?: boolean
          clinic_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["clinic_member_role"]
          user_id: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["clinic_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      consultations: {
        Row: {
          assessment: string | null
          chief_complaint: string | null
          clinic_id: string
          consult_date: string
          consultation_type: Database["public"]["Enums"]["consultation_type"]
          created_at: string
          diagnosis: string | null
          doctor_id: string
          doctor_notes: string | null
          duration_min: number | null
          follow_up_date: string | null
          history_present_illness: string | null
          icd10_codes: string[] | null
          id: string
          patient_id: string
          physical_exam: string | null
          review_of_systems: string | null
          treatment_plan: string | null
          updated_at: string
        }
        Insert: {
          assessment?: string | null
          chief_complaint?: string | null
          clinic_id: string
          consult_date?: string
          consultation_type?: Database["public"]["Enums"]["consultation_type"]
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          doctor_notes?: string | null
          duration_min?: number | null
          follow_up_date?: string | null
          history_present_illness?: string | null
          icd10_codes?: string[] | null
          id?: string
          patient_id: string
          physical_exam?: string | null
          review_of_systems?: string | null
          treatment_plan?: string | null
          updated_at?: string
        }
        Update: {
          assessment?: string | null
          chief_complaint?: string | null
          clinic_id?: string
          consult_date?: string
          consultation_type?: Database["public"]["Enums"]["consultation_type"]
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          doctor_notes?: string | null
          duration_min?: number | null
          follow_up_date?: string | null
          history_present_illness?: string | null
          icd10_codes?: string[] | null
          id?: string
          patient_id?: string
          physical_exam?: string | null
          review_of_systems?: string | null
          treatment_plan?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          category: string | null
          clinic_id: string
          consultation_id: string | null
          created_at: string
          file_path: string
          file_type: string | null
          id: string
          notes: string | null
          patient_id: string
          result_date: string | null
          title: string
          uploaded_by: string
        }
        Insert: {
          category?: string | null
          clinic_id: string
          consultation_id?: string | null
          created_at?: string
          file_path: string
          file_type?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          result_date?: string | null
          title: string
          uploaded_by: string
        }
        Update: {
          category?: string | null
          clinic_id?: string
          consultation_id?: string | null
          created_at?: string
          file_path?: string
          file_type?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          result_date?: string | null
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          alcohol_history: string | null
          allergies: string | null
          blood_type: string | null
          civil_status: string | null
          clinic_id: string
          contact_number: string | null
          created_at: string
          created_by: string | null
          current_medications: string | null
          date_of_birth: string | null
          deleted_at: string | null
          drivers_license_no: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          existing_conditions: string | null
          family_history: string | null
          first_name: string
          id: string
          insurance_policy_no: string | null
          insurance_provider: string | null
          last_name: string
          medical_alerts: string | null
          middle_name: string | null
          mrn: string | null
          nationality: string | null
          notes: string | null
          occupation: string | null
          passport_no: string | null
          philhealth_no: string | null
          photo_url: string | null
          pregnancy_history: string | null
          pwd_id: string | null
          senior_citizen_id: string | null
          sex: Database["public"]["Enums"]["sex_type"] | null
          signature_url: string | null
          smoking_history: string | null
          surgical_history: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          alcohol_history?: string | null
          allergies?: string | null
          blood_type?: string | null
          civil_status?: string | null
          clinic_id: string
          contact_number?: string | null
          created_at?: string
          created_by?: string | null
          current_medications?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          drivers_license_no?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          existing_conditions?: string | null
          family_history?: string | null
          first_name: string
          id?: string
          insurance_policy_no?: string | null
          insurance_provider?: string | null
          last_name: string
          medical_alerts?: string | null
          middle_name?: string | null
          mrn?: string | null
          nationality?: string | null
          notes?: string | null
          occupation?: string | null
          passport_no?: string | null
          philhealth_no?: string | null
          photo_url?: string | null
          pregnancy_history?: string | null
          pwd_id?: string | null
          senior_citizen_id?: string | null
          sex?: Database["public"]["Enums"]["sex_type"] | null
          signature_url?: string | null
          smoking_history?: string | null
          surgical_history?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          alcohol_history?: string | null
          allergies?: string | null
          blood_type?: string | null
          civil_status?: string | null
          clinic_id?: string
          contact_number?: string | null
          created_at?: string
          created_by?: string | null
          current_medications?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          drivers_license_no?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          existing_conditions?: string | null
          family_history?: string | null
          first_name?: string
          id?: string
          insurance_policy_no?: string | null
          insurance_provider?: string | null
          last_name?: string
          medical_alerts?: string | null
          middle_name?: string | null
          mrn?: string | null
          nationality?: string | null
          notes?: string | null
          occupation?: string | null
          passport_no?: string | null
          philhealth_no?: string | null
          photo_url?: string | null
          pregnancy_history?: string | null
          pwd_id?: string | null
          senior_citizen_id?: string | null
          sex?: Database["public"]["Enums"]["sex_type"] | null
          signature_url?: string | null
          smoking_history?: string | null
          surgical_history?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          dosage: string | null
          duration: string | null
          frequency: string | null
          id: string
          instructions: string | null
          medicine: string
          prescription_id: string
          sort_order: number
        }
        Insert: {
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medicine: string
          prescription_id: string
          sort_order?: number
        }
        Update: {
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medicine?: string
          prescription_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          clinic_id: string
          consultation_id: string | null
          created_at: string
          doctor_id: string
          id: string
          issued_at: string
          notes: string | null
          patient_id: string
        }
        Insert: {
          clinic_id: string
          consultation_id?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          issued_at?: string
          notes?: string | null
          patient_id: string
        }
        Update: {
          clinic_id?: string
          consultation_id?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          issued_at?: string
          notes?: string | null
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          license_no: string | null
          phone: string | null
          specialty: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          license_no?: string | null
          phone?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          license_no?: string | null
          phone?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vitals: {
        Row: {
          blood_sugar: number | null
          bmi: number | null
          bp_diastolic: number | null
          bp_systolic: number | null
          consultation_id: string | null
          heart_rate: number | null
          height_cm: number | null
          id: string
          patient_id: string
          recorded_at: string
          recorded_by: string | null
          respiratory_rate: number | null
          spo2: number | null
          temperature_c: number | null
          weight_kg: number | null
        }
        Insert: {
          blood_sugar?: number | null
          bmi?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          consultation_id?: string | null
          heart_rate?: number | null
          height_cm?: number | null
          id?: string
          patient_id: string
          recorded_at?: string
          recorded_by?: string | null
          respiratory_rate?: number | null
          spo2?: number | null
          temperature_c?: number | null
          weight_kg?: number | null
        }
        Update: {
          blood_sugar?: number | null
          bmi?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          consultation_id?: string | null
          heart_rate?: number | null
          height_cm?: number | null
          id?: string
          patient_id?: string
          recorded_at?: string
          recorded_by?: string | null
          respiratory_rate?: number | null
          spo2?: number | null
          temperature_c?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_clinic_member: {
        Args: { _clinic: string; _user: string }
        Returns: boolean
      }
      is_clinic_owner: {
        Args: { _clinic: string; _user: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "clinic_owner"
        | "doctor"
        | "receptionist"
        | "nurse"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "checked_in"
        | "completed"
        | "cancelled"
        | "no_show"
      clinic_member_role: "owner" | "doctor" | "receptionist" | "nurse"
      consultation_type:
        | "walk_in"
        | "appointment"
        | "teleconsult"
        | "home_visit"
      sex_type: "male" | "female" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "clinic_owner",
        "doctor",
        "receptionist",
        "nurse",
      ],
      appointment_status: [
        "scheduled",
        "confirmed",
        "checked_in",
        "completed",
        "cancelled",
        "no_show",
      ],
      clinic_member_role: ["owner", "doctor", "receptionist", "nurse"],
      consultation_type: [
        "walk_in",
        "appointment",
        "teleconsult",
        "home_visit",
      ],
      sex_type: ["male", "female", "other"],
    },
  },
} as const

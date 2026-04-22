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
      emergency_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone_number: string
          relationship: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone_number: string
          relationship?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone_number?: string
          relationship?: string | null
          user_id?: string
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          context: string | null
          created_at: string
          id: string
          last_checked_at: string | null
          medication_id: string | null
          messages: Json
          next_check_at: string | null
          status: string
          subject: string
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          last_checked_at?: string | null
          medication_id?: string | null
          messages?: Json
          next_check_at?: string | null
          status?: string
          subject: string
          trigger_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          last_checked_at?: string | null
          medication_id?: string | null
          messages?: Json
          next_check_at?: string | null
          status?: string
          subject?: string
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      health_sessions: {
        Row: {
          condition: string | null
          created_at: string
          explanation: Json | null
          followup_answers: Json | null
          followup_questions: Json | null
          id: string
          reasoning: string | null
          recommended_action: string | null
          risk_level: string | null
          status: string
          symptom_description: string | null
          symptoms: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          condition?: string | null
          created_at?: string
          explanation?: Json | null
          followup_answers?: Json | null
          followup_questions?: Json | null
          id?: string
          reasoning?: string | null
          recommended_action?: string | null
          risk_level?: string | null
          status?: string
          symptom_description?: string | null
          symptoms: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          condition?: string | null
          created_at?: string
          explanation?: Json | null
          followup_answers?: Json | null
          followup_questions?: Json | null
          id?: string
          reasoning?: string | null
          recommended_action?: string | null
          risk_level?: string | null
          status?: string
          symptom_description?: string | null
          symptoms?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_timeline: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          session_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_timeline_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "health_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_reports: {
        Row: {
          created_at: string
          extracted_text: string | null
          file_url: string | null
          id: string
          report_name: string
          report_type: string | null
          structured_data: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          file_url?: string | null
          id?: string
          report_name: string
          report_type?: string | null
          structured_data?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          file_url?: string | null
          id?: string
          report_name?: string
          report_type?: string | null
          structured_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      medication_logs: {
        Row: {
          created_at: string
          id: string
          medication_id: string
          notes: string | null
          scheduled_for: string
          status: string
          taken_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          medication_id: string
          notes?: string | null
          scheduled_for: string
          status?: string
          taken_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          medication_id?: string
          notes?: string | null
          scheduled_for?: string
          status?: string
          taken_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          dosage: string | null
          end_date: string | null
          frequency: string
          id: string
          missed_dose_instructions: string | null
          name: string
          notes: string | null
          purpose: string | null
          reminder_times: string[]
          start_date: string
          times_per_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          dosage?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          missed_dose_instructions?: string | null
          name: string
          notes?: string | null
          purpose?: string | null
          reminder_times?: string[]
          start_date?: string
          times_per_day?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          dosage?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          missed_dose_instructions?: string | null
          name?: string
          notes?: string | null
          purpose?: string | null
          reminder_times?: string[]
          start_date?: string
          times_per_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          allergies: string[] | null
          blood_type: string | null
          chronic_conditions: string[] | null
          created_at: string
          display_name: string | null
          emergency_contacts: Json | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          allergies?: string[] | null
          blood_type?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          display_name?: string | null
          emergency_contacts?: Json | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          allergies?: string[] | null
          blood_type?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          display_name?: string | null
          emergency_contacts?: Json | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      treatment_simulations: {
        Row: {
          baseline_metrics: Json | null
          condition: string
          created_at: string
          id: string
          insights: Json | null
          lifestyle_inputs: Json
          narrative: string | null
          projections: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          baseline_metrics?: Json | null
          condition: string
          created_at?: string
          id?: string
          insights?: Json | null
          lifestyle_inputs?: Json
          narrative?: string | null
          projections?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          baseline_metrics?: Json | null
          condition?: string
          created_at?: string
          id?: string
          insights?: Json | null
          lifestyle_inputs?: Json
          narrative?: string | null
          projections?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      twin_state: {
        Row: {
          contextual_factors: Json | null
          health_score: number | null
          id: string
          last_risk_level: string | null
          last_session_at: string | null
          recurring_conditions: Json | null
          recurring_symptoms: Json | null
          risk_baseline: string | null
          session_count: number | null
          trend: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contextual_factors?: Json | null
          health_score?: number | null
          id?: string
          last_risk_level?: string | null
          last_session_at?: string | null
          recurring_conditions?: Json | null
          recurring_symptoms?: Json | null
          risk_baseline?: string | null
          session_count?: number | null
          trend?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contextual_factors?: Json | null
          health_score?: number | null
          id?: string
          last_risk_level?: string | null
          last_session_at?: string | null
          recurring_conditions?: Json | null
          recurring_symptoms?: Json | null
          risk_baseline?: string | null
          session_count?: number | null
          trend?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      visual_analyses: {
        Row: {
          ai_findings: Json | null
          alert_recipient: string | null
          alert_sent: boolean | null
          body_location: string | null
          created_at: string
          id: string
          infection_signs: boolean | null
          photo_url: string
          severity: string | null
          urgency: string | null
          user_id: string
          user_notes: string | null
        }
        Insert: {
          ai_findings?: Json | null
          alert_recipient?: string | null
          alert_sent?: boolean | null
          body_location?: string | null
          created_at?: string
          id?: string
          infection_signs?: boolean | null
          photo_url: string
          severity?: string | null
          urgency?: string | null
          user_id: string
          user_notes?: string | null
        }
        Update: {
          ai_findings?: Json | null
          alert_recipient?: string | null
          alert_sent?: boolean | null
          body_location?: string | null
          created_at?: string
          id?: string
          infection_signs?: boolean | null
          photo_url?: string
          severity?: string | null
          urgency?: string | null
          user_id?: string
          user_notes?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

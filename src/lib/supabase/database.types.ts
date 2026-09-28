export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      holdings: {
        Row: {
          created_at: string
          currency: string
          entry_date: string
          entry_price: number
          id: string
          name: string | null
          notes: string | null
          quantity: number
          ticker: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          entry_date: string
          entry_price: number
          id?: string
          name?: string | null
          notes?: string | null
          quantity: number
          ticker: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          currency?: string
          entry_date?: string
          entry_price?: number
          id?: string
          name?: string | null
          notes?: string | null
          quantity?: number
          ticker?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_lookup_failures: {
        Row: {
          detail: string | null
          failed_at: string
          reason: string
          ticker: string
        }
        Insert: {
          detail?: string | null
          failed_at?: string
          reason: string
          ticker: string
        }
        Update: {
          detail?: string | null
          failed_at?: string
          reason?: string
          ticker?: string
        }
        Relationships: []
      }
      quote_refresh_claims: {
        Row: {
          claimed_at: string
          ticker: string
        }
        Insert: {
          claimed_at?: string
          ticker: string
        }
        Update: {
          claimed_at?: string
          ticker?: string
        }
        Relationships: []
      }
      quotes_cache: {
        Row: {
          currency: string
          fetched_at: string
          previous_close: number | null
          price: number
          source: string
          source_url: string | null
          ticker: string
        }
        Insert: {
          currency?: string
          fetched_at?: string
          previous_close?: number | null
          price: number
          source?: string
          source_url?: string | null
          ticker: string
        }
        Update: {
          currency?: string
          fetched_at?: string
          previous_close?: number | null
          price?: number
          source?: string
          source_url?: string | null
          ticker?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          alert_threshold_pct: number
          created_at: string
          daily_summary_enabled: boolean
          last_notified_at: string | null
          quote_refresh_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_threshold_pct?: number
          created_at?: string
          daily_summary_enabled?: boolean
          last_notified_at?: string | null
          quote_refresh_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_threshold_pct?: number
          created_at?: string
          daily_summary_enabled?: boolean
          last_notified_at?: string | null
          quote_refresh_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_quote_refresh: {
        Args: { p_claim_seconds: number; p_tickers: string[] }
        Returns: string[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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

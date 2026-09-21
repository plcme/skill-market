export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string; timezone: string; ui_mode: string; is_admin: boolean; created_at: string; deleted_at: string | null };
        Insert: { id: string; display_name?: string; timezone?: string; ui_mode?: string; is_admin?: boolean; created_at?: string; deleted_at?: string | null };
        Update: { id?: string; display_name?: string; timezone?: string; ui_mode?: string; is_admin?: boolean; created_at?: string; deleted_at?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: { is_admin: { Args: Record<string, never>; Returns: boolean } };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

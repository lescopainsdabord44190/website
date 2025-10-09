import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Database {
  public: {
    Tables: {
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
      };
      site_settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          description: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          key: string;
          value?: string;
          description?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string;
          description?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
      };
      pages: {
        Row: {
          id: string;
          title: string;
          slug: string;
          meta_description: string;
          content: any;
          parent_id: string | null;
          order_index: number;
          is_active: boolean;
          show_in_menu: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          meta_description?: string;
          content?: any;
          parent_id?: string | null;
          order_index?: number;
          is_active?: boolean;
          show_in_menu?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          meta_description?: string;
          content?: any;
          parent_id?: string | null;
          order_index?: number;
          is_active?: boolean;
          show_in_menu?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
      };
    };
  };
}

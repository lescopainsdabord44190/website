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
      featured_highlights: {
        Row: {
          id: string;
          title: string;
          content: any;
          link: string | null;
          link_label: string | null;
          gradient_theme: string;
          icon: string;
          order_index: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          content?: any;
          link?: string | null;
          link_label?: string | null;
          gradient_theme?: string;
          icon?: string;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          content?: any;
          link?: string | null;
          link_label?: string | null;
          gradient_theme?: string;
          icon?: string;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
      };
      counselors: {
        Row: {
          id: string;
          slug: string;
          first_name: string;
          last_name: string | null;
          role_title: string | null;
          tagline: string | null;
          bio: string | null;
          photo_url: string | null;
          focus_areas: string[];
          order_index: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          first_name: string;
          last_name?: string | null;
          role_title?: string | null;
          tagline?: string | null;
          bio?: string | null;
          photo_url?: string | null;
          focus_areas?: string[] | null;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          first_name?: string;
          last_name?: string | null;
          role_title?: string | null;
          tagline?: string | null;
          bio?: string | null;
          photo_url?: string | null;
          focus_areas?: string[] | null;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          slug: string;
          title: string;
          subtitle: string | null;
          short_description: string | null;
          age_group: string | null;
          cover_image_url: string | null;
          content: any;
          objectives: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          subtitle?: string | null;
          short_description?: string | null;
          age_group?: string | null;
          cover_image_url?: string | null;
          content?: any;
          objectives?: string[] | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          subtitle?: string | null;
          short_description?: string | null;
          age_group?: string | null;
          cover_image_url?: string | null;
          content?: any;
          objectives?: string[] | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_counselors: {
        Row: {
          project_id: string;
          counselor_id: string;
          role: string | null;
        };
        Insert: {
          project_id: string;
          counselor_id: string;
          role?: string | null;
        };
        Update: {
          project_id?: string;
          counselor_id?: string;
          role?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          is_active: boolean;
        };
        Insert: {
          id: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          email?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          email?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          is_active?: boolean;
        };
      };
      volunteers: {
        Row: {
          id: string;
          slug: string;
          first_name: string;
          last_name: string | null;
          role_title: string | null;
          bio: string | null;
          photo_url: string | null;
          is_executive_member: boolean;
          is_board_member: boolean;
          mandate_start_date: string | null;
          order_index: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          first_name: string;
          last_name?: string | null;
          role_title?: string | null;
          bio?: string | null;
          photo_url?: string | null;
          is_executive_member?: boolean;
          is_board_member?: boolean;
          mandate_start_date?: string | null;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          first_name?: string;
          last_name?: string | null;
          role_title?: string | null;
          bio?: string | null;
          photo_url?: string | null;
          is_executive_member?: boolean;
          is_board_member?: boolean;
          mandate_start_date?: string | null;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      commissions: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          order_index: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      commission_volunteers: {
        Row: {
          commission_id: string;
          volunteer_id: string;
          role: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          commission_id: string;
          volunteer_id: string;
          role?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          commission_id?: string;
          volunteer_id?: string;
          role?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

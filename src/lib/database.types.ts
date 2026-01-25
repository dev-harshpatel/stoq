// This file will be auto-generated, but for now we'll define the types manually

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          role: 'user' | 'admin';
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          business_name: string | null;
          business_address: string | null;
          business_address_components: Json | null;
          business_state: string | null;
          business_city: string | null;
          business_country: string | null;
          business_years: number | null;
          business_website: string | null;
          business_email: string | null;
          cart_items: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: 'user' | 'admin';
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          business_name?: string | null;
          business_address?: string | null;
          business_address_components?: Json | null;
          business_state?: string | null;
          business_city?: string | null;
          business_country?: string | null;
          business_years?: number | null;
          business_website?: string | null;
          business_email?: string | null;
          cart_items?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'user' | 'admin';
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          business_name?: string | null;
          business_address?: string | null;
          business_address_components?: Json | null;
          business_state?: string | null;
          business_city?: string | null;
          business_country?: string | null;
          business_years?: number | null;
          business_website?: string | null;
          business_email?: string | null;
          cart_items?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      inventory: {
        Row: {
          id: string;
          device_name: string;
          brand: string;
          grade: string;
          storage: string;
          quantity: number;
          price_per_unit: number;
          last_updated: string;
          price_change: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          device_name: string;
          brand: string;
          grade: string;
          storage: string;
          quantity?: number;
          price_per_unit: number;
          last_updated: string;
          price_change?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          device_name?: string;
          brand?: string;
          grade?: string;
          storage?: string;
          quantity?: number;
          price_per_unit?: number;
          last_updated?: string;
          price_change?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          items: Json;
          subtotal: number | null;
          tax_rate: number | null;
          tax_amount: number | null;
          total_price: number;
          status: string;
          created_at: string;
          updated_at: string;
          rejection_reason?: string | null;
          rejection_comment?: string | null;
          invoice_number?: string | null;
          invoice_date?: string | null;
          po_number?: string | null;
          payment_terms?: string | null;
          due_date?: string | null;
          hst_number?: string | null;
          invoice_notes?: string | null;
          invoice_terms?: string | null;
          invoice_confirmed?: boolean | null;
          invoice_confirmed_at?: string | null;
          discount_amount?: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          items: Json;
          subtotal?: number | null;
          tax_rate?: number | null;
          tax_amount?: number | null;
          total_price: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
          rejection_reason?: string | null;
          rejection_comment?: string | null;
          invoice_number?: string | null;
          invoice_date?: string | null;
          po_number?: string | null;
          payment_terms?: string | null;
          due_date?: string | null;
          hst_number?: string | null;
          invoice_notes?: string | null;
          invoice_terms?: string | null;
          invoice_confirmed?: boolean | null;
          invoice_confirmed_at?: string | null;
          discount_amount?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          items?: Json;
          subtotal?: number | null;
          tax_rate?: number | null;
          tax_amount?: number | null;
          total_price?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
          rejection_reason?: string | null;
          rejection_comment?: string | null;
          invoice_number?: string | null;
          invoice_date?: string | null;
          po_number?: string | null;
          payment_terms?: string | null;
          due_date?: string | null;
          hst_number?: string | null;
          invoice_notes?: string | null;
          invoice_terms?: string | null;
          invoice_confirmed?: boolean | null;
          invoice_confirmed_at?: string | null;
          discount_amount?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}


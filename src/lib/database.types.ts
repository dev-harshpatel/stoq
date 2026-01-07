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
      inventory: {
        Row: {
          id: string;
          deviceName: string;
          brand: string;
          grade: string;
          storage: string;
          quantity: number;
          pricePerUnit: number;
          lastUpdated: string;
          priceChange: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          deviceName: string;
          brand: string;
          grade: string;
          storage: string;
          quantity?: number;
          pricePerUnit: number;
          lastUpdated: string;
          priceChange?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          deviceName?: string;
          brand?: string;
          grade?: string;
          storage?: string;
          quantity?: number;
          pricePerUnit?: number;
          lastUpdated?: string;
          priceChange?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
      };
    };
  };
}


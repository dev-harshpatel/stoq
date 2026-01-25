export interface UploadHistory {
  id: string;
  uploadedBy: string;
  fileName: string;
  totalProducts: number;
  successfulInserts: number;
  failedInserts: number;
  uploadStatus: 'pending' | 'completed' | 'failed';
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedProduct {
  deviceName: string;
  brand: string;
  grade: 'A' | 'B' | 'C' | 'D';
  storage: string;
  quantity: number;
  pricePerUnit: number;
  lastUpdated?: string;
  rowNumber?: number; // For error reporting
  errors?: string[]; // Validation errors
}

export interface BulkInsertResult {
  success: number;
  failed: number;
  errors: string[];
}

/**
 * User-related types
 */

export type UserRole = 'user' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  userId: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  approvalStatusUpdatedAt: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  businessName: string | null;
  businessAddress: string | null;
  businessAddressComponents: Record<string, any> | null;
  businessState: string | null;
  businessCity: string | null;
  businessCountry: string | null;
  businessYears: number | null;
  businessWebsite: string | null;
  businessEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileInsert {
  id?: string;
  userId: string;
  role?: UserRole;
  approvalStatus?: ApprovalStatus;
  approvalStatusUpdatedAt?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  businessName?: string | null;
  businessAddress?: string | null;
  businessAddressComponents?: Record<string, any> | null;
  businessState?: string | null;
  businessCity?: string | null;
  businessCountry?: string | null;
  businessYears?: number | null;
  businessWebsite?: string | null;
  businessEmail?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfileUpdate {
  id?: string;
  userId?: string;
  role?: UserRole;
  approvalStatus?: ApprovalStatus;
  approvalStatusUpdatedAt?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  businessName?: string | null;
  businessAddress?: string | null;
  businessAddressComponents?: Record<string, any> | null;
  businessState?: string | null;
  businessCity?: string | null;
  businessCountry?: string | null;
  businessYears?: number | null;
  businessWebsite?: string | null;
  businessEmail?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

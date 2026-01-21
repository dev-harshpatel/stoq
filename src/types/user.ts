/**
 * User-related types
 */

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  userId: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileInsert {
  id?: string;
  userId: string;
  role?: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfileUpdate {
  id?: string;
  userId?: string;
  role?: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

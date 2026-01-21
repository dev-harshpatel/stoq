/**
 * Supabase utility functions for user profiles and role checking
 */

import { supabase } from './client';
import { UserProfile, UserRole } from '@/types/user';
import { Database } from '@/lib/database.types';

type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

/**
 * Convert database row to UserProfile
 */
const dbRowToUserProfile = (row: UserProfileRow): UserProfile => ({
  id: row.id,
  userId: row.user_id,
  role: row.role,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Get user profile by user ID
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching user profile:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return dbRowToUserProfile(data);
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }
};

/**
 * Get user profile by user ID (with current auth user)
 */
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }
    return getUserProfile(user.id);
  } catch (error) {
    console.error('Failed to get current user profile:', error);
    return null;
  }
};

/**
 * Check if a user is an admin
 */
export const isAdmin = async (userId: string): Promise<boolean> => {
  const profile = await getUserProfile(userId);
  return profile?.role === 'admin';
};

/**
 * Check if current user is an admin
 */
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }
    return isAdmin(user.id);
  } catch (error) {
    console.error('Failed to check admin status:', error);
    return false;
  }
};

/**
 * Create or update user profile
 */
export const upsertUserProfile = async (
  userId: string,
  role: UserRole = 'user'
): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          role,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting user profile:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return dbRowToUserProfile(data);
  } catch (error) {
    console.error('Failed to upsert user profile:', error);
    return null;
  }
};

/**
 * Update user role (admin only operation)
 */
export const updateUserRole = async (
  userId: string,
  role: UserRole
): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user role:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return dbRowToUserProfile(data);
  } catch (error) {
    console.error('Failed to update user role:', error);
    return null;
  }
};

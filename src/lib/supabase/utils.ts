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
  firstName: row.first_name,
  lastName: row.last_name,
  phone: row.phone,
  businessName: row.business_name,
  businessAddress: row.business_address,
  businessAddressComponents: row.business_address_components as Record<string, any> | null,
  businessYears: row.business_years,
  businessWebsite: row.business_website,
  businessEmail: row.business_email,
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

    const row = data as UserProfileRow;
    return dbRowToUserProfile(row);
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
    type InsertType = Database['public']['Tables']['user_profiles']['Insert'];
    
    // Use type assertion to work around @supabase/ssr type limitations
    const client = supabase.from('user_profiles') as unknown as {
      upsert: (values: InsertType, options?: { onConflict?: string; ignoreDuplicates?: boolean }) => {
        select: () => { single: () => Promise<{ data: UserProfileRow | null; error: Error | null }> };
      };
    };
    
    const { data, error } = await client
      .upsert(
        {
          user_id: userId,
          role,
        } as InsertType,
        {
          onConflict: 'user_id',
          ignoreDuplicates: true,
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting user profile:', error);
      return null;
    }

    if (data) {
      const row = data as UserProfileRow;
      return dbRowToUserProfile(row);
    }

    return getUserProfile(userId);
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
    type UpdateType = Database['public']['Tables']['user_profiles']['Update'];
    
    // Use type assertion to work around @supabase/ssr type limitations
    const client = supabase.from('user_profiles') as unknown as {
      update: (values: UpdateType) => {
        eq: (column: string, value: string) => {
          select: () => { single: () => Promise<{ data: UserProfileRow | null; error: Error | null }> };
        };
      };
    };
    
    const { data, error } = await client
      .update({ role } as UpdateType)
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

    const row = data as UserProfileRow;
    return dbRowToUserProfile(row);
  } catch (error) {
    console.error('Failed to update user role:', error);
    return null;
  }
};

/**
 * Create user profile with all details
 * Uses server API route with admin client to bypass RLS when no session exists
 */
export const createUserProfileWithDetails = async (
  userId: string,
  details: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    businessName?: string | null;
    businessAddress?: string | null;
    businessAddressComponents?: Record<string, any> | null;
    businessYears?: number | null;
    businessWebsite?: string | null;
    businessEmail?: string | null;
    role?: UserRole;
  }
): Promise<UserProfile | null> => {
  try {
    // Try using client first (works if user has session)
    type InsertType = Database['public']['Tables']['user_profiles']['Insert'];
    
    const insertData = {
      user_id: userId,
      role: details.role || 'user',
      first_name: details.firstName || null,
      last_name: details.lastName || null,
      phone: details.phone || null,
      business_name: details.businessName || null,
      business_address: details.businessAddress || null,
      business_address_components: details.businessAddressComponents || null,
      business_years: details.businessYears || null,
      business_website: details.businessWebsite || null,
      business_email: details.businessEmail || null,
    } as InsertType
    
    const client = supabase.from('user_profiles') as unknown as {
      insert: (values: InsertType) => {
        select: () => { single: () => Promise<{ data: UserProfileRow | null; error: { code?: string; message?: string; name?: string } | null }> };
      };
    };
    
    const { data, error } = await client
      .insert(insertData)
      .select()
      .single();

    // Type the error properly for Supabase errors
    const supabaseError = error as { code?: string; message?: string; name?: string } | null;
    const errorCode = supabaseError?.code;
    const errorMessage = supabaseError?.message || '';
    const isRLSError = errorCode === '42501' || errorMessage.includes('row-level security');

    if (error && isRLSError) {
      // RLS error - try using server API route with admin client
      try {
        const response = await fetch('/api/user-profile/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            firstName: details.firstName,
            lastName: details.lastName,
            phone: details.phone,
            businessName: details.businessName,
            businessAddress: details.businessAddress,
            businessAddressComponents: details.businessAddressComponents,
            businessYears: details.businessYears,
            businessWebsite: details.businessWebsite,
            businessEmail: details.businessEmail,
            role: details.role || 'user',
          }),
        })

        if (!response.ok) {
          // Return RLS error marker so caller can handle it
          return { __isRLSError: true } as unknown as UserProfile
        }

        const responseData = await response.json()
        const { profile: serverProfile } = responseData
        if (serverProfile) {
          const row = serverProfile as UserProfileRow
          const profile = dbRowToUserProfile(row)
          return profile
        } else {
          return { __isRLSError: true } as unknown as UserProfile
        }
      } catch (apiError) {
        // Return RLS error marker so caller can handle it
        return { __isRLSError: true } as unknown as UserProfile
      }
      
      // If server API also fails, return RLS error marker
      return { __isRLSError: true } as unknown as UserProfile
    }

    if (error) {
      return null;
    }

    if (data) {
      const row = data as UserProfileRow;
      const profile = dbRowToUserProfile(row);
      return profile;
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Update user profile details
 */
export const updateUserProfileDetails = async (
  userId: string,
  details: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    businessName?: string | null;
    businessAddress?: string | null;
    businessAddressComponents?: Record<string, any> | null;
    businessYears?: number | null;
    businessWebsite?: string | null;
    businessEmail?: string | null;
  }
): Promise<UserProfile | null> => {
  try {
    type UpdateType = Database['public']['Tables']['user_profiles']['Update'];
    
    const client = supabase.from('user_profiles') as unknown as {
      update: (values: UpdateType) => {
        eq: (column: string, value: string) => {
          select: () => { single: () => Promise<{ data: UserProfileRow | null; error: Error | null }> };
        };
      };
    };
    
    const updateData: Partial<UpdateType> = {};
    
    if (details.firstName !== undefined) updateData.first_name = details.firstName;
    if (details.lastName !== undefined) updateData.last_name = details.lastName;
    if (details.phone !== undefined) updateData.phone = details.phone;
    if (details.businessName !== undefined) updateData.business_name = details.businessName;
    if (details.businessAddress !== undefined) updateData.business_address = details.businessAddress;
    if (details.businessAddressComponents !== undefined) updateData.business_address_components = details.businessAddressComponents;
    if (details.businessYears !== undefined) updateData.business_years = details.businessYears;
    if (details.businessWebsite !== undefined) updateData.business_website = details.businessWebsite;
    if (details.businessEmail !== undefined) updateData.business_email = details.businessEmail;
    
    const { data, error } = await client
      .update(updateData as UpdateType)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile details:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    const row = data as UserProfileRow;
    return dbRowToUserProfile(row);
  } catch (error) {
    console.error('Failed to update user profile details:', error);
    return null;
  }
};

/**
 * Get user profile with all details (alias for getUserProfile, but kept for clarity)
 */
export const getUserProfileWithDetails = async (userId: string): Promise<UserProfile | null> => {
  return getUserProfile(userId);
};

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { useAuth } from '@/lib/auth/context';
import { UserProfile, UserRole } from '@/types/user';
import { getUserProfile, upsertUserProfile } from '@/lib/supabase/utils';

interface UserProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

interface UserProfileProviderProps {
  children: ReactNode;
}

export const UserProfileProvider = ({ children }: UserProfileProviderProps) => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async (authUser: User | null) => {
    if (!authUser) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      let userProfile = await getUserProfile(authUser.id);

      // If profile doesn't exist, create one with default 'user' role
      if (!userProfile) {
        userProfile = await upsertUserProfile(authUser.id, 'user');
      }

      setProfile(userProfile);
    } catch (error) {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadProfile(user);
    }
  }, [user, authLoading]);

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        isLoading: isLoading || authLoading,
        isAdmin,
        refreshProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};

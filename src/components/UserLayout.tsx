'use client'

import { ReactNode, useCallback } from "react";
import { UserNavbar } from "@/components/UserNavbar";
import { useRefresh } from "@/contexts/RefreshContext";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";

interface UserLayoutProps {
  children: ReactNode;
}

export const UserLayout = ({ children }: UserLayoutProps) => {
  const { triggerRefresh } = useRefresh();

  const handleRefresh = useCallback(async () => {
    triggerRefresh();
  }, [triggerRefresh]);

  const {
    autoRefresh,
    setAutoRefresh,
    lastRefreshed,
    isRefreshing,
    manualRefresh,
  } = useAutoRefresh({
    onRefresh: handleRefresh,
  });

  return (
    <div className="h-screen flex w-full bg-background overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <UserNavbar
          autoRefresh={autoRefresh}
          onAutoRefreshChange={setAutoRefresh}
          lastRefreshed={lastRefreshed}
          onRefresh={manualRefresh}
          isRefreshing={isRefreshing}
        />
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto lg:overflow-hidden">
          <div className="max-w-7xl mx-auto h-full">{children}</div>
        </main>
      </div>
    </div>
  );
};


'use client'

import { ReactNode, useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { AppSidebar } from "@/components/AppSidebar";
import { useRefresh } from "@/contexts/RefreshContext";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
// import { Footer } from '@/components/Footer';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
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
      <AppSidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          autoRefresh={autoRefresh}
          onAutoRefreshChange={setAutoRefresh}
          lastRefreshed={lastRefreshed}
          onRefresh={manualRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-hidden">
          <div className="max-w-7xl mx-auto h-full">{children}</div>
        </main>

        {/* <Footer /> */}
      </div>
    </div>
  );
}

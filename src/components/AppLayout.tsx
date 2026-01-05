import { ReactNode, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AppSidebar } from "@/components/AppSidebar";
// import { Footer } from '@/components/Footer';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const lastRefreshed = "Jan 5, 2026 at 2:34 PM";

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
        />

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        {/* <Footer /> */}
      </div>
    </div>
  );
}

import { ReactNode } from "react";
import { UserNavbar } from "@/components/UserNavbar";

interface UserLayoutProps {
  children: ReactNode;
}

export const UserLayout = ({ children }: UserLayoutProps) => {
  return (
    <div className="h-screen flex w-full bg-background overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <UserNavbar />
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};


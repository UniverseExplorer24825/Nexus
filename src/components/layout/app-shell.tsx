import * as React from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { Footer } from "./footer";

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header Navigation */}
        <MobileNav />

        {/* Content Body */}
        <main className="flex-1 pb-12">
          {children}
        </main>

        {/* Global Footer */}
        <Footer />
      </div>
    </div>
  );
}

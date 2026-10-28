"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-config";
import { BrandLogo } from "./brand-logo";
import { Badge } from "@/components/ui/badge";
import { UserNavCard } from "./user-nav-card";
import { Building2, ShieldCheck } from "lucide-react";

function SidebarNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Desktop Navigation Links">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname?.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600",
              isActive
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-800 dark:text-white"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive
                    ? "text-teal-400"
                    : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                )}
                aria-hidden="true"
              />
              <span>{item.title}</span>
            </div>
            {item.badge !== undefined && (
              <Badge
                variant={isActive ? "teal" : item.badgeVariant || "neutral"}
                className="ml-auto text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center font-mono"
              >
                {item.badge}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarNavFallback() {
  return (
    <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Navigation Skeleton">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 dark:text-slate-600"
          >
            <Icon className="h-4 w-4 shrink-0 opacity-50" />
            <span>{item.title}</span>
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside
      className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white lg:min-h-screen dark:lg:border-slate-800 dark:lg:bg-slate-950"
      aria-label="Main Navigation"
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 border-b border-slate-100 dark:border-slate-900">
        <BrandLogo showSubtitle={true} />
      </div>

      {/* Institutional Context Badge */}
      <div className="mx-4 my-4 rounded-lg border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-teal-700 dark:text-teal-400" />
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Institutional Network
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Connected to TechCircuit Consortium
        </p>
      </div>

      {/* Navigation Links wrapped in Suspense for Next.js 16 SSR */}
      <React.Suspense fallback={<SidebarNavFallback />}>
        <SidebarNavLinks />
      </React.Suspense>

      {/* User Authentication Status Card */}
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-900">
        <React.Suspense fallback={<div className="h-14 bg-slate-100 rounded-lg animate-pulse" />}>
          <UserNavCard />
        </React.Suspense>
      </div>

      {/* Trust & Safety Guarantee Footer */}
      <div className="border-t border-slate-100 p-4 dark:border-slate-900">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0" />
          <span>Audited Custody Transfers</span>
        </div>
      </div>
    </aside>
  );
}

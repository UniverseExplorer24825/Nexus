import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm tracking-wider dark:bg-slate-50 dark:text-slate-950">
              NX
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Nexus
            </span>
          </Link>
          <Badge variant="neutral" className="hidden sm:inline-flex">
            Institutional Network
          </Badge>
        </div>

        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <Link
            href="/"
            className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
          >
            Overview
          </Link>
          <Link
            href="/resources"
            className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
          >
            Directory
          </Link>
          <Link
            href="/bookings"
            className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
          >
            My Bookings
          </Link>
          <Link
            href="/activity"
            className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
          >
            Audit Trail
          </Link>
        </nav>
      </div>
    </header>
  );
}

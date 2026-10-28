import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  className?: string;
  showSubtitle?: boolean;
}

export function BrandLogo({ className, showSubtitle = false }: BrandLogoProps) {
  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-3 transition-opacity hover:opacity-90", className)}
      aria-label="Nexus Home"
    >
      {/* Brand Icon: Interlocking geometric grid mark with navy and teal */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-teal-400 shadow-sm ring-1 ring-white/10 dark:bg-slate-800">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <path d="M10 6.5h4M6.5 10v4M14 17.5h-4M17.5 14v-4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Nexus
        </span>
        {showSubtitle && (
          <span className="text-[11px] font-medium tracking-normal text-slate-500 dark:text-slate-400">
            Trusted Resource Sharing
          </span>
        )}
      </div>
    </Link>
  );
}

import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white py-6 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Nexus</span>
          <span>&bull;</span>
          <span>Trusted Resource Sharing Platform</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/resources" className="hover:text-slate-900 dark:hover:text-slate-200">
            Directory
          </Link>
          <Link href="/activity" className="hover:text-slate-900 dark:hover:text-slate-200">
            Audit Trail
          </Link>
          <Link href="/profile" className="hover:text-slate-900 dark:hover:text-slate-200">
            Institution Settings
          </Link>
        </div>
      </div>
    </footer>
  );
}

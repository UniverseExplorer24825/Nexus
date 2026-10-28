export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-slate-50/50 py-8 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          &copy; 2026 Nexus. Cross-institutional equipment & space sharing.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Built for the TechCircuit Hackathon
        </p>
      </div>
    </footer>
  );
}

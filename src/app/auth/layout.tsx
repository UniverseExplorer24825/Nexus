import * as React from "react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Badge } from "@/components/ui/badge";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <BrandLogo showSubtitle={true} />
          <Badge variant="teal" className="mt-3">
            Institutional Access Gateway
          </Badge>
        </div>

        {children}

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Protected by TechCircuit Consortium security protocols and Row-Level Security.
        </p>
      </div>
    </div>
  );
}

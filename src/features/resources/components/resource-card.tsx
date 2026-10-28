import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Building2, MapPin, ShieldCheck, Layers } from "lucide-react";
import type { ResourceWithRelations } from "../types";

export interface ResourceCardProps {
  resource: ResourceWithRelations;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const images = Array.isArray(resource.images) ? (resource.images as string[]) : [];
  const primaryImage = images.length > 0 ? images[0] : null;

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:hover:border-slate-700">
      {/* Media or Visual Header */}
      <div className="relative h-44 w-full bg-slate-100 overflow-hidden dark:bg-slate-800">
        {primaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImage}
            alt={resource.title}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
            <Layers className="h-10 w-10 stroke-[1.5]" />
            <span className="text-xs font-medium uppercase tracking-wider">
              {resource.category}
            </span>
          </div>
        )}

        {/* Status / Category Overlay Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge variant="navy" className="text-[10px] uppercase shadow-xs">
            {resource.resource_type || "Equipment"}
          </Badge>
          {resource.deposit_amount > 0 ? (
            <Badge variant="teal" className="text-[10px] shadow-xs">
              ${Number(resource.deposit_amount).toFixed(0)} Deposit
            </Badge>
          ) : (
            <Badge variant="neutral" className="text-[10px] shadow-xs">
              No Deposit
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" />
          <span className="truncate font-medium">
            {resource.institution?.name || "Independent Department"}
          </span>
        </div>

        <CardTitle className="line-clamp-1 mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
          <Link
            href={`/resources/${resource.id}`}
            className="hover:text-teal-700 dark:hover:text-teal-400"
          >
            {resource.title}
          </Link>
        </CardTitle>

        {resource.description && (
          <CardDescription className="line-clamp-2 mt-1 text-xs text-slate-600 dark:text-slate-400">
            {resource.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-1 space-y-2 flex-1">
        {resource.location && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{resource.location}</span>
          </div>
        )}

        {resource.eligibility_requirements && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Eligibility clearance required</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 py-3 dark:border-slate-800/80 dark:bg-slate-900/40">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {resource.category}
        </span>

        <Link
          href={`/resources/${resource.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
        >
          <span>View Details</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </CardFooter>
    </Card>
  );
}

import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentContainer } from "@/components/ui/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { getResourceById } from "@/features/resources/services/resource-service";
import { getCurrentUser } from "@/lib/supabase/auth";
import { MyResourceActions } from "@/features/resources/components/my-resource-actions";
import {
  ArrowLeft,
  Building2,
  MapPin,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Info,
  Layers,
  Lock,
  UserCheck,
} from "lucide-react";

interface ResourceDetailsPageProps {
  params: Promise<{ id: string }>;
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

async function ResourceDetailsContent({ params }: ResourceDetailsPageProps) {
  const { id } = await params;
  const { user } = await getCurrentUser();
  const resource = await getResourceById(id, user?.id);

  if (!resource) {
    notFound();
  }

  const isOwner = user?.id === resource.owner_id;
  const images = Array.isArray(resource.images) ? (resource.images as string[]) : [];
  const primaryImage = images.length > 0 ? images[0] : null;

  // Format availability by day
  const availabilityByDay = (resource.availability || []).sort(
    (a, b) => a.day_of_week - b.day_of_week
  );

  return (
    <div className="space-y-6">
      {/* Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/resources"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Catalog</span>
        </Link>

        {isOwner && (
          <Badge
            variant={
              resource.status === "published"
                ? "teal"
                : resource.status === "draft"
                ? "warning"
                : "neutral"
            }
            className="uppercase"
          >
            Owner View: {resource.status}
          </Badge>
        )}
      </div>

      {/* Owner Control Banner if viewing own resource */}
      {isOwner && (
        <div className="flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-teal-900/60 dark:bg-teal-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-teal-950 dark:text-teal-200">
                You are managing this listing
              </p>
              <p className="text-[11px] text-teal-800/80 dark:text-teal-400">
                {resource.status === "published"
                  ? "This listing is live and discoverable in the shared campus catalog."
                  : resource.status === "draft"
                  ? "This listing is currently in draft mode and hidden from public search."
                  : "This listing has been archived and is not accepting bookings."}
              </p>
            </div>
          </div>

          <MyResourceActions
            resourceId={resource.id}
            currentStatus={resource.status}
          />
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Primary Specs & Details (2 Cols) */}
        <div className="space-y-8 lg:col-span-2">
          {/* Main Visual Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            {primaryImage ? (
              <div className="relative aspect-video w-full bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={primaryImage}
                  alt={resource.title}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <Layers className="h-16 w-16 stroke-[1.25]" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  No apparatus photo uploaded
                </span>
              </div>
            )}

            {/* Thumbnail Strip if multiple images */}
            {images.length > 1 && (
              <div className="flex gap-2 p-3 bg-white border-t border-slate-100 overflow-x-auto dark:bg-slate-950 dark:border-slate-800">
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={`${resource.title} photo ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Title and Identification */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="navy" className="uppercase">
                {resource.resource_type || "Equipment"}
              </Badge>
              <Badge variant="neutral">{resource.category}</Badge>
              {resource.institution && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Building2 className="h-3.5 w-3.5 text-teal-600" />
                  <span>{resource.institution.name}</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              {resource.title}
            </h1>

            {resource.location && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{resource.location}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Overview & Specifications
            </h2>
            <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {resource.description || "No detailed description provided."}
            </div>
          </div>

          {/* Structured Recurring Availability Schedule */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Operating Hours & Availability Schedule
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Recurring weekly access windows maintained by the resource custodian.
                </p>
              </div>
              <Calendar className="h-5 w-5 text-teal-600" />
            </div>

            {availabilityByDay.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-slate-800">
                No recurring weekly hours have been configured for this apparatus yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {availabilityByDay.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between px-4 py-2.5 text-xs"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {DAYS_OF_WEEK[slot.day_of_week] || `Day ${slot.day_of_week}`}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-teal-600" />
                      <span>
                        {slot.start_time.slice(0, 5)} &ndash; {slot.end_time.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <Info className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
              <span>
                Operating windows specify custodian availability. Individual reservation slots and
                conflict checks are verified authoritatively by the reservation engine at time of booking.
              </span>
            </div>
          </div>

          {/* Eligibility & Safety Protocols */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Eligibility */}
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Eligibility & Training
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {resource.eligibility_requirements ||
                  "Open to all authorized institutional researchers and enrolled students with active consortium credentials."}
              </p>
            </div>

            {/* Usage Rules & Safety */}
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-teal-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Usage Rules & Protocols
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {resource.usage_rules ||
                  "Follow standard lab safety protocols. Custody logs must be signed during handoff and post-session condition inspection."}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Custodian Info & Action Card (1 Col) */}
        <div className="space-y-6">
          {/* Reservation Card */}
          <Card className="sticky top-6 shadow-md border-slate-200 dark:border-slate-800">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Security Deposit
                </span>
                <Badge variant={resource.deposit_amount > 0 ? "teal" : "neutral"}>
                  {resource.deposit_amount > 0 ? "Refundable" : "No Deposit"}
                </Badge>
              </div>

              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                  ${Number(resource.deposit_amount).toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {resource.currency || "USD"}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-2 space-y-4">
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                  <span>Institutional clearance validated</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                  <span>Condition inspection audit on return</span>
                </div>
              </div>

              {/* Informative Booking CTA (Phase 4 integration placeholder) */}
              <div className="pt-2">
                <Button
                  variant="teal"
                  size="lg"
                  className="w-full justify-center opacity-85 cursor-not-allowed"
                  disabled
                  title="Booking workflows activate in Phase 4"
                >
                  <Lock className="h-4 w-4 mr-1.5" />
                  <span>Request Booking</span>
                </Button>

                <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
                  Authoritative scheduling and dispute-free reservations will be enabled in the upcoming booking workflow phase.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Custodian Profile Card (Approved public profile fields only) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Apparatus Custodian
            </span>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-xs text-white dark:bg-slate-700">
                {(resource.owner?.full_name || "Nexus Custodian")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                  {resource.owner?.full_name || "Designated Lab Manager"}
                </p>
                <div className="flex items-center gap-1.5">
                  <Badge variant="neutral" className="text-[10px]">
                    {resource.owner?.role || "Member"}
                  </Badge>
                  {resource.owner?.verification_status === "verified" && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-teal-700 dark:text-teal-400">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Responsible for physical access authorization, apparatus orientation, and condition sign-off.
            </p>
          </div>

          {/* Institution Summary Card */}
          {resource.institution && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Host Campus / Institution
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {resource.institution.name}
              </p>
              {resource.institution.location && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {resource.institution.location}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResourceDetailsPage({ params }: ResourceDetailsPageProps) {
  return (
    <ContentContainer>
      <React.Suspense
        fallback={
          <div className="space-y-6">
            <PageHeader
              title="Resource Specifications"
              description="Loading verified apparatus specifications..."
              badge={<Badge variant="neutral">Loading</Badge>}
            />
            <LoadingState message="Resolving resource metadata and availability schedules..." />
          </div>
        }
      >
        <ResourceDetailsContent params={params} />
      </React.Suspense>
    </ContentContainer>
  );
}

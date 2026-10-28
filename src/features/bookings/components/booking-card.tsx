"use client";

import * as React from "react";
import Link from "next/link";
import { cancelBookingAction } from "../actions";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Info,
  Layers,
} from "lucide-react";
import type { BookingWithRelations } from "../types";

interface BookingCardProps {
  booking: BookingWithRelations;
}

export function BookingCard({ booking }: BookingCardProps) {
  const [isPending, startTransition] = React.useTransition();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const resource = booking.resource;
  const isCancellable = ["requested", "waitlisted", "approved"].includes(booking.status);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const handleCancel = () => {
    if (!confirm("Are you sure you want to cancel this booking request?")) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await cancelBookingAction(booking.id, "Cancelled by borrower");
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      }
    });
  };

  // Status Badge Configuration
  const getStatusBadge = () => {
    switch (booking.status) {
      case "approved":
        return <Badge variant="teal">Approved — Ready for Handover</Badge>;
      case "waitlisted":
        return (
          <Badge variant="navy">
            Waitlisted {booking.waitlist_position ? `#${booking.waitlist_position}` : ""}
          </Badge>
        );
      case "requested":
        return <Badge variant="warning">Awaiting Custodian Review</Badge>;
      case "checked_out":
        return <Badge variant="teal">In Custody</Badge>;
      case "rejected":
        return <Badge variant="danger">Declined</Badge>;
      case "cancelled":
        return <Badge variant="neutral">Cancelled</Badge>;
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      default:
        return <Badge variant="neutral">{booking.status}</Badge>;
    }
  };

  const images = Array.isArray(resource?.images) ? (resource.images as string[]) : [];
  const primaryImage = images.length > 0 ? images[0] : null;

  return (
    <Card className="overflow-hidden border-slate-200 shadow-xs dark:border-slate-800">
      <div className="flex flex-col sm:flex-row">
        {/* Media Thumbnail */}
        <div className="relative h-36 w-full sm:h-auto sm:w-48 bg-slate-100 dark:bg-slate-800 shrink-0">
          {primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryImage}
              alt={resource?.title || "Resource"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
              <Layers className="h-8 w-8 stroke-[1.5]" />
              <span className="text-[10px] font-medium uppercase mt-1">
                {resource?.category || "Equipment"}
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex flex-1 flex-col justify-between p-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {resource?.resource_type || "Equipment"}
                </span>
                <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                <span className="text-xs text-slate-500">{resource?.category}</span>
              </div>
              {getStatusBadge()}
            </div>

            <CardHeader className="p-0 pt-2 pb-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                <Link
                  href={`/resources/${booking.resource_id}`}
                  className="hover:text-teal-700 dark:hover:text-teal-400"
                >
                  {resource?.title || "Unnamed Apparatus"}
                </Link>
              </CardTitle>

              {resource?.institution && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <Building2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                  <span>{resource.institution.name}</span>
                  {resource.location && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{resource.location}</span>
                    </>
                  )}
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0 pt-2 space-y-3">
              {/* Time Window */}
              <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-1.5 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                  <span>Start: {formatDate(booking.start_time)}</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                  <span>End: {formatDate(booking.end_time)}</span>
                </div>
              </div>

              {/* Request Purpose Note */}
              {booking.request_notes && (
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Project Purpose:{" "}
                  </span>
                  <span>{booking.request_notes}</span>
                </div>
              )}

              {/* Rejection / Custodian Notes */}
              {booking.decision_notes && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <Info className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                    <span>Custodian Decision Note:</span>
                  </div>
                  <p className="mt-1 text-slate-600 dark:text-slate-400">
                    {booking.decision_notes}
                  </p>
                </div>
              )}

              {/* Eligibility Check Checklist */}
              {booking.eligibility_checks && booking.eligibility_checks.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Clearance Verifications
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {booking.eligibility_checks.map((check) => (
                      <div
                        key={check.id}
                        className="flex items-center gap-2 text-xs rounded border border-slate-100 bg-white px-2 py-1 dark:border-slate-800 dark:bg-slate-900"
                      >
                        {check.status === "passed" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                        ) : check.status === "failed" ? (
                          <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                        <span className="truncate text-slate-700 dark:text-slate-300">
                          {check.requirement}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {errorMsg}
                </div>
              )}
            </CardContent>
          </div>

          <CardFooter className="p-0 pt-4 flex items-center justify-between border-t border-slate-100 mt-4 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">
              Requested {new Date(booking.created_at).toLocaleDateString()}
            </span>

            <div className="flex items-center gap-2">
              <Link href={`/resources/${booking.resource_id}`}>
                <Button variant="ghost" size="sm">
                  <span>View Apparatus</span>
                </Button>
              </Link>

              {isCancellable && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={handleCancel}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <span>Cancel Request</span>
                </Button>
              )}
            </div>
          </CardFooter>
        </div>
      </div>
    </Card>
  );
}

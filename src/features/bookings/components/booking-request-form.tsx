"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { createBookingRequestAction, type BookingActionResult } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  User,
  Info,
} from "lucide-react";
import type { DbResource } from "@/features/resources/types";

interface BookingRequestFormProps {
  resource: DbResource;
  currentUserId?: string | null;
}

export function BookingRequestForm({
  resource,
  currentUserId,
}: BookingRequestFormProps) {
  const isOwner = currentUserId && resource.owner_id === currentUserId;
  const isPublished = resource.status === "published";

  // Calculate default start (tomorrow 09:00) and end (tomorrow 17:00) in local time
  const getDefaultDates = () => {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(9, 0, 0, 0);

    const end = new Date(start);
    end.setHours(17, 0, 0, 0);

    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const toLocalISO = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    return {
      startStr: toLocalISO(start),
      endStr: toLocalISO(end),
    };
  };

  const defaults = React.useMemo(() => getDefaultDates(), []);
  const [startTime, setStartTime] = React.useState(defaults.startStr);
  const [endTime, setEndTime] = React.useState(defaults.endStr);

  const [state, formAction, isPending] = useActionState<BookingActionResult, FormData>(
    createBookingRequestAction,
    {}
  );

  // Compute duration in human readable form
  const durationText = React.useMemo(() => {
    const s = new Date(startTime).getTime();
    const e = new Date(endTime).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return null;

    const diffHours = (e - s) / (1000 * 60 * 60);
    if (diffHours < 24) {
      return `${diffHours.toFixed(1)} hours`;
    }
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} ${diffDays === 1 ? "day" : "days"}`;
  }, [startTime, endTime]);

  if (!currentUserId) {
    return (
      <Card className="shadow-md border-slate-200 dark:border-slate-800">
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
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            Sign in with your verified institutional account to check real-time availability and request reservation slots.
          </div>
          <Link href={`/auth/sign-in?redirectTo=/resources/${resource.id}`} className="block">
            <Button variant="teal" size="lg" className="w-full justify-center">
              <User className="h-4 w-4 mr-1.5" />
              <span>Sign in to Request Booking</span>
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (isOwner) {
    return (
      <Card className="shadow-md border-teal-200 bg-teal-50/40 dark:border-teal-900/40 dark:bg-teal-950/20">
        <CardHeader className="p-5 pb-3">
          <Badge variant="teal" className="w-fit">
            Custodian Profile
          </Badge>
          <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
            You Manage This Apparatus
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-1 space-y-3 text-xs text-slate-600 dark:text-slate-400">
          <p>
            As the designated custodian for this resource, you cannot book it yourself. Incoming booking requests from researchers will appear in your approval queue.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/approvals">
              <Button variant="teal" size="sm" className="w-full">
                <span>Open Custodian Approvals</span>
              </Button>
            </Link>
            <Link href={`/my-resources/${resource.id}/edit`}>
              <Button variant="outline" size="sm" className="w-full">
                <span>Edit Resource Specifications</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isPublished) {
    return (
      <Card className="shadow-md border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
        <CardHeader className="p-5">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Lock className="h-5 w-5 shrink-0" />
            <h3 className="text-sm font-bold">Listing Unavailable</h3>
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            This apparatus listing is currently in {resource.status} mode and cannot accept reservation requests.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="sticky top-6 shadow-md border-slate-200 dark:border-slate-800">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Reservation Request
          </span>
          <Badge variant={resource.deposit_amount > 0 ? "teal" : "neutral"}>
            {resource.deposit_amount > 0 ? "Refundable Deposit" : "No Deposit"}
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

      <CardContent className="p-5 pt-2">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="resource_id" value={resource.id} />

          {/* Error Message */}
          {state?.error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          {/* Time Window Pickers */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label
                htmlFor="booking-start-time"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <Calendar className="h-3.5 w-3.5 text-teal-600" />
                <span>Requested Start Date & Time</span>
              </label>
              <input
                id="booking-start-time"
                type="datetime-local"
                name="start_time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="booking-end-time"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <Clock className="h-3.5 w-3.5 text-teal-600" />
                <span>Requested End Date & Time</span>
              </label>
              <input
                id="booking-end-time"
                type="datetime-local"
                name="end_time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            {durationText && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded dark:bg-slate-900">
                <span>Calculated Duration:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {durationText}
                </span>
              </div>
            )}
          </div>

          {/* Intended Purpose Notes */}
          <div className="space-y-1">
            <label
              htmlFor="booking-notes"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Intended Purpose & Project Scope
            </label>
            <textarea
              id="booking-notes"
              name="request_notes"
              rows={3}
              placeholder="State your department, research topic, specific test protocol, or required accessories..."
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {/* Trust Guarantees */}
          <div className="space-y-1.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-600 shrink-0" />
              <span>Eligibility check executed automatically</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
              <span>Auditable custody handoff on checkout</span>
            </div>
          </div>

          {/* Submit CTA */}
          <Button
            type="submit"
            variant="teal"
            size="lg"
            className="w-full justify-center"
            disabled={isPending}
          >
            {isPending ? (
              <span>Submitting Request...</span>
            ) : (
              <span>Request Reservation</span>
            )}
          </Button>

          <div className="flex items-start gap-1.5 text-[11px] text-slate-400">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
            <span>
              Submitting a request does not complete checkout. The custodian reviews requirements and confirms schedule slot availability.
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

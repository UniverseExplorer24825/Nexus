"use client";

import * as React from "react";
import Link from "next/link";
import { decideBookingAction, resolveEligibilityCheckAction } from "../actions";
import type { BookingWithRelations, EligibilityCheckStatus, BookingDecision } from "../types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Clock3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ApprovalCardProps {
  booking: BookingWithRelations;
}

export function ApprovalCard({ booking }: ApprovalCardProps) {
  const [isPending, startTransition] = React.useTransition();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [showRejectInput, setShowRejectInput] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");
  const [expandedDetails, setExpandedDetails] = React.useState(true);

  const resource = booking.resource;
  const borrower = booking.borrower;
  const checks = booking.eligibility_checks || [];

  const isDecidable = ["requested", "waitlisted"].includes(booking.status);
  const hasUnresolvedChecks = checks.some((c) => c.status !== "passed");

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

  const handleDecision = (decision: BookingDecision, notes?: string) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await decideBookingAction(booking.id, decision, notes);
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      } else {
        setShowRejectInput(false);
      }
    });
  };

  const handleCheckStatus = (checkId: string, newStatus: EligibilityCheckStatus) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await resolveEligibilityCheckAction(
        checkId,
        newStatus,
        `Verified by custodian on ${new Date().toLocaleDateString()}`
      );
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      }
    });
  };

  return (
    <Card className="overflow-hidden border-slate-200 shadow-xs dark:border-slate-800">
      {/* Header with Apparatus Title & Current Status */}
      <CardHeader className="p-5 pb-3 bg-slate-50/70 border-b border-slate-100 dark:bg-slate-900/40 dark:border-slate-800">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Badge variant="navy" className="text-[10px] uppercase">
                {resource?.resource_type || "Equipment"}
              </Badge>
              <span className="text-xs text-slate-500 font-medium">
                {resource?.institution?.name || "Shared Department"}
              </span>
            </div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              <Link
                href={`/resources/${booking.resource_id}`}
                className="hover:text-teal-700 dark:hover:text-teal-400"
              >
                {resource?.title}
              </Link>
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            {booking.status === "requested" && (
              <Badge variant="warning">Pending Review</Badge>
            )}
            {booking.status === "waitlisted" && (
              <Badge variant="navy">
                Waitlisted {booking.waitlist_position ? `#${booking.waitlist_position}` : ""}
              </Badge>
            )}
            {booking.status === "approved" && (
              <Badge variant="teal">Authorized & Confirmed</Badge>
            )}
            {booking.status === "rejected" && (
              <Badge variant="danger">Declined</Badge>
            )}
            {booking.status === "cancelled" && (
              <Badge variant="neutral">Cancelled</Badge>
            )}

            <button
              type="button"
              onClick={() => setExpandedDetails(!expandedDetails)}
              className="text-slate-400 hover:text-slate-600 p-1"
              title="Toggle details"
            >
              {expandedDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Borrower & Time Window Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Borrower Profile Overview */}
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Researcher / Borrower
            </span>
            <div className="mt-2 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 font-bold text-xs text-white dark:bg-slate-700">
                {(borrower?.full_name || "Borrower").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {borrower?.full_name || "Anonymous Member"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-slate-500 capitalize">
                    {borrower?.role || "Member"}
                  </span>
                  {borrower?.verification_status === "verified" ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-teal-700 dark:text-teal-400">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-600">
                      <Clock3 className="h-3 w-3" />
                      <span>Unverified</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Requested Reservation Slot */}
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Requested Reservation Time
            </span>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                <Calendar className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                <span>Start: {formatDate(booking.start_time)}</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                <Clock className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                <span>End: {formatDate(booking.end_time)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Intended Purpose */}
        {booking.request_notes && (
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Project Scope & Accessories:{" "}
            </span>
            <span>{booking.request_notes}</span>
          </div>
        )}

        {/* Eligibility Verification Review Checklist */}
        {expandedDetails && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-teal-600" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Mandatory Eligibility Prerequisites
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                All clearances must pass before approval
              </span>
            </div>

            {checks.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-1">
                No specific prerequisites configured for this apparatus.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 pt-1">
                {checks.map((check) => (
                  <div
                    key={check.id}
                    className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-2">
                      {check.status === "passed" ? (
                        <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                      ) : check.status === "failed" ? (
                        <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      ) : (
                        <Clock3 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {check.requirement}
                        </p>
                        {check.review_notes && (
                          <p className="text-[11px] text-slate-400">
                            {check.review_notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {isDecidable && (
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <Button
                          variant={check.status === "passed" ? "teal" : "outline"}
                          size="sm"
                          disabled={isPending || check.status === "passed"}
                          onClick={() => handleCheckStatus(check.id, "passed")}
                          className="h-7 text-[11px] px-2.5"
                        >
                          Verify & Pass
                        </Button>
                        <Button
                          variant={check.status === "failed" ? "danger" : "outline"}
                          size="sm"
                          disabled={isPending || check.status === "failed"}
                          onClick={() => handleCheckStatus(check.id, "failed")}
                          className="h-7 text-[11px] px-2 text-red-600 hover:text-red-700"
                        >
                          Fail
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rejection input dialog */}
        {showRejectInput && (
          <div className="rounded-lg border border-red-200 bg-red-50/70 p-3 space-y-2 dark:border-red-900/50 dark:bg-red-950/40">
            <label className="text-xs font-semibold text-red-900 dark:text-red-200">
              Reason for Declining (Recorded in Audit Trail)
            </label>
            <textarea
              rows={2}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this request cannot be approved (e.g. equipment maintenance, missing training certification, scheduling conflict)..."
              className="w-full rounded border border-red-300 bg-white p-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-600 dark:border-red-800 dark:bg-slate-950 dark:text-slate-100"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectInput(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={isPending || !rejectReason.trim()}
                onClick={() => handleDecision("rejected", rejectReason)}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        )}

        {/* Inline Error Message */}
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </CardContent>

      {/* Custodian Action Footer */}
      {isDecidable && (
        <CardFooter className="p-5 pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
          <span className="text-[11px] text-slate-400">
            Submitted {new Date(booking.created_at).toLocaleDateString()}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {/* Waitlist Action */}
            {booking.status === "requested" && (
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => handleDecision("waitlisted")}
                title="Place in fair queue if slot is temporarily busy"
              >
                <span>Add to Waitlist</span>
              </Button>
            )}

            {/* Decline Action */}
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setShowRejectInput(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <span>Decline</span>
            </Button>

            {/* Approve Action */}
            <Button
              variant="teal"
              size="sm"
              disabled={isPending || hasUnresolvedChecks}
              onClick={() => handleDecision("approved")}
              title={
                hasUnresolvedChecks
                  ? "Verify all eligibility checks before approving"
                  : "Authorize and reserve slot"
              }
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              <span>Authorize & Approve</span>
            </Button>
          </div>
        </CardFooter>
      )}

      {/* Past Decision Metadata if decided */}
      {!isDecidable && booking.decision_at && (
        <CardFooter className="p-4 py-2.5 text-xs text-slate-500 bg-slate-50 border-t border-slate-100 dark:bg-slate-900/50 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between w-full gap-2">
            <span>
              Decided on {formatDate(booking.decision_at)}
              {booking.decision_reviewer && ` by ${booking.decision_reviewer.full_name}`}
            </span>
            {booking.decision_notes && (
              <span className="italic text-slate-600 dark:text-slate-400">
                &ldquo;{booking.decision_notes}&rdquo;
              </span>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

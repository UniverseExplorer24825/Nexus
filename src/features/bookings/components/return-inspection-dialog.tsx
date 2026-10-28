"use client";

import * as React from "react";
import { inspectReturnAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  FileWarning,
} from "lucide-react";
import type { BookingWithRelations, DbConditionReport } from "../types";

interface ReturnInspectionDialogProps {
  booking: BookingWithRelations;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReturnInspectionDialog({
  booking,
  isOpen,
  onClose,
  onSuccess,
}: ReturnInspectionDialogProps) {
  const [isPending, startTransition] = React.useTransition();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [inspectionNotes, setInspectionNotes] = React.useState(
    "Apparatus return inspected and verified in operational condition. Cleanliness acceptable."
  );
  const [actionChoice, setActionChoice] = React.useState<"completed" | "flag_incident">("completed");
  const [incidentType, setIncidentType] = React.useState("damage");
  const [incidentDescription, setIncidentDescription] = React.useState("");

  if (!isOpen) return null;

  const checkoutReport = (booking.condition_reports || []).find(
    (r: DbConditionReport) => r.stage === "checkout"
  );
  const returnReport = (booking.condition_reports || []).find(
    (r: DbConditionReport) => r.stage === "return"
  );

  const checkoutPhotos = Array.isArray(checkoutReport?.photos)
    ? (checkoutReport?.photos as string[])
    : [];
  const returnPhotos = Array.isArray(returnReport?.photos)
    ? (returnReport?.photos as string[])
    : [];

  const handleDecision = (choice: "completed" | "flag_incident") => {
    setActionChoice(choice);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (actionChoice === "flag_incident" && !incidentDescription.trim()) {
      setErrorMsg("Please provide a description of the condition discrepancy or damage.");
      return;
    }

    startTransition(async () => {
      const res = await inspectReturnAction(
        booking.id,
        actionChoice,
        inspectionNotes,
        actionChoice === "flag_incident"
          ? { incidentType, description: incidentDescription }
          : undefined
      );

      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || "Inspection action failed.");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspection-dialog-title"
    >
      <div className="relative w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
                <ClipboardCheck className="h-5 w-5" />
              </span>
              <h2
                id="inspection-dialog-title"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                Custodian Return Inspection
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Compare baseline checkout condition with submitted return condition for{" "}
              <strong className="text-slate-800 dark:text-slate-200">{booking.resource?.title}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Side-by-Side Dossier Comparison */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Checkout Baseline */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                Checkout Baseline
              </span>
              {checkoutReport?.safety_acknowledged && (
                <Badge variant="teal" className="text-[10px]">
                  Safety Acknowledged
                </Badge>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">Condition Notes: </span>
                {checkoutReport?.notes || "No specific checkout notes recorded."}
              </p>

              {checkoutPhotos.length > 0 ? (
                <div>
                  <span className="text-[11px] font-semibold text-slate-500">Checkout Photos:</span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {checkoutPhotos.map((photo, i) => (
                      <a
                        key={i}
                        href={photo}
                        target="_blank"
                        rel="noreferrer"
                        className="h-16 w-16 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 hover:opacity-90"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo} alt={`Checkout photo ${i + 1}`} className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] italic text-slate-400">No checkout photographs uploaded.</p>
              )}

              {(checkoutReport?.reported_at || checkoutReport?.created_at) && (
                <p className="text-[10px] text-slate-400 pt-1">
                  Recorded: {new Date(checkoutReport.reported_at || checkoutReport.created_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Return Submission */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-teal-600" />
                Return Submission
              </span>

              {returnReport?.is_late ? (
                <Badge variant="warning" className="text-[10px]">
                  Late by {returnReport.late_minutes}m
                </Badge>
              ) : (
                <Badge variant="success" className="text-[10px]">
                  On-Time Return
                </Badge>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">Borrower Notes: </span>
                {returnReport?.notes || "No condition notes supplied."}
              </p>

              {returnReport?.issues_flagged && (
                <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                  <div className="flex items-center gap-1 font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Borrower Reported Discrepancies:
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(returnReport.issue_types || []).map((t, idx) => (
                      <Badge key={idx} variant="danger" className="text-[9px] uppercase">
                        {t.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {returnPhotos.length > 0 ? (
                <div>
                  <span className="text-[11px] font-semibold text-slate-500">Return Photos:</span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {returnPhotos.map((photo, i) => (
                      <a
                        key={i}
                        href={photo}
                        target="_blank"
                        rel="noreferrer"
                        className="h-16 w-16 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 hover:opacity-90"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo} alt={`Return photo ${i + 1}`} className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] italic text-slate-400">No return photographs uploaded.</p>
              )}

              {(returnReport?.reported_at || returnReport?.created_at) && (
                <p className="text-[10px] text-slate-400 pt-1">
                  Submitted: {new Date(returnReport.reported_at || returnReport.created_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Decision & Action Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Inspection Review Notes
            </label>
            <textarea
              rows={2}
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
              placeholder="Record your physical verification notes, clean condition confirmation, or reasons for concern..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 shadow-2xs focus:border-teal-500 focus:outline-hidden focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
            />
          </div>

          {/* Action Choice Tabs */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              Inspection Decision:
            </span>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDecision("completed")}
                className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all ${
                  actionChoice === "completed"
                    ? "border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500 dark:bg-emerald-950/40"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                }`}
              >
                <FileCheck2 className={`h-5 w-5 mt-0.5 shrink-0 ${actionChoice === "completed" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`} />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Accept Return & Complete Booking
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Apparatus is undamaged, operational, and ready for future bookings. Transaction closes cleanly.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDecision("flag_incident")}
                className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all ${
                  actionChoice === "flag_incident"
                    ? "border-rose-500 bg-rose-50/80 ring-1 ring-rose-500 dark:bg-rose-950/40"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                }`}
              >
                <FileWarning className={`h-5 w-5 mt-0.5 shrink-0 ${actionChoice === "flag_incident" ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`} />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Flag Discrepancy & Open Incident
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Do not close cleanly. Route to incident resolution for repair, missing item, or dispute tracking.
                  </div>
                </div>
              </button>
            </div>

            {/* If Flag Incident selected, collect incident details */}
            {actionChoice === "flag_incident" && (
              <div className="mt-3.5 space-y-3 border-t border-slate-200 pt-3.5 dark:border-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Discrepancy Category
                    </label>
                    <select
                      value={incidentType}
                      onChange={(e) => setIncidentType(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 shadow-2xs focus:border-rose-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="damage">Physical Damage / Wear</option>
                      <option value="malfunction">Operational Malfunction</option>
                      <option value="missing_parts">Missing Components or Accessories</option>
                      <option value="safety_concern">Safety / Hazard Violation</option>
                      <option value="late_dispute">Late Return Dispute</option>
                      <option value="incorrect_condition">Inaccurate Condition Report</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Incident Summary & Required Remedy
                    </label>
                    <input
                      type="text"
                      value={incidentDescription}
                      onChange={(e) => setIncidentDescription(e.target.value)}
                      placeholder="e.g. Broken objective lens; requires laboratory technician overhaul."
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 shadow-2xs focus:border-rose-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required={actionChoice === "flag_incident"}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={actionChoice === "completed" ? "teal" : "danger"}
              size="sm"
              isLoading={isPending}
            >
              {actionChoice === "completed" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Approve Return & Complete Loan
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-1.5" />
                  Flag Discrepancy & Open Incident
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

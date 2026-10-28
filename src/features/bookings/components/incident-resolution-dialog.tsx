"use client";

import * as React from "react";
import { resolveIncidentAction } from "../actions";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  CheckCircle2,
  X,
  FileText,
  AlertCircle,
} from "lucide-react";
import type { DbIncident } from "../types";

interface IncidentResolutionDialogProps {
  incident: DbIncident;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function IncidentResolutionDialog({
  incident,
  isOpen,
  onClose,
  onSuccess,
}: IncidentResolutionDialogProps) {
  const [isPending, startTransition] = React.useTransition();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<
    "under_review" | "awaiting_information" | "resolved" | "dismissed"
  >(
    incident.status === "open"
      ? "under_review"
      : (incident.status as "under_review" | "awaiting_information" | "resolved" | "dismissed")
  );
  const [resolutionNotes, setResolutionNotes] = React.useState(
    incident.resolution_notes || ""
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await resolveIncidentAction(
        incident.id,
        status,
        resolutionNotes
      );
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to update incident.");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incident-resolution-dialog-title"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <h2
                id="incident-resolution-dialog-title"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                Review & Resolve Incident
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Update status and record remediation notes for incident ({incident.incident_type})
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Incident Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as "under_review" | "awaiting_information" | "resolved" | "dismissed"
                )
              }
              className="mt-1.5 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 shadow-2xs focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="under_review">Under Active Review</option>
              <option value="awaiting_information">Awaiting Information / Diagnostics</option>
              <option value="resolved">Resolved (Repaired / Replaced / Cleared)</option>
              <option value="dismissed">Dismissed (No Defect / False Alarm)</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              Remediation & Resolution Notes
            </label>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Record findings, manufacturer service tickets, repair costs, or reasons for closure..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 shadow-2xs focus:border-teal-500 focus:outline-hidden focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

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
              variant="teal"
              size="sm"
              isLoading={isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Save Decision
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

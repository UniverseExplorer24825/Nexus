"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { MemberWithDetails } from "../types";
import { verifyMemberAction } from "../actions";

interface MemberVerificationDialogProps {
  member: MemberWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MemberVerificationDialog(props: MemberVerificationDialogProps) {
  if (!props.member || !props.isOpen) return null;
  return <MemberVerificationDialogInner key={props.member.id} {...props} member={props.member} />;
}

function MemberVerificationDialogInner({
  member,
  isOpen,
  onClose,
}: MemberVerificationDialogProps & { member: MemberWithDetails }) {
  const router = useRouter();
  const [decision, setDecision] = React.useState<"verified" | "rejected">(
    member.verification_status === "rejected" ? "rejected" : "verified"
  );
  const [notes, setNotes] = React.useState(member.verification_notes || "");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (decision === "rejected" && !notes.trim()) {
      setError("Please provide a recorded reason when declining institutional verification.");
      return;
    }

    startTransition(async () => {
      const res = await verifyMemberAction(member.id, decision, notes);
      if (!res.success) {
        setError(res.error || "Failed to update verification status.");
      } else {
        router.refresh();
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
            <ShieldCheck className="h-5 w-5" />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Institutional Verification Review
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Verify academic or laboratory credentials for this institution member to grant priority access to restricted apparatus.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                {member.full_name}
              </span>
              <Badge variant={member.verification_status === "verified" ? "teal" : "warning"}>
                {member.verification_status}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Department: {member.department || "General Member"}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Verification Decision
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDecision("verified")}
                className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors ${
                  decision === "verified"
                    ? "border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-600 dark:bg-teal-950/50 dark:text-teal-300 font-semibold ring-1 ring-teal-500"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>Approve Verification</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision("rejected")}
                className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors ${
                  decision === "rejected"
                    ? "border-rose-500 bg-rose-50 text-rose-800 dark:border-rose-600 dark:bg-rose-950/50 dark:text-rose-300 font-semibold ring-1 ring-rose-500"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <span>Decline Verification</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Review Notes & Justification {decision === "rejected" && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                decision === "verified"
                  ? "Optional verification badge citation (e.g., Confirmed with Faculty Registrar ID #2026-B)"
                  : "State reason for declining (e.g., Unrecognized institutional email or invalid ID card scan)"
              }
              className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className={
                decision === "verified"
                  ? "bg-teal-600 text-white hover:bg-teal-700"
                  : "bg-rose-600 text-white hover:bg-rose-700"
              }
            >
              {isPending ? "Recording..." : decision === "verified" ? "Confirm Verification" : "Decline Verification"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

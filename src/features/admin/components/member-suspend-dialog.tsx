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
import { ShieldAlert, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import type { MemberWithDetails } from "../types";
import { suspendMemberAction } from "../actions";

interface MemberSuspendDialogProps {
  member: MemberWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export function MemberSuspendDialog(props: MemberSuspendDialogProps) {
  if (!props.member || !props.isOpen) return null;
  return <MemberSuspendDialogInner key={props.member.id} {...props} member={props.member} />;
}

function MemberSuspendDialogInner({
  member,
  isOpen,
  onClose,
  currentUserId,
}: MemberSuspendDialogProps & { member: MemberWithDetails }) {
  const router = useRouter();
  const [reason, setReason] = React.useState(member.suspension_reason || "");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const isSelf = member.id === currentUserId;
  const isCurrentlySuspended = Boolean(member.is_suspended);
  const willSuspend = !isCurrentlySuspended;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSelf) {
      setError("Security Invariant: Administrators cannot alter their own account restrictions.");
      return;
    }

    if (willSuspend && !reason.trim()) {
      setError("Documented justification is mandatory when restricting member apparatus access.");
      return;
    }

    startTransition(async () => {
      const res = await suspendMemberAction(member.id, willSuspend, reason);
      if (!res.success) {
        setError(res.error || "Failed to update member access status.");
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
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="h-5 w-5" />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              {willSuspend ? "Restrict Member Apparatus Access" : "Reinstate Member Access"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            {willSuspend
              ? "Placing a member on administrative hold blocks new booking requests and pauses active reservation privileges."
              : "Reinstating access restores the member's ability to request equipment and participate in resource sharing."}
          </DialogDescription>
        </DialogHeader>

        {isSelf && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Self-restriction prohibited: You cannot suspend your own administrative account.
            </span>
          </div>
        )}

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
              <Badge variant={isCurrentlySuspended ? "danger" : "teal"}>
                {isCurrentlySuspended ? "Access Suspended" : "Good Standing"}
              </Badge>
            </div>
            {isCurrentlySuspended && member.suspension_reason && (
              <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                Prior reason: {member.suspension_reason}
              </p>
            )}
          </div>

          {willSuspend ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Documented Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State policy violation, severe apparatus damage, or unresolved safety incident report reference..."
                className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                This reason will be logged in the immutable institutional activity audit and notified to the member.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-3 text-xs text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300">
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
                <span>Restore Full Privileges</span>
              </div>
              <p className="mt-1 text-[11px] text-teal-700 dark:text-teal-400">
                Confirming will remove the administrative suspension flag and permit the user to resume booking apparatus within normal fair-use limits.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || isSelf}
              className={
                willSuspend
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-teal-600 text-white hover:bg-teal-700"
              }
            >
              {isPending
                ? "Processing..."
                : willSuspend
                ? "Confirm Suspension"
                : "Reinstate Access"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

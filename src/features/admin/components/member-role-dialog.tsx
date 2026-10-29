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
import { UserCog, AlertCircle, ShieldAlert, Check } from "lucide-react";
import type { MemberWithDetails, UserRole } from "../types";
import { updateMemberRoleAction } from "../actions";

interface MemberRoleDialogProps {
  member: MemberWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

const ROLES: { id: UserRole; title: string; description: string; badgeVariant: "neutral" | "teal" | "navy" }[] = [
  {
    id: "member",
    title: "General Member / Borrower",
    description: "Can search equipment, request bookings within fair-use limits, and record returns.",
    badgeVariant: "neutral",
  },
  {
    id: "resource_owner",
    title: "Facility Custodian / Equipment Host",
    description: "Can register apparatus, approve/reject reservation requests, issue checkouts, and conduct return condition reports.",
    badgeVariant: "teal",
  },
  {
    id: "institution_admin",
    title: "Institutional Administrator",
    description: "Has full governance over institution members, verification reviews, fair-use policies, and facility audit logs.",
    badgeVariant: "navy",
  },
];

export function MemberRoleDialog(props: MemberRoleDialogProps) {
  if (!props.member || !props.isOpen) return null;
  return <MemberRoleDialogInner key={props.member.id} {...props} member={props.member} />;
}

function MemberRoleDialogInner({
  member,
  isOpen,
  onClose,
  currentUserId,
}: MemberRoleDialogProps & { member: MemberWithDetails }) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = React.useState<UserRole>(member.role);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const isSelf = member.id === currentUserId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSelf) {
      setError("Security Invariant: Administrators cannot alter their own institutional role.");
      return;
    }

    startTransition(async () => {
      const res = await updateMemberRoleAction(member.id, selectedRole);
      if (!res.success) {
        setError(res.error || "Failed to update member role.");
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
            <UserCog className="h-5 w-5" />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Institutional Role Assignment
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Assign authorization levels for facility stewardship, equipment custody, and administration.
          </DialogDescription>
        </DialogHeader>

        {isSelf && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Self-modification restriction: You cannot reassign your own administrative privileges. Another institution administrator must modify this profile.
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
              <Badge variant="neutral" className="capitalize">
                Current: {member.role}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Department: {member.department || "General"}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Institutional Role
            </label>
            <div className="space-y-2">
              {ROLES.map((role) => {
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    disabled={isSelf}
                    onClick={() => setSelectedRole(role.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      isSelected
                        ? "border-teal-500 bg-teal-50/70 ring-1 ring-teal-500 dark:border-teal-600 dark:bg-teal-950/40"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                    } ${isSelf ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {role.title}
                      </span>
                      {isSelected && <Check className="h-4 w-4 text-teal-600 dark:text-teal-400" />}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                      {role.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || isSelf || selectedRole === member.role}
              className="bg-teal-600 text-white hover:bg-teal-700"
            >
              {isPending ? "Assigning..." : "Save Role Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

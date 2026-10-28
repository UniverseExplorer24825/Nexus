"use client";

import * as React from "react";
import Link from "next/link";
import { setResourceStatusAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Edit, Archive, Eye, CheckCircle2 } from "lucide-react";
import type { ResourceStatus } from "@/types/database.types";

interface MyResourceActionsProps {
  resourceId: string;
  currentStatus: ResourceStatus;
}

export function MyResourceActions({
  resourceId,
  currentStatus,
}: MyResourceActionsProps) {
  const [isPending, startTransition] = React.useTransition();

  const handleStatusChange = (newStatus: ResourceStatus) => {
    startTransition(async () => {
      await setResourceStatusAction(resourceId, newStatus);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Link href={`/my-resources/${resourceId}/edit`}>
        <Button variant="outline" size="sm">
          <Edit className="h-3.5 w-3.5" />
          <span>Edit</span>
        </Button>
      </Link>

      {currentStatus === "published" ? (
        <>
          <Link href={`/resources/${resourceId}`}>
            <Button variant="ghost" size="sm" title="View public page">
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => handleStatusChange("archived")}
            title="Archive listing"
          >
            <Archive className="h-3.5 w-3.5 text-slate-500 hover:text-amber-600" />
          </Button>
        </>
      ) : currentStatus === "draft" ? (
        <Button
          variant="teal"
          size="sm"
          disabled={isPending}
          onClick={() => handleStatusChange("published")}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Publish</span>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => handleStatusChange("published")}
        >
          <span>Unarchive</span>
        </Button>
      )}
    </div>
  );
}

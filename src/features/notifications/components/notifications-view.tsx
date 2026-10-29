"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Bell,
  CheckCircle2,
  CheckCheck,
  Clock,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  CalendarCheck,
} from "lucide-react";
import type { DbNotification } from "@/features/bookings/types";
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from "@/features/bookings/actions";

interface NotificationsViewProps {
  notifications: DbNotification[];
  currentUserId: string;
}

export function NotificationsView({
  notifications,
}: NotificationsViewProps) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const [isPending, startTransition] = React.useTransition();

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = (notificationId: string) => {
    startTransition(async () => {
      await markNotificationAsReadAction(notificationId);
      router.refresh();
    });
  };

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      await markAllNotificationsAsReadAction();
      router.refresh();
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "governance":
        return <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case "incident":
        return <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case "return":
        return <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "checkout":
        return <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />;
      case "booking":
      default:
        return <CalendarCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />;
    }
  };

  const formatTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Bar: Filter Tabs & Mark All As Read */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === "all"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === "unread"
                ? "bg-teal-600 text-white dark:bg-teal-700"
                : unreadCount > 0
                ? "text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <Badge variant="warning" className="h-4 px-1 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </button>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isPending}
            className="text-xs"
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1 text-slate-500" />
            <span>Mark all as read</span>
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8 text-slate-400" />}
          title={filter === "unread" ? "No unread alerts" : "Inbox is empty"}
          description={
            filter === "unread"
              ? "All notifications have been reviewed. New booking updates, inspection reports, and governance notices will appear here."
              : "You do not have any notifications on record yet. When your reservations update, equipment handovers occur, or clearances change, notices are logged here."
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((n) => {
            const hasLink = Boolean(n.link);
            return (
              <Card
                key={n.id}
                className={`overflow-hidden border transition-all ${
                  n.is_read
                    ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60"
                    : "border-teal-300 bg-teal-50/40 shadow-xs dark:border-teal-900/80 dark:bg-teal-950/20"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-2xs dark:bg-slate-800 dark:border-slate-700">
                        {getCategoryIcon(n.category)}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {n.title}
                          </h4>
                          <Badge variant="neutral" className="text-[9px] uppercase tracking-wider">
                            {n.category}
                          </Badge>
                          {!n.is_read && (
                            <span className="h-2 w-2 rounded-full bg-teal-600 animate-pulse" />
                          )}
                        </div>

                        <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                          {n.message}
                        </p>

                        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(n.created_at)}
                          </span>

                          {hasLink && (
                            <Link
                              href={n.link!}
                              onClick={() => {
                                if (!n.is_read) handleMarkAsRead(n.id);
                              }}
                              className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium dark:text-teal-400"
                            >
                              <span>View Details</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(n.id)}
                        disabled={isPending}
                        className="shrink-0 rounded-md p-1.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-teal-600 dark:hover:bg-slate-800 dark:hover:text-teal-400"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

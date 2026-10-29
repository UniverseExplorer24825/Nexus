"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  History,
  CalendarCheck,
  RotateCcw,
  AlertTriangle,
  Boxes,
  UserCog,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import type { ActivityLogWithDetails } from "@/features/admin/types";

interface ActivityDashboardViewProps {
  initialLogs: ActivityLogWithDetails[];
}

export function ActivityDashboardView({ initialLogs }: ActivityDashboardViewProps) {
  const [category, setCategory] = React.useState<string>("all");
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [expandedLogId, setExpandedLogId] = React.useState<string | null>(null);

  const filteredLogs = initialLogs.filter((log) => {
    if (category === "bookings" && !log.action_type.startsWith("booking_")) return false;
    if (category === "governance" && !log.action_type.startsWith("member_") && !log.action_type.startsWith("institution_"))
      return false;
    if (category === "incidents" && !log.action_type.startsWith("incident_")) return false;
    if (category === "resources" && !log.action_type.startsWith("resource_")) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchAction = log.action_type.toLowerCase().includes(q);
      const matchActor = log.actor?.full_name?.toLowerCase().includes(q);
      const matchResource = log.resource?.title?.toLowerCase().includes(q);
      return matchAction || matchActor || matchResource;
    }
    return true;
  });

  const getActionBadgeVariant = (action: string): "neutral" | "teal" | "warning" | "danger" | "navy" => {
    if (action.includes("rejected") || action.includes("suspended") || action.includes("damage")) return "danger";
    if (action.includes("verified") || action.includes("approved") || action.includes("completed")) return "teal";
    if (action.includes("requested") || action.includes("pending") || action.includes("waitlist")) return "warning";
    if (action.includes("admin") || action.includes("role")) return "navy";
    return "neutral";
  };

  const getActionIcon = (action: string) => {
    if (action.startsWith("incident_")) return <AlertTriangle className="h-4 w-4 text-rose-500" />;
    if (action.startsWith("member_") || action.startsWith("institution_"))
      return <UserCog className="h-4 w-4 text-purple-500" />;
    if (action.includes("return")) return <RotateCcw className="h-4 w-4 text-amber-500" />;
    if (action.startsWith("resource_")) return <Boxes className="h-4 w-4 text-teal-500" />;
    return <CalendarCheck className="h-4 w-4 text-teal-600" />;
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nexus_activity_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4">
      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: `All (${initialLogs.length})` },
            { id: "bookings", label: "Bookings & Loans" },
            { id: "governance", label: "Governance & Roles" },
            { id: "incidents", label: "Incidents & Safety" },
            { id: "resources", label: "Resources" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                category === cat.id
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search action, actor, apparatus..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {filteredLogs.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportJson} className="h-8 text-xs">
              <Download className="h-3.5 w-3.5 mr-1" />
              <span>Export</span>
            </Button>
          )}
        </div>
      </div>

      {/* Logs Table / List */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          icon={<History className="h-8 w-8 text-slate-400" />}
          title="No matching audit events"
          description="There are no activity logs matching your current search and filter selections."
        />
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <Card
                key={log.id}
                className="overflow-hidden border border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-900"
              >
                <CardContent className="p-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                        {getActionIcon(log.action_type)}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={getActionBadgeVariant(log.action_type)} className="font-mono text-[10px]">
                            {log.action_type}
                          </Badge>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            {log.actor?.full_name || "System"}
                          </span>
                          {log.actor?.role && (
                            <Badge variant="neutral" className="text-[9px] capitalize">
                              {log.actor.role}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                          {log.resource && (
                            <span className="flex items-center gap-1">
                              <span className="text-slate-400">Target Apparatus:</span>
                              <Link
                                href={`/resources/${log.resource.id}`}
                                className="font-medium text-teal-600 hover:underline dark:text-teal-400 inline-flex items-center gap-0.5"
                              >
                                {log.resource.title}
                                <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            </span>
                          )}

                          {log.booking_id && (
                            <span className="flex items-center gap-1">
                              <span className="text-slate-400">Booking Ref:</span>
                              <span className="font-mono text-[11px]">#{log.booking_id.slice(0, 8)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-[11px] text-slate-400 shrink-0">
                      <span className="font-mono">{new Date(log.created_at).toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                        title="Toggle metadata inspection"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded JSON Metadata Inspector */}
                  {isExpanded && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500">
                        <span>Sanitized Audit Payload (Immutable Record)</span>
                        <span className="font-mono text-[10px] text-slate-400">Log ID: {log.id}</span>
                      </div>
                      <pre className="mt-2 text-[11px] font-mono text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

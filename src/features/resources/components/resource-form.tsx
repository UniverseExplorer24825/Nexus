"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { createResourceAction, updateResourceAction, type ResourceActionResult } from "../actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  RESOURCE_CATEGORIES,
  RESOURCE_TYPES,
  type ResourceWithRelations,
  type DbInstitution,
} from "../types";
import {
  AlertCircle,
  Plus,
  Trash2,
  Clock,
  ShieldCheck,
  Building2,
  DollarSign,
  Upload,
} from "lucide-react";

interface AvailabilityRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface ResourceFormProps {
  initialData?: ResourceWithRelations | null;
  institutions: DbInstitution[];
}

export function ResourceForm({ initialData, institutions }: ResourceFormProps) {
  const isEditing = Boolean(initialData?.id);

  // Form action binding
  const boundAction = isEditing
    ? updateResourceAction.bind(null, initialData!.id)
    : createResourceAction;

  const [state, formAction, isPending] = useActionState<ResourceActionResult | null, FormData>(
    boundAction,
    null
  );

  // Availability schedule state
  const [availability, setAvailability] = React.useState<AvailabilityRow[]>(() => {
    if (initialData?.availability && initialData.availability.length > 0) {
      return initialData.availability.map((a) => ({
        day_of_week: a.day_of_week,
        start_time: a.start_time.substring(0, 5),
        end_time: a.end_time.substring(0, 5),
      }));
    }
    // Default: Mon-Fri 09:00 - 17:00
    return [
      { day_of_week: 1, start_time: "09:00", end_time: "17:00" },
      { day_of_week: 2, start_time: "09:00", end_time: "17:00" },
      { day_of_week: 3, start_time: "09:00", end_time: "17:00" },
      { day_of_week: 4, start_time: "09:00", end_time: "17:00" },
      { day_of_week: 5, start_time: "09:00", end_time: "17:00" },
    ];
  });

  const addAvailabilityRow = () => {
    setAvailability((prev) => [
      ...prev,
      { day_of_week: 1, start_time: "09:00", end_time: "17:00" },
    ]);
  };

  const removeAvailabilityRow = (index: number) => {
    setAvailability((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAvailabilityRow = (
    index: number,
    field: keyof AvailabilityRow,
    value: string | number
  ) => {
    setAvailability((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  return (
    <form action={formAction} className="space-y-8">
      <input
        type="hidden"
        name="availability_json"
        value={JSON.stringify(availability)}
      />

      {state?.error && (
        <div
          className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-400"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Section 1: Basic Information */}
      <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
            1. Core Asset Information
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Define identity, descriptive details, and departmental hosting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="title"
            name="title"
            label="Resource Title *"
            placeholder="e.g. JEOL JSM-IT200 Scanning Electron Microscope"
            defaultValue={initialData?.title}
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="category"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Category *
              </label>
              <select
                id="category"
                name="category"
                defaultValue={initialData?.category || RESOURCE_CATEGORIES[0]}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                required
              >
                {RESOURCE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="resource_type"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Resource Type *
              </label>
              <select
                id="resource_type"
                name="resource_type"
                defaultValue={initialData?.resource_type || "equipment"}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                required
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Description & Technical Specifications
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Detail technical capabilities, measurement accuracy, sample limits, and provided accessories..."
              defaultValue={initialData?.description || ""}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="institution_id"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Host Institution
              </label>
              <select
                id="institution_id"
                name="institution_id"
                defaultValue={initialData?.institution_id || ""}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">No affiliated institution</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              id="location"
              name="location"
              label="Room / Lab Location"
              placeholder="Building 3, Room 204B, Nanotech Bay"
              defaultValue={initialData?.location || ""}
              startIcon={<Building2 className="h-4 w-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Structured Availability Schedule */}
      <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              2. Weekly Availability Windows
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Specify standard operating hours when borrower reservations may be scheduled.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAvailabilityRow}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Window</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {availability.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              No recurring availability windows added. Borrowers will need ad-hoc approval.
            </p>
          ) : (
            availability.map((row, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                <select
                  value={row.day_of_week}
                  onChange={(e) =>
                    updateAvailabilityRow(idx, "day_of_week", parseInt(e.target.value))
                  }
                  className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {DAYS.map((dayName, dIdx) => (
                    <option key={dIdx} value={dIdx}>
                      {dayName}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5 text-xs">
                  <input
                    type="time"
                    value={row.start_time}
                    onChange={(e) =>
                      updateAvailabilityRow(idx, "start_time", e.target.value)
                    }
                    className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    required
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="time"
                    value={row.end_time}
                    onChange={(e) =>
                      updateAvailabilityRow(idx, "end_time", e.target.value)
                    }
                    className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeAvailabilityRow(idx)}
                  className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-rose-600 dark:hover:bg-slate-800"
                  aria-label="Remove window"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Section 3: Eligibility, Safety & Security Deposit */}
      <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
            3. Eligibility, Safety & Terms
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Set prerequisite clearances, operating rules, and refundable deposits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="eligibility_requirements"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Eligibility & Training Prerequisites
            </label>
            <textarea
              id="eligibility_requirements"
              name="eligibility_requirements"
              rows={3}
              placeholder="e.g. Must complete Cleanroom Safety Level 2 and possess active lab clearance..."
              defaultValue={initialData?.eligibility_requirements || ""}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="usage_rules"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Usage Rules & Safety Protocols
            </label>
            <textarea
              id="usage_rules"
              name="usage_rules"
              rows={3}
              placeholder="e.g. Safety goggles required at all times. Log all operating hours in the physical logbook..."
              defaultValue={initialData?.usage_rules || ""}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="deposit_amount"
              name="deposit_amount"
              type="number"
              min="0"
              step="1"
              label="Refundable Security Deposit ($)"
              placeholder="0"
              defaultValue={initialData?.deposit_amount || 0}
              startIcon={<DollarSign className="h-4 w-4" />}
              helperText="Set to 0 if no security deposit is required."
            />

            <div className="space-y-1.5">
              <label
                htmlFor="currency"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                defaultValue={initialData?.currency || "USD"}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Imagery & Supabase Storage Upload */}
      <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
            4. Resource Imagery
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Upload an authentic photo of the apparatus or provide a verified URL reference.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="image_file"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Upload Photo File (Supabase Storage)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="image_file"
                name="image_file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="block w-full text-xs text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Maximum 5MB (JPEG, PNG, WebP). Stored under your user path in Supabase Storage.
            </p>
          </div>

          <Input
            id="image_url"
            name="image_url"
            type="url"
            label="Or Image URL Reference (Optional)"
            placeholder="https://images.unsplash.com/..."
            defaultValue={
              Array.isArray(initialData?.images) && initialData.images.length > 0
                ? (initialData.images[0] as string)
                : ""
            }
            startIcon={<Upload className="h-4 w-4" />}
            helperText="Provide a direct image URL if not uploading a local file."
          />
        </CardContent>
      </Card>

      {/* Submission Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Link href="/my-resources">
          <Button variant="outline" size="md">
            Cancel
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            name="status"
            value="draft"
            variant="secondary"
            size="md"
            isLoading={isPending}
          >
            Save as Draft
          </Button>

          <Button
            type="submit"
            name="status"
            value="published"
            variant="teal"
            size="md"
            isLoading={isPending}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{isEditing ? "Update & Publish" : "Publish Listing"}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}

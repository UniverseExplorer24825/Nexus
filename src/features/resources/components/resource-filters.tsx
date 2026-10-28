"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RESOURCE_CATEGORIES, RESOURCE_TYPES, type DbInstitution } from "../types";
import { Search, RotateCcw, SlidersHorizontal } from "lucide-react";

interface ResourceFiltersProps {
  institutions: DbInstitution[];
}

export function ResourceFilters({ institutions }: ResourceFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.get("query") || "";
  const currentCategory = searchParams.get("category") || "All";
  const currentType = searchParams.get("resourceType") || "all";
  const currentInstitution = searchParams.get("institutionId") || "all";
  const currentSort = searchParams.get("sort") || "newest";

  const [queryInput, setQueryInput] = React.useState(currentQuery);

  const applyFilters = React.useCallback(
    (overrides: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(overrides).forEach(([key, value]) => {
        if (!value || value === "all" || value === "All") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      // Reset page to 1 on filter change
      params.delete("page");

      router.push(`/resources?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ query: queryInput.trim() || null });
  };

  const handleReset = () => {
    setQueryInput("");
    router.push("/resources");
  };

  const hasActiveFilters = Boolean(
    currentQuery ||
      (currentCategory && currentCategory !== "All") ||
      (currentType && currentType !== "all") ||
      (currentInstitution && currentInstitution !== "all") ||
      (currentSort && currentSort !== "newest")
  );

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="flex-1">
          <Input
            id="search-resources"
            type="text"
            placeholder="Search instruments by name, specs, or capabilities..."
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            startIcon={<Search className="h-4 w-4 text-slate-400" />}
          />
        </div>
        <Button type="submit" variant="teal" size="md">
          <span>Search</span>
        </Button>
      </form>

      {/* Filter Selectors */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-1">
        {/* Category */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Category
          </label>
          <select
            value={currentCategory}
            onChange={(e) => applyFilters({ category: e.target.value })}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="All">All Categories</option>
            {RESOURCE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Resource Type */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Asset Type
          </label>
          <select
            value={currentType}
            onChange={(e) => applyFilters({ resourceType: e.target.value })}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="all">All Asset Types</option>
            {RESOURCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Institution */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Institution
          </label>
          <select
            value={currentInstitution}
            onChange={(e) => applyFilters({ institutionId: e.target.value })}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="all">All Institutions</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sorting */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Sort Order
          </label>
          <select
            value={currentSort}
            onChange={(e) => applyFilters({ sort: e.target.value })}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="newest">Recently Listed</option>
            <option value="title_asc">Alphabetical (A - Z)</option>
            <option value="deposit_asc">Deposit (Low to High)</option>
            <option value="deposit_desc">Deposit (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Active Filter Chips & Reset */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-teal-600" />
            <span>Active filters applied</span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-400 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset All</span>
          </button>
        </div>
      )}
    </div>
  );
}

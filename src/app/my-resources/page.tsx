import * as React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getMyResources } from "@/features/resources/services/resource-service";
import { MyResourceActions } from "@/features/resources/components/my-resource-actions";
import { ContentContainer } from "@/components/ui/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Boxes, PlusCircle, Building2, MapPin, Clock, LogIn, DollarSign } from "lucide-react";

async function MyResourcesContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const statusFilter = typeof params.status === "string" ? params.status : undefined;
  const { user } = await getCurrentUser();

  if (!user) {
    return (
      <EmptyState
        icon={<LogIn className="h-6 w-6 text-teal-600" />}
        title="Sign in to access Custodian Portal"
        description="You must be signed in with your institutional credentials to list laboratory apparatus, configure operating hours, and manage custody handovers."
        action={
          <Link href="/auth/sign-in?redirectTo=/my-resources">
            <Button variant="teal" size="md">
              <LogIn className="h-4 w-4" />
              <span>Sign In to Account</span>
            </Button>
          </Link>
        }
      />
    );
  }

  const resources = await getMyResources(user.id);

  const publishedCount = resources.filter((r) => r.status === "published").length;
  const draftCount = resources.filter((r) => r.status === "draft").length;
  const archivedCount = resources.filter((r) => r.status === "archived").length;

  const filteredResources = statusFilter && statusFilter !== "all"
    ? resources.filter((r) => r.status === statusFilter)
    : resources;

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-medium text-slate-500">Total Listings</span>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {resources.length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-medium text-emerald-600">Published</span>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {publishedCount}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-medium text-amber-600">Drafts</span>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {draftCount}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-medium text-slate-400">Archived</span>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {archivedCount}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        {[
          { label: "All Assets", value: "all", count: resources.length },
          { label: "Published", value: "published", count: publishedCount },
          { label: "Drafts", value: "draft", count: draftCount },
          { label: "Archived", value: "archived", count: archivedCount },
        ].map((tab) => {
          const isActive = (!statusFilter && tab.value === "all") || statusFilter === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.value === "all" ? "/my-resources" : `/my-resources?status=${tab.value}`}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <span>{tab.label}</span>
              <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] dark:bg-white/20">
                {tab.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Listings or Empty State */}
      {filteredResources.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-6 w-6 text-slate-400" />}
          title="No resources found in this view"
          description={
            statusFilter
              ? `You do not have any items currently marked as "${statusFilter}".`
              : "You have not registered any equipment or workspaces under your custodian profile yet."
          }
          action={
            <Link href="/my-resources/new">
              <Button variant="teal" size="sm">
                <PlusCircle className="h-4 w-4" />
                <span>Register First Resource</span>
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredResources.map((res) => {
            const availabilityCount = res.availability?.length || 0;
            const images = Array.isArray(res.images) ? (res.images as string[]) : [];

            return (
              <Card
                key={res.id}
                className="overflow-hidden border-slate-200 bg-white transition-shadow hover:shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    {images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={images[0]}
                        alt={res.title}
                        className="h-16 w-16 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-800"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
                        <Boxes className="h-8 w-8 stroke-[1.5]" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {res.title}
                        </h3>
                        <Badge
                          variant={
                            res.status === "published"
                              ? "teal"
                              : res.status === "draft"
                              ? "warning"
                              : "neutral"
                          }
                          className="capitalize text-[10px]"
                        >
                          {res.status}
                        </Badge>
                        <Badge variant="navy" className="text-[10px] uppercase">
                          {res.resource_type || "Equipment"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {res.category}
                        </span>
                        {res.institution && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-teal-600" />
                            <span>{res.institution.name}</span>
                          </div>
                        )}
                        {res.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{res.location}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 pt-1 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{availabilityCount} availability window(s)</span>
                        </div>
                        {res.deposit_amount > 0 && (
                          <div className="flex items-center gap-0.5 text-slate-600 dark:text-slate-300">
                            <DollarSign className="h-3 w-3 text-teal-600" />
                            <span>${Number(res.deposit_amount).toFixed(0)} deposit</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="sm:self-center">
                    <MyResourceActions resourceId={res.id} currentStatus={res.status} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MyResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <ContentContainer>
      <PageHeader
        title="Custodian Resources"
        description="Manage equipment, laboratories, and workspaces hosted by your research department."
        badge={<Badge variant="teal">Asset Management</Badge>}
        actions={
          <Link href="/my-resources/new">
            <Button variant="teal" size="sm">
              <PlusCircle className="h-4 w-4" />
              <span>Register New Asset</span>
            </Button>
          </Link>
        }
      />

      <div className="mt-8">
        <React.Suspense
          fallback={
            <div className="p-12 text-center text-sm text-slate-500">
              Loading custodian catalog...
            </div>
          }
        >
          <MyResourcesContent searchParams={searchParams} />
        </React.Suspense>
      </div>
    </ContentContainer>
  );
}

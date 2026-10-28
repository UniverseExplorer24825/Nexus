import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function Home() {
  const pillars = [
    {
      title: "Resource Discovery",
      description:
        "Centralized directory of underused academic lab apparatus, rapid-prototyping tools, and testing facilities.",
      tag: "Catalog",
      status: "Configured",
    },
    {
      title: "Eligibility & Clearance",
      description:
        "Strict departmental clearances, user training verifications, and safety compliance checks prior to access.",
      tag: "Compliance",
      status: "Configured",
    },
    {
      title: "Custody & Approvals",
      description:
        "Two-party owner authorization workflows, scheduled checkout handovers, and clear chains of responsibility.",
      tag: "Governance",
      status: "Configured",
    },
    {
      title: "Auditable Lifecycle & Returns",
      description:
        "Immutable return inspection records, condition grading, and an auditable activity history for accountability.",
      tag: "Audit Trail",
      status: "Configured",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <Badge variant="info" className="mb-4">
          TechCircuit Hackathon &bull; Platform Foundation
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-slate-50">
          Nexus Resource Network
        </h1>
        <p className="mt-4 text-lg text-slate-600 sm:text-xl dark:text-slate-300">
          A secure, institutional resource-sharing framework enabling universities, laboratories,
          and makerspaces to discover and safely share underused scientific equipment and spaces.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {pillars.map((pillar) => (
          <Card key={pillar.title} className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {pillar.tag}
                </span>
                <Badge variant="neutral">{pillar.status}</Badge>
              </div>
              <CardTitle>{pillar.title}</CardTitle>
              <CardDescription>{pillar.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mx-auto mt-16 max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Engineering Foundation Status
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Next.js 16 (App Router) + TypeScript Strict Mode initialized</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Tailwind CSS design tokens and accessible UI primitives configured</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Domain-driven, feature-oriented folder structure established</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Supabase integration layer prepared (Browser, Server, Middleware, Admin with RLS security guards)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Safe environment placeholder configuration (.env.example) documented</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

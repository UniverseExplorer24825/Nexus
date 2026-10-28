"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthActionResult } from "../actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Mail, Lock, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    signUp,
    null
  );

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Create Member Profile
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
          Join the Nexus equipment & space sharing consortium. All accounts start as standard members.
        </CardDescription>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="space-y-4">
          {state?.error && (
            <div
              className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-400"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{state.error}</span>
            </div>
          )}

          {state?.success && state?.message && (
            <div
              className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
              role="status"
            >
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Verification Email Sent</span>
              </div>
              <p>{state.message}</p>
              <div className="mt-2">
                <Link href="/auth/sign-in">
                  <Button variant="outline" size="sm">
                    Proceed to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {!state?.success && (
            <>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                label="Full Name & Academic Title"
                placeholder="Dr. Jane Doe / John Smith"
                autoComplete="name"
                required
                startIcon={<User className="h-4 w-4" />}
              />

              <Input
                id="email"
                name="email"
                type="email"
                label="Institutional Email"
                placeholder="member@university.edu"
                helperText="Use your college, university, or lab institutional domain."
                autoComplete="email"
                required
                startIcon={<Mail className="h-4 w-4" />}
              />

              <Input
                id="password"
                name="password"
                type="password"
                label="Password"
                placeholder="••••••••"
                helperText="Minimum 8 characters with letters and numbers."
                autoComplete="new-password"
                required
                startIcon={<Lock className="h-4 w-4" />}
              />

              <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <ShieldAlert className="h-4 w-4 shrink-0 text-teal-600" />
                <span>
                  Elevated roles (Resource Owner, Lab Manager, Admin) and institutional verifications
                  are assigned strictly by verified administrators.
                </span>
              </div>
            </>
          )}
        </CardContent>

        {!state?.success && (
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              variant="teal"
              size="md"
              className="w-full"
              isLoading={isPending}
            >
              Register Account
            </Button>

            <p className="text-center text-xs text-slate-600 dark:text-slate-400">
              Already have an account?{" "}
              <Link
                href="/auth/sign-in"
                className="font-semibold text-teal-700 hover:text-teal-800 hover:underline dark:text-teal-400"
              >
                Sign In
              </Link>
            </p>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}

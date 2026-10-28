"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type AuthActionResult } from "../actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    requestPasswordReset,
    null
  );

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Reset Password
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
          Enter your registered institutional email to receive recovery instructions.
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
              className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400"
              role="status"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{state.message}</span>
            </div>
          )}

          <Input
            id="email"
            name="email"
            type="email"
            label="Institutional Email"
            placeholder="researcher@university.edu"
            autoComplete="email"
            required
            startIcon={<Mail className="h-4 w-4" />}
          />
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            variant="teal"
            size="md"
            className="w-full"
            isLoading={isPending}
          >
            Send Recovery Link
          </Button>

          <Link
            href="/auth/sign-in"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { updatePassword, type AuthActionResult } from "../actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, AlertCircle } from "lucide-react";

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    updatePassword,
    null
  );

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Set New Password
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
          Enter your new institutional account password.
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

          <Input
            id="password"
            name="password"
            type="password"
            label="New Password"
            placeholder="••••••••"
            helperText="Minimum 8 characters."
            autoComplete="new-password"
            required
            startIcon={<Lock className="h-4 w-4" />}
          />

          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm New Password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            startIcon={<Lock className="h-4 w-4" />}
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
            Update Password
          </Button>

          <Link
            href="/auth/sign-in"
            className="text-center text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Cancel and Return to Sign In
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}

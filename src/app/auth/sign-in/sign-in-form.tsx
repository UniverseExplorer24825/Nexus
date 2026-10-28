"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthActionResult } from "../actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react";

interface SignInFormProps {
  initialError?: string;
  initialMessage?: string;
  redirectTo?: string;
}

export function SignInForm({
  initialError,
  initialMessage,
  redirectTo = "/",
}: SignInFormProps) {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    signIn,
    null
  );

  const displayError = state?.error || initialError;
  const displayMessage = state?.message || initialMessage;

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Sign In to Nexus
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
          Enter your institutional credentials to access shared equipment and custody workflows.
        </CardDescription>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {displayError && (
            <div
              className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-400"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{displayError}</span>
            </div>
          )}

          {displayMessage && (
            <div
              className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400"
              role="status"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{displayMessage}</span>
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

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline dark:text-teal-400"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              startIcon={<Lock className="h-4 w-4" />}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            variant="teal"
            size="md"
            className="w-full"
            isLoading={isPending}
          >
            Sign In
          </Button>

          <p className="text-center text-xs text-slate-600 dark:text-slate-400">
            Don&apos;t have an institutional account yet?{" "}
            <Link
              href="/auth/sign-up"
              className="font-semibold text-teal-700 hover:text-teal-800 hover:underline dark:text-teal-400"
            >
              Register here
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

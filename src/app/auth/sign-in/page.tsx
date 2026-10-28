import * as React from "react";
import { SignInForm } from "./sign-in-form";

async function SignInPageContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const initialError = typeof params.error === "string" ? params.error : undefined;
  const initialMessage = typeof params.message === "string" ? params.message : undefined;
  const redirectTo = typeof params.redirectTo === "string" ? params.redirectTo : "/";

  return (
    <SignInForm
      initialError={initialError}
      initialMessage={initialMessage}
      redirectTo={redirectTo}
    />
  );
}

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading portal...</div>}>
      <SignInPageContent searchParams={searchParams} />
    </React.Suspense>
  );
}

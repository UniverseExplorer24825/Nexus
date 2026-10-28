import * as React from "react";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading registration...</div>}>
      <SignUpForm />
    </React.Suspense>
  );
}

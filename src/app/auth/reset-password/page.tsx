import * as React from "react";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading password reset...</div>}>
      <ResetPasswordForm />
    </React.Suspense>
  );
}

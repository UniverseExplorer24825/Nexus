import * as React from "react";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading recovery...</div>}>
      <ForgotPasswordForm />
    </React.Suspense>
  );
}

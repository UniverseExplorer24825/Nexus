import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Forward to requested destination or root
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to sign in with error message if exchange fails
  return NextResponse.redirect(
    `${origin}/auth/sign-in?error=Unable to verify authentication link. It may have expired.`
  );
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/lib/database.types";
import { type EmailOtpType } from "@supabase/supabase-js";

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Can be ignored if middleware is refreshing user sessions
          }
        },
      },
    }
  );
}

async function redirectByRole(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  origin: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile && (profile as { role: string }).role === "admin") {
      return NextResponse.redirect(`${origin}/admin/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const code = requestUrl.searchParams.get("code");

  try {
    const supabase = await getSupabaseClient();

    // Token hash flow (email confirmation links) — no PKCE verifier needed
    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      });

      if (error) {
        console.error("[Auth Callback] Token verification error:", {
          message: error.message,
          status: error.status,
        });
        return NextResponse.redirect(`${origin}/auth/auth-code-error`);
      }

      return redirectByRole(supabase, origin);
    }

    // PKCE code flow (legacy / OAuth)
    if (code) {
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("[Auth Callback] Code exchange error:", {
          message: exchangeError.message,
          status: exchangeError.status,
        });

        // Check if user is already verified despite the error
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && user.email_confirmed_at) {
          return NextResponse.redirect(`${origin}/`);
        }

        if (
          exchangeError.message?.includes("redirect") ||
          exchangeError.message?.includes("URL")
        ) {
          return NextResponse.redirect(
            `${origin}/auth/auth-code-error?reason=redirect_mismatch`
          );
        }

        return NextResponse.redirect(`${origin}/auth/auth-code-error`);
      }

      return redirectByRole(supabase, origin);
    }

    // No token_hash and no code — invalid callback
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[Auth Callback] Unexpected error:", err?.message);
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }
}

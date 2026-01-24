import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/lib/database.types'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (!code) {
    // No code provided - redirect to error page
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    // Exchange the code for a session
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      // If the error is about redirect URL mismatch, provide helpful message
      if (exchangeError.message?.includes('redirect') || exchangeError.message?.includes('URL')) {
        // This usually means the redirect URL in the email doesn't match the allowed URLs
        // Redirect to error page with specific message
        return NextResponse.redirect(`${origin}/auth/auth-code-error?reason=redirect_mismatch`)
      }
      
      // Other errors - redirect to error page
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }

    // Successfully exchanged code for session
    if (sessionData?.session) {
      // Get user profile to determine redirect
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single()

        // Redirect based on role
        if (profile && (profile as { role: string }).role === 'admin') {
          return NextResponse.redirect(`${origin}/admin/dashboard`)
        } else {
          return NextResponse.redirect(`${origin}/`)
        }
      }
      
      // User exists but couldn't get profile - redirect to home
      return NextResponse.redirect(`${origin}/`)
    }

    // No session after exchange - this shouldn't happen but handle it
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  } catch (error: any) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }
}

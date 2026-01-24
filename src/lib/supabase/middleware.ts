import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '../database.types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string, value: string, options: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define protected admin routes that require authentication
  // All routes starting with /admin (except /admin/login) are protected
  const pathname = request.nextUrl.pathname
  
  // Check if there's an auth code in the query params (email confirmation)
  // This handles cases where Supabase redirects to root path with code
  const code = request.nextUrl.searchParams.get('code')
  if (code && pathname === '/') {
    // Redirect to auth callback handler if code is present on root path
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/user',
    '/login',
    '/signup',
    '/admin/login', // Admin login is public
    '/auth/callback',
    '/auth/auth-code-error'
  ]
  const isAdminRoute = pathname.startsWith('/admin')
  const isAdminLogin = pathname === '/admin/login'
  const isProtectedAdminRoute = isAdminRoute && !isAdminLogin

  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some(route =>
    route === pathname || (route === '/' && pathname === '/')
  )

  // If user is not authenticated and trying to access protected admin route
  if (!user && isProtectedAdminRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // If user is authenticated and trying to access login/signup pages, redirect based on role
  if (user && (pathname === '/login' || pathname === '/signup' || isAdminLogin)) {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      const url = request.nextUrl.clone()
      if (profile && (profile as { role: string }).role === 'admin') {
        const redirectPath = url.searchParams.get('redirect') || '/admin/dashboard'
        url.pathname = redirectPath
      } else {
        // Regular users go to home
        url.pathname = '/'
      }
      url.searchParams.delete('redirect')
      return NextResponse.redirect(url)
    } catch (error) {
      // If profile check fails, redirect to home
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.delete('redirect')
      return NextResponse.redirect(url)
    }
  }

  // If user is authenticated and accessing root route, check if admin and redirect
  if (user && pathname === '/') {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (profile && (profile as { role: string }).role === 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/dashboard'
        return NextResponse.redirect(url)
      }
    } catch (error) {
      // If profile check fails, continue to root page
      // This allows non-admin users to access the root route
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return supabaseResponse
}


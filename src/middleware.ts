import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const publicPaths = ['/login', '/waitlist', '/auth/callback']

function isAllowedEmail(email: string): boolean {
    const allowedEmails =
        process.env.ALLOWED_EMAILS?.split(',').map((value) => value.trim().toLowerCase()) ?? []
    return allowedEmails.includes(email.toLowerCase())
}

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    let user = null
    try {
        const {
            data: { user: fetchedUser },
        } = await supabase.auth.getUser()
        user = fetchedUser
    } catch (error) {
        console.error('Error getting user in middleware:', error)
        // On auth error, redirect to login
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    const path = request.nextUrl.pathname

    if (publicPaths.some((publicPath) => path.startsWith(publicPath))) {
        return supabaseResponse
    }

    if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        const redirectResponse = NextResponse.redirect(url)
        // Copy cookies from supabaseResponse to preserve session
        supabaseResponse.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') {
                redirectResponse.headers.append(key, value)
            }
        })
        return redirectResponse
    }

    if (user.email && !isAllowedEmail(user.email)) {
        const url = request.nextUrl.clone()
        url.pathname = '/waitlist'
        const redirectResponse = NextResponse.redirect(url)
        // Copy cookies from supabaseResponse to preserve session
        supabaseResponse.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') {
                redirectResponse.headers.append(key, value)
            }
        })
        return redirectResponse
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    // Validate and normalize the 'next' parameter to prevent open-redirect
    let normalizedNext = '/'
    if (next.startsWith('/') && !next.startsWith('//') && !next.includes('http') && !next.includes('://')) {
        // Resolve dot-segments (e.g., /../ or /./)
        try {
            const url = new URL(next, 'http://dummy.com')
            normalizedNext = url.pathname
        } catch {
            normalizedNext = '/'
        }
    }

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocal = process.env.NODE_ENV === 'development'

            if (isLocal) {
                return NextResponse.redirect(`${origin}${normalizedNext}`)
            }

            if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${normalizedNext}`)
            }

            return NextResponse.redirect(`${origin}${normalizedNext}`)
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}

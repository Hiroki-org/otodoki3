import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    // Validate and normalize the 'next' parameter to prevent open-redirect
    let normalizedNext = '/'
    if (next.startsWith('/') && !next.startsWith('//')) {
        // Reject any URL scheme patterns (javascript:, data:, etc.)
        const dangerousPatterns = ['javascript:', 'data:', 'vbscript:', 'file:', ':', '\\'];
        const lowerNext = next.toLowerCase();
        const hasDangerousScheme = dangerousPatterns.some(pattern =>
            lowerNext.includes(pattern)
        );

        if (hasDangerousScheme) {
            normalizedNext = '/';
        } else {
            // Resolve dot-segments (e.g., /../ or /./)
            try {
                const url = new URL(next, 'http://dummy.com');
                // Only use pathname if protocol is http and hostname is dummy
                if (url.protocol === 'http:' && url.hostname === 'dummy.com') {
                    normalizedNext = url.pathname;
                }
            } catch {
                normalizedNext = '/';
            }
        }
    }

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host')
            const forwardedProto = request.headers.get('x-forwarded-proto')

            if (forwardedHost) {
                const proto = forwardedProto === 'https' ? 'https' : 'http';
                return NextResponse.redirect(`${proto}://${forwardedHost}${normalizedNext}`)
            }

            return NextResponse.redirect(`${origin}${normalizedNext}`)
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}

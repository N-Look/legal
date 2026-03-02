import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const publicPaths = ['/', '/login'];
const publicApiPrefixes = ['/api/auth', '/api/cron'];

function isPublicRoute(pathname: string): boolean {
    if (publicPaths.includes(pathname)) return true;
    return publicApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
    const { user, supabaseResponse } = await updateSession(request);
    const { pathname } = request.nextUrl;

    // Logged-in user visiting /login → redirect to dashboard
    if (pathname === '/login' && user) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    // Protected route without session → redirect to login
    if (!isPublicRoute(pathname) && !user) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico, sitemap.xml, robots.txt
         * - public folder assets
         */
        '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
};

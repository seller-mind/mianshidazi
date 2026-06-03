import { type NextRequest, NextResponse } from 'next/server';

// Geo-block: China mainland (compliance with AI regulations)
const BLOCKED_COUNTRIES = ['CN'];

export async function middleware(request: NextRequest) {
  // Block China mainland access
  const country = request.geo?.country || request.headers.get('x-vercel-ip-country') || '';
  if (BLOCKED_COUNTRIES.includes(country)) {
    return new NextResponse('This service is not available in your region.', {
      status: 451,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Geo-block: China mainland (compliance with AI regulations)
export function middleware(request: NextRequest) {
  // Vercel provides x-vercel-ip-country header
  const country = request.headers.get('x-vercel-ip-country') || '';
  if (country === 'CN') {
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

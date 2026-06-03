import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Service suspended — product on hold
export function middleware(request: NextRequest) {
  return new NextResponse('This service is currently unavailable. We are not accepting new users at this time.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

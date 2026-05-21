import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // 只做基本处理，认证逻辑由客户端和API层负责
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

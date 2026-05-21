import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // 跳过API路由和登录相关页面 - 我们用自定义JWT认证，不走Supabase auth
  const path = request.nextUrl.pathname;
  if (path.startsWith('/api/') || path === '/login') {
    return NextResponse.next();
  }
  
  // 检查是否有认证token（cookie或localStorage通过header传递）
  const token = request.cookies.get('msd_token')?.value;
  
  // 对于practice页面，需要登录
  if (path.startsWith('/practice') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

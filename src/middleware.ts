import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Exclude assets, next internals, api, and files
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  const hasUserId = request.cookies.has('room_os_user_id');
  const hasRoomId = request.cookies.has('room_id');

  const isLoginPage = path === '/login';
  const isOnboardingPage = path === '/onboarding';

  // 1. Not authenticated
  if (!hasUserId) {
    if (!isLoginPage) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // 2. Authenticated but no room selected
  if (!hasRoomId) {
    if (!isOnboardingPage && !isLoginPage) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
    return NextResponse.next();
  }

  // 3. Authenticated and has room selected
  if (isLoginPage || isOnboardingPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

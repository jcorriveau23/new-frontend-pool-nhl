import createMiddleware from 'next-intl/middleware';
import {locales, localePrefix} from './navigation';
import { NextRequest, NextResponse } from 'next/server';
 
const middleware = createMiddleware({
  defaultLocale: 'en',
  localePrefix,
  locales
});
 

export default function customMiddleware(request: NextRequest) {
  const url = new URL(request.url);

  const { pathname } = url;
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] || 'en';
  let selectedDate = segments[1] || 'now';

  const regex = /^\d{4}-\d{2}-\d{2}$/;
  // If selectedDate is missing or invalid, default to 'now'
  if ((selectedDate !== "now" && !selectedDate.match(regex))) {
    url.pathname = `/${locale}/now`;
    return NextResponse.redirect(url);
  }

  return middleware(request);
}

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(fr|en)/:selectedDate/:path*']
};
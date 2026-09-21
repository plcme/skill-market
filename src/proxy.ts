import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicSupabaseConfig } from '@/env';

export async function proxy(request: NextRequest) {
  const config = getPublicSupabaseConfig();
  if (!config) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (values, headers) => {
      values.forEach(({name, value}) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      values.forEach(({name, value, options}) => response.cookies.set(name, value, options));
      Object.entries(headers ?? {}).forEach(([name, value]) => response.headers.set(name, value));
      response.headers.set('Cache-Control', 'private, no-store');
    },
  } });
  await supabase.auth.getClaims();
  return response;
}

export const config = { matcher: ['/me/:path*', '/practitioner/:path*', '/chat/:path*', '/admin/:path*', '/auth/:path*'] };

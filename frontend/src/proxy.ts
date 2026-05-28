import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isEnabled = process.env.ENABLE_IP_RESTRICTION === 'true';
  
  if (!isEnabled) {
    return NextResponse.next();
  }

  const nextRequestWithIp = request as NextRequest & { ip?: string };
  let ip = nextRequestWithIp.ip || request.headers.get('x-forwarded-for') || '';

  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  const allowedIpsString = process.env.ALLOWED_IPS || '';
  const allowedIps = allowedIpsString.split(',').map(item => item.trim());

  if (!allowedIps.includes(ip)) {
    return new NextResponse(
      JSON.stringify({ error: 'Accès refusé : IP non autorisée.' }),
      { status: 403, headers: { 'content-type': 'application/json' } }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
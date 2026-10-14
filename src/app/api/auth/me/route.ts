import { NextRequest, NextResponse } from 'next/server';
import { isRequestAuthenticated } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const authenticated = await isRequestAuthenticated(req);
  return NextResponse.json({ authenticated });
}

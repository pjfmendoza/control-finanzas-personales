import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth/session';

export async function POST() {
  const res = NextResponse.json({ ok: true, message: 'Sesión cerrada' });
  res.cookies.delete(COOKIE_NAME);
  return res;
}

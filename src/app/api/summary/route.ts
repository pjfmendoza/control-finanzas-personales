import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/db';
import { isRequestAuthenticated } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const isAuth = await isRequestAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || undefined;

  const summary = await dbService.getFinancialSummary(period);
  return NextResponse.json({ summary });
}

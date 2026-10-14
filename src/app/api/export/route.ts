import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/db';
import { isRequestAuthenticated } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const isAuth = await isRequestAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'csv';
  const allTxs = await dbService.getTransactions({ limit: 50000 });
  const dateStr = new Date().toISOString().split('T')[0];

  if (format === 'json') {
    return new NextResponse(JSON.stringify(allTxs, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="finanzas-export-${dateStr}.json"`,
      },
    });
  }

  // Formato CSV estándar RFC 4180
  const headers = ['id', 'date', 'type', 'amount', 'currency', 'category', 'merchant', 'description', 'payment_method', 'source', 'created_at'];
  const rows = allTxs.map(t => [
    t.id,
    t.date,
    t.type,
    t.amount,
    t.currency,
    `"${(t.categoryName || '').replace(/"/g, '""')}"`,
    `"${(t.merchantName || '').replace(/"/g, '""')}"`,
    `"${t.description.replace(/"/g, '""')}"`,
    t.paymentMethod || 'other',
    t.source,
    t.createdAt.toISOString(),
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');

  return new NextResponse('\uFEFF' + csvContent, { // \uFEFF BOM para compatibilidad con Excel UTF-8
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="finanzas-export-${dateStr}.csv"`,
    },
  });
}

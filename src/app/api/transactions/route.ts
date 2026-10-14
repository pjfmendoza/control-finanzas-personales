import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/db';
import { isRequestAuthenticated } from '@/lib/auth/session';
import { z } from 'zod';

const CreateTxSchema = z.object({
  type: z.enum(['expense', 'income', 'transfer']),
  amount: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1),
  categoryName: z.string().optional(),
  merchantName: z.string().optional(),
  paymentMethod: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const isAuth = await isRequestAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const type = (searchParams.get('type') as any) || undefined;
  const query = searchParams.get('query') || undefined;
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  const transactions = await dbService.getTransactions({
    startDate,
    endDate,
    type,
    query,
    limit,
  });

  return NextResponse.json({ transactions });
}

export async function POST(req: NextRequest) {
  const isAuth = await isRequestAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = CreateTxSchema.parse(body);

    const tx = await dbService.createTransaction({
      ...validated,
      paymentMethod: validated.paymentMethod as any,
      source: 'dashboard',
      confidence: 1.0,
    });

    return NextResponse.json({ ok: true, transaction: tx }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Datos inválidos' }, { status: 400 });
  }
}

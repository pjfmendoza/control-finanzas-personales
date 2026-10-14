import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/db';
import { isRequestAuthenticated } from '@/lib/auth/session';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const isAuth = await isRequestAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = params;
  const deleted = await dbService.deleteTransaction(id);

  if (!deleted) {
    return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, message: 'Transacción eliminada' });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const isAuth = await isRequestAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const tx = await dbService.getTransactionById(params.id);
  if (!tx) {
    return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
  }

  return NextResponse.json({ transaction: tx });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const isAuth = await isRequestAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { categoryName, description, amount } = body;

    await dbService.updateTransaction(params.id, {
      categoryName,
      description,
      amount: amount ? Math.round(amount) : undefined,
    });

    return NextResponse.json({ ok: true, message: 'Transacción actualizada' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al actualizar' }, { status: 400 });
  }
}

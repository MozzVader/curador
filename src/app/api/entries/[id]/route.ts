import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = await db.blogEntry.findUnique({
    where: { id },
  });

  if (!entry) {
    return NextResponse.json({ error: 'Entrada no encontrada' }, { status: 404 });
  }

  return NextResponse.json(entry);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: 'Se requiere status' }, { status: 400 });
  }

  const validStatuses = ['pending', 'approved', 'discarded', 'needs_editing'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
  }

  const entry = await db.blogEntry.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(entry);
}
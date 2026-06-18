import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  await db.blogEntry.deleteMany({});
  return NextResponse.json({ success: true, message: 'Todos los datos fueron eliminados' });
}
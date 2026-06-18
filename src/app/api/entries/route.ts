import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || '';
  const status = searchParams.get('status') || '';
  const label = searchParams.get('label') || '';
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'publishedAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const where: Record<string, unknown> = {};

  if (type) where.entryType = type;
  if (status) where.status = status;
  if (label) {
    // SQLite JSON search: labels contains the label string
    where.labels = { contains: label };
  }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ];
  }

  // Build the orderBy
  const orderBy: Record<string, string> = {};
  const validSortFields = ['publishedAt', 'title', 'wordCount', 'commentCount', 'createdAt'];
  if (validSortFields.includes(sortBy)) {
    orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
  } else {
    orderBy.publishedAt = 'desc';
  }

  // Handle null publishedAt for sorting: put nulls at the end
  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    db.blogEntry.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        entryId: true,
        entryType: true,
        title: true,
        publishedAt: true,
        author: true,
        labels: true,
        status: true,
        issues: true,
        wordCount: true,
        commentCount: true,
      },
    }),
    db.blogEntry.count({ where }),
  ]);

  return NextResponse.json({
    entries,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Se requiere status' }, { status: 400 });
    }

    const validStatuses = ['pending', 'approved', 'discarded', 'needs_editing'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    let result;

    if (ids === 'ALL' || ids === 'ALL_CURRENT_FILTERS') {
      // Update ALL entries (exclude comments for bulk approve)
      const where = ids === 'ALL_CURRENT_FILTERS'
        ? { entryType: { not: 'COMMENT' } }
        : {};
      result = await db.blogEntry.updateMany({ where, data: { status } });
    } else if (Array.isArray(ids)) {
      result = await db.blogEntry.updateMany({
        where: { id: { in: ids } },
        data: { status },
      });
    } else {
      return NextResponse.json({ error: 'ids debe ser un array o "ALL"' }, { status: 400 });
    }

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error('Batch update error:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
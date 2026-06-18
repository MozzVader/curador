import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    where.labels = { contains: label };
  }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ];
  }

  const orderBy: Record<string, string> = {};
  const validSortFields = ['publishedAt', 'title', 'wordCount', 'commentCount', 'createdAt'];
  if (validSortFields.includes(sortBy)) {
    orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
  } else {
    orderBy.publishedAt = 'desc';
  }

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

  const response = NextResponse.json({
    entries,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, status, filter } = body;

    if (!status) {
      return NextResponse.json({ error: 'Se requiere status' }, { status: 400 });
    }

    const validStatuses = ['pending', 'approved', 'discarded', 'needs_editing'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    let where: Record<string, unknown> = {};

    if (ids === 'ALL_FILTERED') {
      // Use the same filter as the current view, excluding comments only if filter is empty
      if (filter) {
        if (filter.type) where.entryType = filter.type;
        if (filter.status) where.status = filter.status;
        if (filter.label) where.labels = { contains: filter.label };
        if (filter.search) {
          where.OR = [
            { title: { contains: filter.search } },
            { content: { contains: filter.search } },
          ];
        }
      } else {
        // No filter specified: apply to non-comments only
        where.entryType = { not: 'COMMENT' };
      }
    } else if (ids === 'DISCARD_ALL_COMMENTS') {
      // Special case: discard all comments regardless of current filter
      where.entryType = 'COMMENT';
    } else if (Array.isArray(ids)) {
      where = { id: { in: ids } };
    } else {
      return NextResponse.json({ error: 'ids inválido' }, { status: 400 });
    }

    const result = await db.blogEntry.updateMany({ where, data: { status } });
    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error('Batch update error:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
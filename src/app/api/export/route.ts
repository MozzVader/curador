import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exportToJson, exportToMarkdown, exportToHtml, exportToMuseumHtml, type MuseumEntry } from '@/lib/exporter';
import { cleanContent } from '@/lib/atom-parser';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const status = searchParams.get('status') || 'all';

  // Build where clause — always exclude comments
  const where: Record<string, unknown> = {
    entryType: { not: 'COMMENT' },
  };

  // Allow filtering by status; "all" means no status filter
  if (status && status !== 'all') {
    if (status.includes('+')) {
      where.status = { in: status.split('+') };
    } else {
      where.status = status;
    }
  }

  // Museum format needs extra fields
  const isMuseum = format === 'museum-html';

  const entries = await db.blogEntry.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    select: {
      id: isMuseum ? true : false,
      title: true,
      content: true,
      publishedAt: true,
      author: true,
      originalUrl: true,
      labels: true,
      status: true,
      issues: true,
      wordCount: true,
      platforms: isMuseum ? true : false,
      nostalgiaScore: isMuseum ? true : false,
      smokeIndex: isMuseum ? true : false,
    },
  });

  if (entries.length === 0) {
    return NextResponse.json({ error: 'No hay entradas para exportar con los filtros seleccionados' }, { status: 404 });
  }

  // Clean content for export
  const cleanedEntries = entries.map(e => ({
    ...e,
    content: cleanContent(e.content),
  }));

  let content: string;
  let mimeType: string;
  let fileExtension: string;

  switch (format) {
    case 'museum-html':
      content = exportToMuseumHtml(cleanedEntries as unknown as MuseumEntry[]);
      mimeType = 'text/html';
      fileExtension = 'museum.html';
      break;

    case 'markdown':
    case 'md':
      content = exportToMarkdown(cleanedEntries);
      mimeType = 'text/markdown';
      fileExtension = 'md';
      break;

    case 'html':
      content = exportToHtml(cleanedEntries);
      mimeType = 'text/html';
      fileExtension = 'html';
      break;

    case 'json':
    default:
      content = exportToJson(cleanedEntries);
      mimeType = 'application/json';
      fileExtension = 'json';
      break;
  }

  // Include status in filename for clarity
  const statusLabel = status === 'all' ? 'todos' : status;

  return new NextResponse(content, {
    headers: {
      'Content-Type': `${mimeType}; charset=utf-8`,
      'Content-Disposition': `attachment; filename="curador-${statusLabel}-${Date.now()}.${fileExtension}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
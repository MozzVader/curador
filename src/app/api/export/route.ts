import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exportToJson, exportToMarkdown, exportToHtml } from '@/lib/exporter';
import { cleanContent } from '@/lib/atom-parser';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const status = searchParams.get('status') || 'approved';
  const type = searchParams.get('type') || '';

  // Build where clause
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.entryType = type;

  // Exclude comments from exports (they're not posts)
  where.entryType = { not: 'COMMENT' };

  const entries = await db.blogEntry.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
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

  return new NextResponse(content, {
    headers: {
      'Content-Type': `${mimeType}; charset=utf-8`,
      'Content-Disposition': `attachment; filename="curador-export-${Date.now()}.${fileExtension}"`,
    },
  });
}
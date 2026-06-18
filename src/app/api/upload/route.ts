import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseAtomXml, detectIssues, cleanContent } from '@/lib/atom-parser';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.atom') && !fileName.endsWith('.xml')) {
      return NextResponse.json({ error: 'El archivo debe ser .atom o .xml' }, { status: 400 });
    }

    // Limit file size to 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo es demasiado grande (máximo 50MB)' }, { status: 400 });
    }

    const xmlString = await file.text();

    console.log(`[UPLOAD] File: ${file.name}, Size: ${file.size}, XML length: ${xmlString.length}`);
    console.log(`[UPLOAD] First 300 chars: ${xmlString.substring(0, 300)}`);

    // Parse the Atom XML
    let result;
    try {
      result = parseAtomXml(xmlString);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al parsear el XML';
      console.error('[UPLOAD] Parse error:', msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Log parse results
    const withTitle = result.entries.filter(e => e.title && e.title.trim().length > 0).length;
    console.log(`[UPLOAD] Parsed: ${result.entries.length} entries, ${withTitle} with title, strategy: ${result.debugInfo.parseStrategy}`);
    console.log(`[UPLOAD] Debug info:`, JSON.stringify(result.debugInfo));
    console.log(`[UPLOAD] First 3 titles:`, result.entries.slice(0, 3).map(e => `"${e.title}" (${e.entryType})`));
    console.log(`[UPLOAD] Skipped:`, JSON.stringify(result.skippedTypes));

    // Prepare all entries data before touching the database
    const entriesToCreate = result.entries.map(entry => {
      const issues = detectIssues(entry.content, entry.title, entry.entryType);
      return {
        entryId: entry.entryId,
        entryType: entry.entryType,
        title: entry.title || 'Sin título',
        content: entry.content,
        publishedAt: entry.publishedAt,
        atomUpdated: entry.atomUpdated,
        author: entry.author,
        labels: JSON.stringify(entry.labels),
        originalUrl: entry.originalUrl,
        status: 'pending' as const,
        issues: JSON.stringify(issues),
        wordCount: entry.content
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 0).length,
        commentCount: entry.commentCount,
        parentId: entry.parentId,
      };
    });

    // Atomic operation: delete old data and insert new data in a single transaction
    await db.$transaction(async (tx) => {
      await tx.blogEntry.deleteMany({});
      await tx.blogEntry.createMany({
        data: entriesToCreate,
      });
    });

    const storedCount = entriesToCreate.length;

    console.log(`[UPLOAD] Stored ${storedCount} entries in DB`);

    const response = NextResponse.json({
      success: true,
      blogTitle: result.blogTitle,
      blogAuthor: result.blogAuthor,
      totalEntries: result.entries.length,
      storedCount,
      skippedTypes: result.skippedTypes,
      breakdown: {
        POST: result.entries.filter(e => e.entryType === 'POST').length,
        PAGE: result.entries.filter(e => e.entryType === 'PAGE').length,
        DRAFT: result.entries.filter(e => e.entryType === 'DRAFT').length,
        COMMENT: result.entries.filter(e => e.entryType === 'COMMENT').length,
      },
      debugInfo: result.debugInfo,
      _firstTitles: result.entries.slice(0, 5).map(e => e.title || '(sin título)'),
    });

    // Add no-cache headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');

    return response;
  } catch (error) {
    console.error('[UPLOAD] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
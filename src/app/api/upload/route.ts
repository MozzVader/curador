import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseAtomXml, detectIssues, cleanContent } from '@/lib/atom-parser';

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

    // Parse the Atom XML
    let result;
    try {
      result = parseAtomXml(xmlString);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al parsear el XML';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Clear previous data for a fresh import
    await db.blogEntry.deleteMany({});

    // Store entries in the database
    let storedCount = 0;
    for (const entry of result.entries) {
      const issues = detectIssues(entry.content, entry.title, entry.entryType);

      await db.blogEntry.create({
        data: {
          entryId: entry.entryId,
          entryType: entry.entryType,
          title: entry.title || 'Sin título',
          content: entry.content,
          publishedAt: entry.publishedAt,
          atomUpdated: entry.atomUpdated,
          author: entry.author,
          labels: JSON.stringify(entry.labels),
          originalUrl: entry.originalUrl,
          status: 'pending',
          issues: JSON.stringify(issues),
          wordCount: entry.content
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 0).length,
          commentCount: entry.commentCount,
          parentId: entry.parentId,
        },
      });
      storedCount++;
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
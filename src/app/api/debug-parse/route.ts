import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

// This endpoint accepts an .atom/.xml file and returns the RAW parsed structure
// of the first 3 entries so we can see exactly what fast-xml-parser produces.
// This is a diagnostic tool — NOT for production use.

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 });
    }

    const xmlString = await file.text();

    // ── Strategy A: namespace prefixes preserved ──
    const parserA = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (_tagName: string, jpath: string) => {
        return ['entry', 'link', 'category', 'author'].some(t => jpath.endsWith(t));
      },
      textPropName: '#text',
      cdataPropName: '#cdata',
      processEntities: true,
      htmlEntities: true,
      trimValues: true,
    });

    const parsedA = parserA.parse(xmlString);

    // ── Strategy B: namespace prefixes removed ──
    const parserB = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
      isArray: (_tagName: string, jpath: string) => {
        return ['entry', 'link', 'category', 'author'].some(t => jpath.endsWith(t));
      },
      textPropName: '#text',
      cdataPropName: '#cdata',
      processEntities: true,
      htmlEntities: true,
      trimValues: true,
    });

    const parsedB = parserB.parse(xmlString);

    // ── Strategy C: pre-process XML (remove xmlns) then parse ──
    let cleaned = xmlString.replace(/<\?xml-stylesheet[^?]*\?>/g, '');
    cleaned = cleaned.replace(/\s+xmlns(?::[a-zA-Z0-9_-]+)?="[^"]*"/g, '');

    const parserC = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (_tagName: string, jpath: string) => {
        return ['entry', 'link', 'category', 'author'].some(t => jpath.endsWith(t));
      },
      textPropName: '#text',
      cdataPropName: '#cdata',
      processEntities: true,
      htmlEntities: true,
      trimValues: true,
    });

    const parsedC = parserC.parse(cleaned);

    // Extract first 3 entries from each strategy
    const getEntries = (parsed: Record<string, unknown>, n: number) => {
      const feed = parsed.feed as Record<string, unknown> | undefined;
      if (!feed) return [];
      const raw = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : [];
      return raw.slice(0, n).map(e => {
        const obj = e as Record<string, unknown>;
        return {
          keys: Object.keys(obj),
          id: obj.id,
          title: obj.title,
          bloggerType: obj['blogger:type'],
          bloggerStatus: obj['blogger:status'],
          bloggerFilename: obj['blogger:filename'],
          bloggerParent: obj['blogger:parent'],
          bloggerTrashed: obj['blogger:trashed'],
          type: obj['type'],
          status: obj['status'],
          filename: obj['filename'],
          content_length: typeof obj.content === 'string'
            ? obj.content.length
            : typeof obj.content === 'object' && obj.content
              ? JSON.stringify(obj.content).length
              : 0,
          content_preview: typeof obj.content === 'string'
            ? obj.content.substring(0, 200)
            : typeof obj.content === 'object' && obj.content
              ? JSON.stringify(obj.content).substring(0, 200)
              : '(empty)',
          categories: Array.isArray(obj.category)
            ? obj.category.slice(0, 3).map((c: Record<string, unknown>) => ({
                term: c['@_term'],
                scheme: c['@_scheme'],
              }))
            : [],
          links: Array.isArray(obj.link)
            ? obj.link.slice(0, 3).map((l: Record<string, unknown>) => ({
                rel: l['@_rel'],
                type: l['@_type'],
                href: l['@_href'],
              }))
            : [],
        };
      });
    };

    const feedA = parsedA.feed as Record<string, unknown> | undefined;
    const feedLinksA: unknown[] = Array.isArray(feedA?.link) ? feedA!.link : [];

    return NextResponse.json({
      info: {
        fileName: file.name,
        fileSize: file.size,
        xmlLength: xmlString.length,
        first200chars: xmlString.substring(0, 200),
        cleanedFirst200chars: cleaned.substring(0, 200),
      },
      feedLinks: feedLinksA.slice(0, 5).map((l: Record<string, unknown>) => ({
        rel: l['@_rel'],
        type: l['@_type'],
        href: l['@_href'],
      })),
      strategyA_nsPreserved: {
        totalEntries: Array.isArray(feedA?.entry)
          ? feedA!.entry.length
          : feedA?.entry ? 1 : 0,
        firstEntries: getEntries(parsedA, 3),
      },
      strategyB_nsRemoved: {
        totalEntries: Array.isArray((parsedB.feed as Record<string, unknown>)?.entry)
          ? ((parsedB.feed as Record<string, unknown>)!.entry as unknown[]).length
          : (parsedB.feed as Record<string, unknown>)?.entry ? 1 : 0,
        firstEntries: getEntries(parsedB, 3),
      },
      strategyC_nsCleaned: {
        totalEntries: Array.isArray((parsedC.feed as Record<string, unknown>)?.entry)
          ? ((parsedC.feed as Record<string, unknown>)!.entry as unknown[]).length
          : (parsedC.feed as Record<string, unknown>)?.entry ? 1 : 0,
        firstEntries: getEntries(parsedC, 3),
      },
    });
  } catch (error) {
    console.error('Debug parse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
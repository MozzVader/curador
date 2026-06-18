import { XMLParser } from 'fast-xml-parser';

// ── Types ──────────────────────────────────────────────────────────────────

interface ParsedEntry {
  entryId: string;
  entryType: 'POST' | 'PAGE' | 'DRAFT' | 'COMMENT';
  title: string;
  content: string;
  publishedAt: string | null;
  atomUpdated: string | null;
  author: string | null;
  labels: string[];
  originalUrl: string | null;
  commentCount: number;
  parentId: string | null;
}

interface ParseResult {
  blogTitle: string;
  blogAuthor: string;
  blogUrl: string | null;
  entries: ParsedEntry[];
  skippedTypes: { type: string; count: number }[];
  debugInfo: {
    parseStrategy: string;
    firstEntryKeys: string[];
    sampleTitle: string;
    sampleBloggerType: string;
    sampleBloggerStatus: string;
    sampleFilename: string;
  };
}

// ── Blogger-specific constants ─────────────────────────────────────────────

const DEAD_IMAGE_HOSTS = [
  'imageshack',
  'photobucket',
  'tinypic',
  'subefotos',
  'picoodle',
];

// ── Platform Definitions (for nostalgia & smoke detection) ─────────────────

export interface PlatformMatch {
  name: string;
  category: 'video_hosting' | 'image_hosting' | 'social' | 'messaging' | 'technology' | 'service' | 'os';
  matchType: 'link' | 'embed' | 'mention';
  nostalgiaWeight: number;
  smokeWeight: number;
}

interface PlatformDef {
  name: string;
  category: PlatformMatch['category'];
  patterns: RegExp[];
  matchType: PlatformMatch['matchType'];
  nostalgiaWeight: number;
  smokeWeight: number;
}

const PLATFORM_DEFS: PlatformDef[] = [
  // ── Video hosting (dead) ──
  { name: 'Megavideo', category: 'video_hosting', patterns: [/megavideo\.(com|es)/i], matchType: 'link', nostalgiaWeight: 12, smokeWeight: 5 },
  { name: 'Megaupload', category: 'video_hosting', patterns: [/megaupload\.(com|net)/i], matchType: 'link', nostalgiaWeight: 12, smokeWeight: 5 },
  { name: 'Putlocker', category: 'video_hosting', patterns: [/putlock(?:er|s)\.(com|is|ch|pw)/i], matchType: 'link', nostalgiaWeight: 8, smokeWeight: 5 },
  { name: 'Videoweed', category: 'video_hosting', patterns: [/videoweed\.(es|com)/i], matchType: 'link', nostalgiaWeight: 8, smokeWeight: 4 },
  { name: 'Novamov', category: 'video_hosting', patterns: [/novamov\.(com|es)/i], matchType: 'link', nostalgiaWeight: 8, smokeWeight: 4 },
  { name: 'Movshare', category: 'video_hosting', patterns: [/movshare\.net/i], matchType: 'link', nostalgiaWeight: 8, smokeWeight: 4 },
  { name: 'Stagevu', category: 'video_hosting', patterns: [/stagevu\.(com|es)/i], matchType: 'link', nostalgiaWeight: 7, smokeWeight: 4 },
  { name: 'DivxStage', category: 'video_hosting', patterns: [/divxstage\.(com|net)/i, /xvidstage\.(com|net)/i], matchType: 'link', nostalgiaWeight: 7, smokeWeight: 4 },
  { name: 'Duckload', category: 'video_hosting', patterns: [/duckload\.(com|net)/i], matchType: 'link', nostalgiaWeight: 7, smokeWeight: 4 },
  { name: 'FileServe', category: 'video_hosting', patterns: [/fileserve\.com/i], matchType: 'link', nostalgiaWeight: 6, smokeWeight: 3 },
  { name: 'FileSonic', category: 'video_hosting', patterns: [/filesonic\./i], matchType: 'link', nostalgiaWeight: 6, smokeWeight: 3 },
  { name: 'RapidShare', category: 'video_hosting', patterns: [/rapidshare\.com/i], matchType: 'link', nostalgiaWeight: 6, smokeWeight: 3 },
  { name: '4shared', category: 'video_hosting', patterns: [/4shared\.com/i], matchType: 'link', nostalgiaWeight: 5, smokeWeight: 3 },

  // ── Image hosting (dead/degraded) ──
  { name: 'Imageshack', category: 'image_hosting', patterns: [/imageshack\./i], matchType: 'link', nostalgiaWeight: 4, smokeWeight: 3 },
  { name: 'Photobucket', category: 'image_hosting', patterns: [/photobucket\./i], matchType: 'link', nostalgiaWeight: 4, smokeWeight: 3 },
  { name: 'Tinypic', category: 'image_hosting', patterns: [/tinypic\.(com|net)/i], matchType: 'link', nostalgiaWeight: 4, smokeWeight: 3 },
  { name: 'Subefotos', category: 'image_hosting', patterns: [/subefotos\.com/i], matchType: 'link', nostalgiaWeight: 4, smokeWeight: 3 },
  { name: 'Imagebam', category: 'image_hosting', patterns: [/imagebam\./i], matchType: 'link', nostalgiaWeight: 4, smokeWeight: 3 },

  // ── Social networks (dead) ──
  { name: 'Google+', category: 'social', patterns: [/plus\.google\.com/i, /google\+/i, /gplus\./i], matchType: 'link', nostalgiaWeight: 8, smokeWeight: 4 },
  { name: 'Orkut', category: 'social', patterns: [/orkut\.com/i, /\borkut\b/i], matchType: 'mention', nostalgiaWeight: 8, smokeWeight: 4 },
  { name: 'Hi5', category: 'social', patterns: [/hi5\.com/i, /\bhi5\b/i], matchType: 'mention', nostalgiaWeight: 6, smokeWeight: 3 },
  { name: 'MySpace', category: 'social', patterns: [/myspace\.com/i, /\bmyspace\b/i], matchType: 'mention', nostalgiaWeight: 5, smokeWeight: 2 },
  { name: 'Vine', category: 'social', patterns: [/vine\.co/i, /\bvine\b(?=\s|.|$)/i], matchType: 'mention', nostalgiaWeight: 5, smokeWeight: 2 },

  // ── Messaging (dead) ──
  { name: 'MSN Messenger', category: 'messaging', patterns: [/msn\s*messenger/i, /windows\s*live\s*messenger/i], matchType: 'mention', nostalgiaWeight: 8, smokeWeight: 3 },
  { name: 'ICQ', category: 'messaging', patterns: [/\bicq\b/i, /icq\.com/i], matchType: 'mention', nostalgiaWeight: 8, smokeWeight: 3 },
  { name: 'Yahoo Messenger', category: 'messaging', patterns: [/yahoo\s*messenger/i], matchType: 'mention', nostalgiaWeight: 6, smokeWeight: 3 },

  // ── Technologies (dead/deprecated) ──
  { name: 'Flash Player', category: 'technology', patterns: [/flash\s*player/i, /\.swf\b/i, /<object[^>]*flash/i, /<embed[^>]*\.swf/i], matchType: 'embed', nostalgiaWeight: 15, smokeWeight: 6 },
  { name: 'Shockwave', category: 'technology', patterns: [/shockwave/i, /\.dcr\b/i], matchType: 'embed', nostalgiaWeight: 10, smokeWeight: 4 },
  { name: 'Silverlight', category: 'technology', patterns: [/silverlight/i], matchType: 'embed', nostalgiaWeight: 10, smokeWeight: 4 },
  { name: 'Java Applet', category: 'technology', patterns: [/<applet\b/i, /java\s*applet/i], matchType: 'embed', nostalgiaWeight: 10, smokeWeight: 4 },
  { name: 'Internet Explorer', category: 'technology', patterns: [/internet\s*explorer\s*[6-8]/i, /\bie[6-8]\b/i], matchType: 'mention', nostalgiaWeight: 6, smokeWeight: 3 },

  // ── Services (dead) ──
  { name: 'Google Reader', category: 'service', patterns: [/google\.com\/reader/i, /google\s*reader/i], matchType: 'mention', nostalgiaWeight: 6, smokeWeight: 3 },
  { name: 'StumbleUpon', category: 'service', patterns: [/stumbleupon\.com/i, /\bstumble\s*upon\b/i], matchType: 'mention', nostalgiaWeight: 5, smokeWeight: 2 },

  // ── Operating systems (era-specific) ──
  { name: 'Windows XP', category: 'os', patterns: [/windows\s*xp/i, /win\s*xp/i, /winxp\b/i], matchType: 'mention', nostalgiaWeight: 5, smokeWeight: 2 },
  { name: 'Windows 7', category: 'os', patterns: [/windows\s*7\b/i, /win\s*7\b/i, /win7\b/i], matchType: 'mention', nostalgiaWeight: 3, smokeWeight: 1 },
];

// ── Safe text extraction ────────────────────────────────────────────────────

function getText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('#text' in obj) return String(obj['#text'] ?? '').trim();
    if ('#cdata' in obj) return String(obj['#cdata'] ?? '').trim();
  }
  return String(value).trim();
}

// ── Content extraction helper ──────────────────────────────────────────────

function extractContent(contentEl: unknown): string {
  if (!contentEl) return '';
  if (typeof contentEl === 'string') return contentEl;
  if (typeof contentEl === 'object') {
    const obj = contentEl as Record<string, unknown>;
    if ('#text' in obj) return String(obj['#text'] ?? '');
    if ('#cdata' in obj) return String(obj['#cdata'] ?? '');
  }
  return String(contentEl || '');
}

// ── Helper: get a value trying multiple keys ───────────────────────────────

function getFromKeys(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in obj && obj[key] !== undefined) return obj[key];
  }
  return undefined;
}

// ── Pre-process XML to normalize namespaces ────────────────────────────────

function preprocessXml(xml: string): string {
  let cleaned = xml;

  // Remove XML processing instructions that might confuse the parser
  cleaned = cleaned.replace(/<\?xml-stylesheet[^?]*\?>/g, '');

  // Remove xmlns declarations — fast-xml-parser doesn't need them
  // and they can cause namespace resolution issues.
  // Handle both single quotes (xmlns='...') and double quotes (xmlns="...")
  cleaned = cleaned.replace(/\s+xmlns(?::[a-zA-Z0-9_-]+)?=(?:"[^"]*"|'[^']*')/g, '');

  return cleaned;
}

// ── Parse with strategy A: namespace prefixes preserved ───────────────────

function parseStrategyA(xml: string): { feed: Record<string, unknown>; strategy: string } {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (_tagName: string, jpath: string) => {
      return ['entry', 'link', 'category', 'author'].some(t => jpath.endsWith(t));
    },
    textPropName: '#text',
    cdataPropName: '#cdata',
    processEntities: true,
    htmlEntities: true,
    preserveOrder: false,
    trimValues: true,
  });

  const parsed = parser.parse(xml);
  return { feed: parsed.feed as Record<string, unknown>, strategy: 'A (ns preserved)' };
}

// ── Parse with strategy B: namespace prefixes removed ─────────────────────

function parseStrategyB(xml: string): { feed: Record<string, unknown>; strategy: string } {
  const parser = new XMLParser({
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
    preserveOrder: false,
    trimValues: true,
  });

  const parsed = parser.parse(xml);
  return { feed: parsed.feed as Record<string, unknown>, strategy: 'B (ns removed)' };
}

// ── Determine which parse strategy worked ─────────────────────────────────

function detectStrategy(feed: Record<string, unknown>, entries: unknown[]): string {
  if (entries.length === 0) return 'no-entries';

  const firstEntry = entries[0] as Record<string, unknown>;
  const keys = Object.keys(firstEntry);

  // If we find blogger:type or type (from removed ns), this strategy works
  if (keys.some(k => k.includes('blogger:type') || k.includes('blogger_status') || k === 'type')) {
    return keys.some(k => k.includes(':')) ? 'A (ns preserved)' : 'B (ns removed)';
  }

  // If we find standard Atom fields like id, title, content
  if (keys.includes('id') && (keys.includes('title') || keys.includes('content'))) {
    return 'basic-atom';
  }

  return 'unknown';
}

// ── Main Parser ────────────────────────────────────────────────────────────

export function parseAtomXml(xmlString: string): ParseResult {
  // Pre-process the XML to strip namespace declarations
  const preprocessed = preprocessXml(xmlString);

  // Try both strategies
  const resultA = parseStrategyA(preprocessed);
  const resultB = parseStrategyB(preprocessed);

  // Determine which entries array to use
  const entriesA: unknown[] = Array.isArray(resultA.feed.entry)
    ? resultA.feed.entry
    : resultA.feed.entry ? [resultA.feed.entry] : [];

  const entriesB: unknown[] = Array.isArray(resultB.feed.entry)
    ? resultB.feed.entry
    : resultB.feed.entry ? [resultB.feed.entry] : [];

  // Pick the strategy that gives us the most usable data
  let feed: Record<string, unknown>;
  let feedEntries: unknown[];
  let parseStrategy: string;

  if (entriesA.length > 0) {
    const stratA = detectStrategy(resultA.feed, entriesA);
    if (stratA === 'A (ns preserved)') {
      feed = resultA.feed;
      feedEntries = entriesA;
      parseStrategy = stratA;
    } else if (entriesB.length > 0) {
      const stratB = detectStrategy(resultB.feed, entriesB);
      if (stratB === 'B (ns removed)') {
        feed = resultB.feed;
        feedEntries = entriesB;
        parseStrategy = stratB;
      } else {
        // Both failed to detect blogger fields — use A as it preserves more info
        feed = resultA.feed;
        feedEntries = entriesA;
        parseStrategy = `fallback-A (${stratA}/${stratB})`;
      }
    } else {
      feed = resultA.feed;
      feedEntries = entriesA;
      parseStrategy = `only-A (${stratA})`;
    }
  } else if (entriesB.length > 0) {
    feed = resultB.feed;
    feedEntries = entriesB;
    parseStrategy = 'only-B';
  } else {
    throw new Error('No se encontraron entries en el archivo. ¿Es un export de Blogger válido?');
  }

  if (!feed) {
    throw new Error('No se encontró un elemento <feed> válido en el archivo.');
  }

  // ── Extract blog-level info ──
  const blogTitle = getText(feed.title);

  // Extract blog URL from feed's alternate link
  const feedLinks: unknown[] = Array.isArray(feed.link) ? feed.link : [];
  let blogUrl: string | null = null;
  for (const l of feedLinks) {
    const link = l as Record<string, unknown>;
    const rel = String(link['@_rel'] || '');
    const type = String(link['@_type'] || '');
    const href = String(link['@_href'] || '');
    if (rel === 'alternate' && (type.includes('html') || href.includes('blogspot') || href.includes('http'))) {
      if (href && !href.startsWith('self')) {
        blogUrl = href;
        break;
      }
    }
  }

  // If no alternate link found, try to find any http(s) link
  if (!blogUrl) {
    for (const l of feedLinks) {
      const link = l as Record<string, unknown>;
      const href = String(link['@_href'] || '');
      if (href.startsWith('http') && !href.includes('schemas.google')) {
        blogUrl = href;
        break;
      }
    }
  }

  // ── Validate/correct blogUrl from entry-level links ──
  // The feed-level blogUrl can be wrong (e.g. cocoluchi.blogspot.com when the
  // actual posts are on dosminutosmas.blogspot.com). Cross-check against the
  // first few POST entries that have their own <link rel="alternate">.
  if (blogUrl) {
    let correctedDomain: string | null = null;
    for (const rawEntry of feedEntries.slice(0, 20)) {
      const e = rawEntry as Record<string, unknown>;
      const eType = String(getFromKeys(e, ['blogger:type', 'type']) ?? '').toUpperCase();
      if (eType !== 'POST') continue;
      const eLinks: unknown[] = Array.isArray(e.link) ? e.link : [];
      for (const l of eLinks) {
        const link = l as Record<string, unknown>;
        const rel = String(link['@_rel'] || '');
        const href = String(link['@_href'] || '');
        if (rel === 'alternate' && href && href.startsWith('http') && href.includes('blogspot.com')) {
          try {
            const entryDomain = new URL(href).hostname;
            if (correctedDomain && correctedDomain !== entryDomain) {
              // Conflicting domains — entries disagree, keep feed-level
              correctedDomain = null;
              break;
            }
            correctedDomain = entryDomain;
          } catch { /* skip malformed URLs */ }
          break;
        }
      }
      if (correctedDomain === null) break; // conflict detected, stop
    }
    // If a consistent entry-level domain was found and differs from feed, correct it
    if (correctedDomain) {
      try {
        const feedDomain = new URL(blogUrl).hostname;
        if (feedDomain !== correctedDomain) {
          blogUrl = `https://${correctedDomain}/`;
        }
      } catch { /* keep original blogUrl */ }
    }
  }

  // If still no blogUrl, try to extract it from post content
  // Look for blogspot.com URLs in the first few POST entries
  if (!blogUrl) {
 for (const rawEntry of feedEntries.slice(0, 20)) {
      const e = rawEntry as Record<string, unknown>;
      const eType = String(getFromKeys(e, ['blogger:type', 'type']) ?? '').toUpperCase();
      if (eType !== 'POST') continue;
      const eContent = extractContent(e.content);
      // Look for a blogspot.com URL in the content
      const match = eContent.match(/https?:\/\/([a-z0-9-]+)\.blogspot\.com\//i);
      if (match) {
        blogUrl = `http://${match[1]}.blogspot.com/`;
        break;
      }
    }
  }

  // Extract blog author from feed-level author
  let blogAuthor = '';
  const feedAuthor = Array.isArray(feed.author) ? feed.author[0] : feed.author;
  if (feedAuthor && typeof feedAuthor === 'object') {
    const fa = feedAuthor as Record<string, unknown>;
    blogAuthor = getText(fa.name) || getText(fa.email) || '';
  }

  // ── Debug info from first entry ──
  const firstEntry = feedEntries[0] as Record<string, unknown> | undefined;
  const debugInfo = {
    parseStrategy,
    firstEntryKeys: firstEntry ? Object.keys(firstEntry) : [],
    sampleTitle: firstEntry ? getText(firstEntry.title) || '(empty)' : '(no entries)',
    sampleBloggerType: firstEntry ? String(
      getFromKeys(firstEntry, ['blogger:type', 'type']) ?? '(not found)'
    ) : '(no entries)',
    sampleBloggerStatus: firstEntry ? String(
      getFromKeys(firstEntry, ['blogger:status', 'status']) ?? '(not found)'
    ) : '(no entries)',
    sampleFilename: firstEntry ? String(
      getFromKeys(firstEntry, ['blogger:filename', 'filename']) ?? '(not found)'
    ) : '(no entries)',
  };

  // ── Process entries ──
  const entries: ParsedEntry[] = [];
  const skippedCounts: Record<string, number> = {};

  for (const rawEntry of feedEntries) {
    const e = rawEntry as Record<string, unknown>;

    // Get entry ID
    const entryId = getText(e.id);
    if (!entryId) {
      skippedCounts['NO_ID'] = (skippedCounts['NO_ID'] || 0) + 1;
      continue;
    }

    // ── Determine entry type ──
    // Blogger 2018 format uses <blogger:type>POST|PAGE|COMMENT|SETTINGS|TEMPLATE</blogger:type>
    // With removeNSPrefix, this becomes just <type>
    const rawBloggerType = String(
      getFromKeys(e, ['blogger:type', 'type']) ?? ''
    ).toUpperCase().trim();

    // Blogger status for draft detection
    const rawBloggerStatus = String(
      getFromKeys(e, ['blogger:status', 'status']) ?? ''
    ).toUpperCase().trim();

    // ── Skip trashed entries ──
    const trashedVal = getFromKeys(e, ['blogger:trashed', 'trashed']);
    if (trashedVal !== undefined && trashedVal !== '') {
      skippedCounts['TRASHED'] = (skippedCounts['TRASHED'] || 0) + 1;
      continue;
    }

    // ── Skip non-content types ──
    if (['SETTINGS', 'TEMPLATE', 'LAYOUT', 'CONFIG'].includes(rawBloggerType)) {
      skippedCounts[rawBloggerType] = (skippedCounts[rawBloggerType] || 0) + 1;
      continue;
    }

    // ── Draft detection ──
    // Blogger 2018: <blogger:status>DRAFT</blogger:status>
    // Old format: <app:control><app:draft>yes</app:draft></app:control>
    let isDraft = rawBloggerStatus === 'DRAFT';

    if (!isDraft) {
      const appControl = e['app:control'];
      if (appControl && typeof appControl === 'object') {
        const ctrl = appControl as Record<string, unknown>;
        const draftVal = getText(ctrl['app:draft']);
        isDraft = draftVal === 'yes' || draftVal === 'true';
      }
    }

    // ── Determine final entry type ──
    let entryType: ParsedEntry['entryType'] | null = null;

    if (rawBloggerType === 'COMMENT') {
      entryType = 'COMMENT';
    } else if (rawBloggerType === 'POST') {
      entryType = isDraft ? 'DRAFT' : 'POST';
    } else if (rawBloggerType === 'PAGE') {
      entryType = isDraft ? 'DRAFT' : 'PAGE';
    } else if (rawBloggerType === 'DRAFT') {
      entryType = 'DRAFT';
    } else {
      // Fallback: try to infer type from the entry structure
      const hasContent = !!extractContent(e.content);
      const hasTitle = !!getText(e.title);
      const isComment = entryId.includes('.comment-') || !!getFromKeys(e, ['blogger:parent', 'parent', 'thr:in-reply-to']);

      if (isComment) {
        entryType = 'COMMENT';
      } else if (hasContent || hasTitle) {
        entryType = isDraft ? 'DRAFT' : 'POST';
      } else {
        skippedCounts['OTHER'] = (skippedCounts['OTHER'] || 0) + 1;
        continue;
      }
    }

    // ── Extract fields ──

    // Title — try multiple approaches
    const title = getText(e.title);

    // Content — extract from <content> or <summary>
    const content = extractContent(e.content) || extractContent(e.summary);

    // Dates
    const publishedAt = getText(e.published) ||
      getText(getFromKeys(e, ['blogger:created', 'created'])) || null;
    const atomUpdated = getText(e.updated) || null;

    // Author
    let authorName: string | null = null;
    const entryAuthors: unknown[] = Array.isArray(e.author) ? e.author : e.author ? [e.author] : [];
    if (entryAuthors.length > 0 && typeof entryAuthors[0] === 'object') {
      const authObj = entryAuthors[0] as Record<string, unknown>;
      authorName = getText(authObj.name) || getText(authObj.email) || null;
    }
    if (!authorName) authorName = blogAuthor || null;

    // Labels / Categories
    const rawCategories: unknown[] = Array.isArray(e.category) ? e.category : [];
    const labels = rawCategories
      .map((c: Record<string, unknown>) => {
        // Blogger uses @_term for the label value
        // The scheme might be tag:blogger.com,1999:blog-XXX or http://www.blogger.com/atom/ns#
        // We want ALL categories that have a @_term
        return c['@_term'];
      })
      .filter((t): t is string => !!t && typeof t === 'string' && t.trim().length > 0);

    // Original URL
    let originalUrl: string | null = null;

    // Method 1: From <link rel="alternate"> elements
    const entryLinks: unknown[] = Array.isArray(e.link) ? e.link : [];
    for (const l of entryLinks) {
      const link = l as Record<string, unknown>;
      const rel = String(link['@_rel'] || '');
      const href = String(link['@_href'] || '');
      if (rel === 'alternate' && href && href.startsWith('http')) {
        originalUrl = href;
        break;
      }
    }

    // Method 2: Construct from blogger:filename + blogUrl
    if (!originalUrl) {
      const filename = getText(getFromKeys(e, ['blogger:filename', 'filename']));
      if (filename && blogUrl) {
        // filename is like "/2009/08/meme-cual-fue-tu-ultimo-meme.html"
        const base = blogUrl.replace(/\/+$/, '');
        originalUrl = base + (filename.startsWith('/') ? '' : '/') + filename;
      } else if (filename) {
        originalUrl = filename;
      }
    }

    // Method 3: Extract from the entry ID (tag:blogger.com,1999:blog-XXX.post-YYYY)
    if (!originalUrl && blogUrl) {
      const postMatch = entryId.match(/post-(\d+)$/);
      if (postMatch) {
        // We know it's a post but can't reconstruct the URL without filename
        originalUrl = null;
      }
    }

    // Comment parent ID
    let parentId: string | null = null;
    if (entryType === 'COMMENT') {
      const parentRef = getText(getFromKeys(e, ['blogger:parent', 'parent']));
      if (parentRef) {
        parentId = parentRef;
      } else {
        // Old format: <thr:in-reply-to ref="..." href="..."/>
        const thrInReply = getFromKeys(e, ['thr:in-reply-to']);
        if (thrInReply) {
          if (typeof thrInReply === 'string') {
            parentId = thrInReply;
          } else if (typeof thrInReply === 'object') {
            const replyObj = thrInReply as Record<string, unknown>;
            parentId = String(replyObj['@_ref'] || replyObj['@_href'] || replyObj['#text'] || '');
          }
        }
      }
    }

    // Comment count (best effort — may not be available in new format)
    let commentCount = 0;
    const thrTotal = getText(getFromKeys(e, ['thr:total']));
    if (thrTotal) {
      commentCount = parseInt(thrTotal, 10) || 0;
    }

    entries.push({
      entryId,
      entryType,
      title,
      content,
      publishedAt,
      atomUpdated,
      author: authorName,
      labels,
      originalUrl,
      commentCount,
      parentId,
    });
  }

  const skippedTypes = Object.entries(skippedCounts).map(([type, count]) => ({ type, count }));

  return { blogTitle, blogAuthor, blogUrl, entries, skippedTypes, debugInfo };
}

// ── Issue Detector ─────────────────────────────────────────────────────────

export interface Issue {
  type: 'dead_image_host' | 'flash_embed' | 'empty_content' | 'short_content' | 'no_title';
  message: string;
  count?: number;
}

export function detectIssues(content: string, title: string, entryType?: string): Issue[] {
  const issues: Issue[] = [];
  const isComment = entryType === 'COMMENT';

  // Dead image hosts
  for (const host of DEAD_IMAGE_HOSTS) {
    const regex = new RegExp(host.replace('.', '\\.'), 'gi');
    const matches = content.match(regex);
    if (matches && matches.length > 0) {
      issues.push({
        type: 'dead_image_host',
        message: `Imágenes de servidor obsoleto: ${host}`,
        count: matches.length,
      });
    }
  }

  // Flash embeds
  const flashObject = (content.match(/<object[^>]*>/gi) || []).length;
  const flashEmbed = (content.match(/<embed[^>]*\.swf[^>]*>/gi) || []).length;
  const flashTotal = flashObject + flashEmbed;
  if (flashTotal > 0) {
    issues.push({
      type: 'flash_embed',
      message: `Contenido Flash/SWF obsoleto`,
      count: flashTotal,
    });
  }

  // Empty content
  const strippedContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
  if (strippedContent.length < 10 && content.length > 0) {
    issues.push({
      type: 'empty_content',
      message: 'Contenido vacío o mínimo',
    });
  }

  // Very short content
  if (strippedContent.length > 10 && strippedContent.length < 50) {
    issues.push({
      type: 'short_content',
      message: 'Contenido muy corto (posiblemente un post de prueba)',
    });
  }

  // No title — only for posts and pages, NOT comments (comments rarely have titles)
  if (!isComment && (!title || title.trim().length === 0) && content.length > 50) {
    issues.push({
      type: 'no_title',
      message: 'Sin título',
    });
  }

  // NOTE: Removed blogger_internal_link detector — blogspot.com links in post
  // content are NORMAL for a Blogger migration and should not be flagged as issues.

  return issues;
}

// ── Platform Detector ─────────────────────────────────────────────────────

/**
 * Scans HTML content for references to extinct/dead internet platforms.
 * Each platform is counted at most once per entry.
 */
export function detectPlatforms(content: string): PlatformMatch[] {
  const matches: PlatformMatch[] = [];
  const seen = new Set<string>();

  for (const def of PLATFORM_DEFS) {
    if (seen.has(def.name)) continue;
    for (const pattern of def.patterns) {
      if (pattern.test(content)) {
        seen.add(def.name);
        matches.push({
          name: def.name,
          category: def.category,
          matchType: def.matchType,
          nostalgiaWeight: def.nostalgiaWeight,
          smokeWeight: def.smokeWeight,
        });
        break;
      }
    }
  }

  return matches;
}

// ── Nostalgia Score Calculator ────────────────────────────────────────────

/**
 * Calculates a 0-100 nostalgia score based on:
 *   - Date: 2009 → 30%, 2010 → 25%, 2011 → 20%, 2012 → 15%, 2013+ → 10%
 *   - Platforms: the remaining percentage, scaled by detected dead platforms.
 *
 *   A 2009 post with Flash + Megavideo + MSN + WinXP ≈ 70%
 *   A 2012 post with no dead platforms ≈ 15%
 */
export function calculateNostalgiaScore(publishedAt: string | null, platforms: PlatformMatch[]): number {
  // Date component — max 30% for oldest posts (2009), min 5% for recent
  let dateScore = 5;
  if (publishedAt) {
    const year = new Date(publishedAt).getFullYear();
    if (year <= 2009) dateScore = 30;
    else if (year === 2010) dateScore = 25;
    else if (year === 2011) dateScore = 20;
    else if (year === 2012) dateScore = 15;
    else if (year <= 2014) dateScore = 10;
    else dateScore = 5;
  }

  // Platform component — fills the remaining percentage
  // Normalization factor: 50 total weight = full platform score
  const NORMALIZATION_FACTOR = 50;
  const rawWeight = platforms.reduce((sum, p) => sum + p.nostalgiaWeight, 0);
  const maxPlatformScore = 100 - dateScore;
  const normalizedPlatform = Math.min(maxPlatformScore, Math.round((rawWeight / NORMALIZATION_FACTOR) * maxPlatformScore));

  return Math.min(100, dateScore + normalizedPlatform);
}

// ── Smoke Index Calculator ────────────────────────────────────────────────

/**
 * Calculates a 0-100 baseline smoke index (the user adjusts the final value).
 * Based on detected dead platforms + content issues.
 *   0-20  → Leve
 *   21-40 → Moderado
 *   41-60 → Moderado-Alto
 *   61-80 → Alto
 *   81-100 → Humo Total
 */
export function calculateSmokeIndex(platforms: PlatformMatch[], issues: Issue[]): number {
  let smoke = 0;

  // Platform-based smoke
  smoke += platforms.reduce((sum, p) => sum + p.smokeWeight, 0);

  // Issue-based bonus (only issues not already captured by platform detection)
  for (const issue of issues) {
    switch (issue.type) {
      case 'no_title': smoke += 3; break;
      case 'empty_content': smoke += 8; break;
      case 'short_content': smoke += 3; break;
    }
  }

  return Math.min(100, smoke);
}

export function getSmokeLevel(index: number): string {
  if (index <= 20) return 'Leve';
  if (index <= 40) return 'Moderado';
  if (index <= 60) return 'Moderado-Alto';
  if (index <= 80) return 'Alto';
  return 'Humo Total';
}

// ── Content Cleaner ────────────────────────────────────────────────────────

export function cleanContent(content: string): string {
  let cleaned = content;

  // Remove images from dead hosts
  for (const host of DEAD_IMAGE_HOSTS) {
    const escaped = host.replace('.', '\\.');
    const imgRegex = new RegExp(`<img[^>]*src=["'][^"']*${escaped}[^"']*["'][^>]*>`, 'gi');
    cleaned = cleaned.replace(imgRegex, '<!-- Imagen eliminada: servidor obsoleto -->');

    // Remove anchor links wrapping dead host images
    const linkRegex = new RegExp(`<a[^>]*href=["'][^"']*${escaped}[^"']*["'][^>]*>([\\s\\S]*?)<\\/a>`, 'gi');
    cleaned = cleaned.replace(linkRegex, '$1');
  }

  // Remove Flash objects
  cleaned = cleaned.replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '<!-- Objeto Flash eliminado -->');
  cleaned = cleaned.replace(/<embed[^>]*src=["'][^"']*\.swf[^"']*["'][^>]*>/gi, '<!-- Embed Flash eliminado -->');

  return cleaned;
}

// ── Slug Generator ─────────────────────────────────────────────────────────

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 120);
}
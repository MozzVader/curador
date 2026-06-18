import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

// ── Export to JSON (for Supabase) ───────────────────────────────────────────

export interface ExportEntryJson {
  title: string;
  slug: string;
  content: string;
  labels: string[];
  created_at: string;
  author: string | null;
  original_url: string | null;
}

export function exportToJson(
  entries: { title: string; content: string; publishedAt: string | null; author: string | null; originalUrl: string | null; labels: string }[]
): string {
  const data: ExportEntryJson[] = entries.map(e => ({
    title: e.title,
    slug: generateSlug(e.title),
    content: e.content,
    labels: JSON.parse(e.labels || '[]') as string[],
    created_at: e.publishedAt || new Date().toISOString(),
    author: e.author,
    original_url: e.originalUrl,
  }));

  return JSON.stringify(data, null, 2);
}

// ── Export to Markdown ──────────────────────────────────────────────────────

export function exportToMarkdown(
  entries: { title: string; content: string; publishedAt: string | null; author: string | null; originalUrl: string | null; labels: string }[]
): string {
  return entries
    .map(e => {
      const labels = (JSON.parse(e.labels || '[]') as string[]).join(', ');
      const meta = [
        e.publishedAt ? `**Fecha:** ${formatDate(e.publishedAt)}` : '',
        e.author ? `**Autor:** ${e.author}` : '',
        labels ? `**Etiquetas:** ${labels}` : '',
        e.originalUrl ? `**Original:** ${e.originalUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const mdContent = turndown.turndown(e.content);

      return `# ${e.title}\n\n${meta ? meta + '\n\n' : ''}${mdContent}\n\n---\n`;
    })
    .join('\n');
}

// ── Export to HTML (visual review page) ─────────────────────────────────────

export function exportToHtml(
  entries: { title: string; content: string; publishedAt: string | null; author: string | null; originalUrl: string | null; labels: string; status: string }[]
): string {
  const entriesHtml = entries
    .map((e, i) => {
      const labels = (JSON.parse(e.labels || '[]') as string[])
        .map(l => `<span style="background:#f0f0f0;padding:2px 8px;border-radius:4px;font-size:12px;color:#555">${l}</span>`)
        .join(' ');

      const statusColors: Record<string, string> = {
        approved: '#16a34a',
        pending: '#d97706',
        discarded: '#dc2626',
        needs_editing: '#2563eb',
      };
      const statusColor = statusColors[e.status] || '#888';

      return `
        <article id="post-${i}" style="border:1px solid #e5e5e5;border-radius:8px;padding:24px;margin-bottom:20px;background:#fff">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
            <span style="color:${statusColor};font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.5px">${e.status}</span>
            ${labels ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${labels}</div>` : ''}
          </div>
          <h2 style="font-size:1.4rem;font-weight:700;margin-bottom:8px;color:#111">${e.title}</h2>
          <div style="color:#666;font-size:13px;margin-bottom:16px">
            ${e.publishedAt ? formatDate(e.publishedAt) : 'Sin fecha'}
            ${e.author ? ` · ${e.author}` : ''}
          </div>
          <div style="line-height:1.7;color:#333">${e.content}</div>
          ${e.originalUrl ? `<div style="margin-top:12px;font-size:12px"><a href="${e.originalUrl}" style="color:#888">Ver original en Blogger</a></div>` : ''}
        </article>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Curador — Exportación de Posts</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 780px; margin: 0 auto; padding: 40px 20px; background: #fafafa; color: #111; }
    h1 { font-size: 2rem; margin-bottom: 4px; }
    .subtitle { color: #666; margin-bottom: 32px; }
    .summary { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px; display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
    .summary-item { text-align: center; }
    .summary-item .num { font-size: 1.8rem; font-weight: 700; color: #333; }
    .summary-item .label { font-size: 0.8rem; color: #888; margin-top: 2px; }
    img { max-width: 100%; height: auto; }
    a { color: inherit; }
  </style>
</head>
<body>
  <h1>Curador — Posts Exportados</h1>
  <p class="subtitle">Generado el ${new Date().toLocaleDateString('es-AR')} — ${entries.length} entradas</p>
  <div class="summary">
    <div class="summary-item"><div class="num">${entries.length}</div><div class="label">Total</div></div>
    <div class="summary-item"><div class="num">${entries.filter(e => e.status === 'approved').length}</div><div class="label">Aprobados</div></div>
    <div class="summary-item"><div class="num">${entries.filter(e => e.status === 'pending').length}</div><div class="label">Pendientes</div></div>
    <div class="summary-item"><div class="num">${entries.filter(e => e.status === 'discarded').length}</div><div class="label">Descartados</div></div>
  </div>
  ${entriesHtml}
</body>
</html>`;
}

// ── Export to Museum HTML (with plaques) ───────────────────────────────────

export interface MuseumEntry {
  id?: string;
  title: string;
  content: string;
  publishedAt: string | null;
  author: string | null;
  originalUrl: string | null;
  labels: string;
  status: string;
  platforms: string;
  nostalgiaScore: number;
  smokeIndex: number;
  issues: string;
  wordCount: number;
}

function getSmokeLevel(index: number): string {
  if (index <= 20) return 'Leve';
  if (index <= 40) return 'Moderado';
  if (index <= 60) return 'Moderado-Alto';
  if (index <= 80) return 'Alto';
  return 'Humo Total';
}

function buildChangelog(issues: string): string {
  try {
    const parsed = JSON.parse(issues) as { type: string; message: string; count?: number }[];
    if (!parsed.length) return '';
    const lines: string[] = [];
    for (const issue of parsed) {
      const n = issue.count || 1;
      switch (issue.type) {
        case 'dead_image_host':
          lines.push(`<div class="changelog-line c-fix">[FIX] ${n} imagen${n > 1 ? 'es' : ''} re-hosteadas en Supabase Storage</div>`);
          break;
        case 'flash_embed':
          lines.push(`<div class="changelog-line c-convert">[CONVERT] ${n} archivo${n > 1 ? 's' : ''} .swf reemplazado${n > 1 ? 's' : ''} por emulador Ruffle</div>`);
          break;
        case 'empty_content':
          lines.push(`<div class="changelog-line c-remove">[REMOVE] Contenido vacio o minimo</div>`);
          break;
        case 'short_content':
          lines.push(`<div class="changelog-line c-remove">[REMOVE] Contenido muy corto (posible post de prueba)</div>`);
          break;
        case 'no_title':
          lines.push(`<div class="changelog-line c-fix">[FIX] Titulo restaurado manualmente</div>`);
          break;
      }
    }
    return lines.join('\n        ');
  } catch {
    return '';
  }
}

/**
 * Generates ONLY the museum card snippet — no post content.
 * Uses exact class names for Astro CSS to handle styling.
 * Ready to paste into Quill / any rich editor.
 */
export function generateMuseumCardHtml(entry: MuseumEntry): string {
  const platforms: string[] = JSON.parse(entry.platforms || '[]');
  const nostalgia = entry.nostalgiaScore || 0;
  const smoke = entry.smokeIndex || 0;
  const smokeLevel = getSmokeLevel(smoke);
  const changelog = buildChangelog(entry.issues);
  const formattedDate = entry.publishedAt
    ? new Date(entry.publishedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Fecha desconocida';

  // ── Smart platform tags ──────────────────────────────────
  // Always show at least one tag for consistency.
  // Priority: detected platforms > content-based fallback.
  let platformTags: string;
  if (platforms.length > 0) {
    // Lowercase for tag display
    const displayNames = platforms.map(p => {
      const lower = p.toLowerCase();
      // Keep specific recognized names, lowercase for tag
      return lower;
    });
    platformTags = displayNames.map(p => `<span class="platform-tag">${p}</span>`).join('\n                    ');
  } else {
    // Fallback: infer from content
    const fallbackTags: string[] = [];
    const rawContent = entry.content || '';

    // Detect YouTube
    if (/youtube\.com|youtu\.be/i.test(rawContent)) {
      fallbackTags.push('youtube');
    }
    // Detect images (Blogger imageanchor or any img tag)
    if (/<img[^>]+src=/i.test(rawContent) || /<a[^>]+imageanchor/i.test(rawContent)) {
      fallbackTags.push('imagenes');
    }
    // Extract the first "real" external link (not image hosting) as a tag
    const EXCLUDED_DOMAINS = /blogger\.googleusercontent\.com|googleusercontent\.com|bp\.blogspot\.com|[01]\.bp\.blogspot\.com|picasaweb\.google\.com|ggpht\.com|lh[0-9]+\.(googleusercontent|ggpht|blogspot)\.com/i;
    const hrefRegex = /href="(https?:\/\/([^"\s]+))"/gi;
    let hrefMatch: RegExpExecArray | null;
    while ((hrefMatch = hrefRegex.exec(rawContent)) !== null) {
      const fullUrl = hrefMatch[1];
      const domain = hrefMatch[2].replace(/^www\./, '').split('/')[0];
      if (!EXCLUDED_DOMAINS.test(fullUrl) && domain.length > 0 && domain.length < 40) {
        // Use a clean short name: domain without TLD for brevity, or full domain if short
        const parts = domain.split('.');
        const tag = parts.length >= 2 ? parts[parts.length - 2] : domain;
        if (!fallbackTags.includes(tag) && !fallbackTags.includes(domain)) {
          fallbackTags.push(domain);
        }
        break; // only first real link
      }
    }
    // Ultimate fallback
    if (!fallbackTags.length) {
      fallbackTags.push('web');
    }
    platformTags = fallbackTags.map(t => `<span class="platform-tag">${t}</span>`).join('\n                    ');
  }

  // ── Curation changelog — always present for consistency ──
  const changelogBlock = changelog
    ? `
    <div class="curation-changelog">
        <div class="changelog-header"><i class="material-icons" style="font-size:14px">terminal</i> ARCHIVE_RESTORATION_LOG</div>
        ${changelog}
    </div>`
    : `
    <div class="curation-changelog">
        <div class="changelog-header"><i class="material-icons" style="font-size:14px">terminal</i> ARCHIVE_RESTORATION_LOG</div>
        <div class="changelog-line c-chore">[CHORE] Revision de contenido</div>
    </div>`;

  const badgeInner = '<i class="material-icons" style="font-size:14px">history</i> Post Rescatado';
  const badgeHtml = entry.originalUrl
    ? `<a class="badge" href="${entry.originalUrl}" target="_blank" rel="noopener noreferrer">${badgeInner}</a>`
    : `<div class="badge">${badgeInner}</div>`;

  return `<div class="museum-card" style="--percent: ${nostalgia}%; --humo: ${smoke}%;">
    <div class="museum-card-header">
        ${badgeHtml}
        <div class="original-date">Publicado originalmente: <strong>${formattedDate}</strong></div>
    </div>
    <div class="museum-card-body">
        <div class="metric-nostalgia-col">
            <div class="metric-title">Nivel de Nostalgia</div>
            <div class="metric-nostalgia">
                <div class="chart-container-mini">
                    <div class="circular-chart-mini">
                        <div class="inner-circle-mini">
                            <span class="percentage-mini">${nostalgia}%</span>
                        </div>
                    </div>
                </div>
                <div class="platforms-grid">
                    ${platformTags}
                </div>
            </div>
        </div>
        <div class="metric-smoke-col">
            <div class="metric-title">Índice Fúmico</div>
            <div class="metric-smoke">
                <span class="smoke-fire">🔥</span>
                <div class="smoke-details">
                    <div class="smoke-gauge">
                        <div class="smoke-bar-fill"></div>
                    </div>
                    <div class="smoke-meta">Nivel: <strong>${smokeLevel}</strong></div>
                </div>
            </div>
        </div>
    </div>${changelogBlock}
</div>`;
}

/**
 * Export all entries as a standalone HTML file with museum plaques.
 * Each entry shows: museum card snippet (copy-ready) + post content below.
 */
export function exportToMuseumHtml(entries: MuseumEntry[]): string {
  const entriesHtml = entries.map((e, i) => {
    const card = generateMuseumCardHtml(e);
    const labels: string[] = JSON.parse(e.labels || '[]');
    const labelBadges = labels.length > 0
      ? ` <span style="color:#888;font-size:12px">[${labels.join(', ')}]</span>`
      : '';
    const entryId = e.id || `entry-${i}`;
    return `
  <section id="${entryId}" class="entry-section" style="margin-bottom:48px;${e.status === 'discarded' ? 'opacity:0.4' : ''}">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
      <input type="checkbox" class="pub-toggle" data-id="${entryId}" style="width:18px;height:18px;cursor:pointer;accent-color:#16a34a;flex-shrink:0" />
      <h2 style="font-size:1.2rem;font-weight:700;margin:0;color:#111;flex:1">${e.title}${labelBadges}</h2>
    </div>
    <div style="margin-bottom:12px;font-size:13px;color:#666;padding-left:30px">
      ${e.publishedAt ? formatDate(e.publishedAt) : 'Sin fecha'}
      ${e.author ? ` · ${e.author}` : ''}
      · ${e.wordCount.toLocaleString('es-AR')} palabras
      ${e.status === 'discarded' ? ' · <span style="color:#dc2626;font-weight:600">DESCARTADO</span>' : ''}
    </div>

    <!-- Museum Card Snippet (copy this into Quill) -->
    <div style="margin-bottom:16px;padding:12px;background:#f8f9fa;border:1px dashed #ccc;border-radius:6px;font-size:11px;color:#888;margin-left:30px">Museum Card Snippet ↓</div>
    <div style="margin-left:30px">${card}</div>
    <div style="margin-bottom:20px"></div>

    <!-- Post Content -->
    <div style="line-height:1.7;color:#333;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding-left:30px">
      ${e.content}
    </div>
    ${e.originalUrl ? `<div style="margin-top:8px;font-size:12px;padding-left:30px"><a href="${e.originalUrl}" style="color:#888">Ver original en Blogger</a></div>` : ''}
  </section>`;
  }).join('\n');

  const highNostalgia = entries.filter(e => e.nostalgiaScore >= 50).length;
  const withSmoke = entries.filter(e => e.smokeIndex >= 40).length;
  const withPlatforms = entries.filter(e => JSON.parse(e.platforms || '[]').length > 0).length;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Curador — Museo de Posts Rescatados</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 780px; margin: 0 auto; padding: 40px 20px; background: #fafafa; color: #111; }
    h1 { font-size: 2rem; margin-bottom: 4px; }
    .subtitle { color: #666; margin-bottom: 32px; }
    .summary { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px; display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; }
    .summary-item { text-align: center; }
    .summary-item .num { font-size: 1.8rem; font-weight: 700; color: #333; }
    .summary-item .label { font-size: 0.8rem; color: #888; margin-top: 2px; }
    .summary-item .num.pub-count { color: #16a34a; }
    img { max-width: 100%; height: auto; }
    a { color: inherit; }
    .entry-section.published { border-left: 3px solid #16a34a; padding-left: 12px; }
    .entry-section.published h2 { color: #16a34a; }
    .toolbar { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #e5e5e5; padding: 12px 0; margin-bottom: 20px; z-index: 10; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .toolbar .progress-bar { flex: 1; min-width: 200px; height: 8px; background: #e5e5e5; border-radius: 4px; overflow: hidden; }
    .toolbar .progress-fill { height: 100%; background: #16a34a; border-radius: 4px; transition: width 0.3s ease; width: 0%; }
    .toolbar .progress-text { font-size: 13px; font-weight: 600; color: #16a34a; white-space: nowrap; }
  </style>
</head>
<body>
  <h1>&#127963; Museo de Posts Rescatados</h1>
  <p class="subtitle">Generado el ${new Date().toLocaleDateString('es-AR')} — ${entries.length} entradas</p>

  <div class="toolbar">
    <span class="progress-text" id="pubText">0 / ${entries.length} publicados</span>
    <div class="progress-bar"><div class="progress-fill" id="pubFill"></div></div>
    <button onclick="toggleAll(true)" style="padding:4px 12px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:12px">Marcar todos</button>
    <button onclick="toggleAll(false)" style="padding:4px 12px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:12px">Desmarcar todos</button>
  </div>

  <div class="summary">
    <div class="summary-item"><div class="num" id="countTotal">${entries.length}</div><div class="label">Total</div></div>
    <div class="summary-item"><div class="num pub-count" id="countPub">0</div><div class="label">Publicados</div></div>
    <div class="summary-item"><div class="num">${highNostalgia}</div><div class="label">Alta nostalgia</div></div>
    <div class="summary-item"><div class="num">${withSmoke}</div><div class="label">Con humo</div></div>
    <div class="summary-item"><div class="num">${withPlatforms}</div><div class="label">Con plataformas</div></div>
  </div>
  ${entriesHtml}

  <script>
    var total = ${entries.length};
    function updateCounts() {
      var checked = document.querySelectorAll('.pub-toggle:checked').length;
      document.getElementById('pubText').textContent = checked + ' / ' + total + ' publicados';
      document.getElementById('pubFill').style.width = (checked / total * 100) + '%';
      document.getElementById('countPub').textContent = checked;
      document.querySelectorAll('.pub-toggle').forEach(function(cb) {
        var section = document.getElementById(cb.dataset.id);
        if (section) section.classList.toggle('published', cb.checked);
      });
    }
    document.querySelectorAll('.pub-toggle').forEach(function(cb) {
      cb.addEventListener('change', updateCounts);
    });
    function toggleAll(val) {
      document.querySelectorAll('.pub-toggle').forEach(function(cb) { cb.checked = val; });
      updateCounts();
    }
  </script>
</body>
</html>`;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateSlug(title: string): string {
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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}
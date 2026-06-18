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
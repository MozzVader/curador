'use client';

import React, { useEffect, useCallback } from 'react';
import { useAppStore, type FullEntry, type EntryListItem } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import {
  Upload,
  FileText,
  FileImage,
  FilePenLine,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Edit3,
  Download,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  X,
  Archive,
  FileJson,
  FileDown,
  Globe,
  RotateCcw,
  ExternalLink,
  Tag,
  RefreshCw,
  Code2,
  Eye,
  ImageIcon,
  Zap,
  Sun,
  Moon,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Copy,
} from 'lucide-react';

// ── Config ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  POST: { label: 'Post', icon: <FileText className="h-3.5 w-3.5" />, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
  PAGE: { label: 'Página', icon: <FileImage className="h-3.5 w-3.5" />, color: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300' },
  DRAFT: { label: 'Borrador', icon: <FilePenLine className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
  COMMENT: { label: 'Comentario', icon: <MessageSquare className="h-3.5 w-3.5" />, color: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300' },
};

const STATUS_CONFIG: Record<string, { label: string; dotClass: string }> = {
  pending: { label: 'Pendiente', dotClass: 'bg-amber-500' },
  approved: { label: 'Aprobado', dotClass: 'bg-emerald-500' },
  discarded: { label: 'Descartado', dotClass: 'bg-red-500' },
  needs_editing: { label: 'Necesita edición', dotClass: 'bg-blue-500' },
};

const ISSUE_CONFIG: Record<string, { icon: React.ReactNode; color: string; shortLabel: string }> = {
  dead_image_host: { icon: <ImageIcon className="h-3 w-3" />, color: 'text-red-500', shortLabel: 'Img rota' },
  flash_embed: { icon: <Zap className="h-3 w-3" />, color: 'text-orange-500', shortLabel: 'Flash' },
  empty_content: { icon: <AlertTriangle className="h-3 w-3" />, color: 'text-amber-500', shortLabel: 'Vacío' },
  short_content: { icon: <AlertTriangle className="h-3 w-3" />, color: 'text-yellow-500', shortLabel: 'Corto' },
  no_title: { icon: <AlertTriangle className="h-3 w-3" />, color: 'text-amber-500', shortLabel: 'Sin título' },
};

const formatShortDate = (iso: string | null) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
};

const formatLongDate = (iso: string | null) => {
  if (!iso) return 'Sin fecha';
  try { return new Date(iso).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
};

// ── Status Dot ─────────────────────────────────────────────────────────────

function StatusDot({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <Select value={status} onValueChange={onChange}>
      <SelectTrigger
        className="h-7 w-7 p-0 border-0 shadow-none hover:opacity-80 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full h-full flex items-center justify-center">
          <div className={`w-3 h-3 rounded-full ${cfg.dotClass} cursor-pointer`} title={cfg.label} />
        </div>
      </SelectTrigger>
      <SelectContent align="start">
        {Object.entries(STATUS_CONFIG).map(([key, c]) => (
          <SelectItem key={key} value={key} className="text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${c.dotClass}`} />
              {c.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Theme Toggle ───────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title="Cambiar tema"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}

// ── Upload View ────────────────────────────────────────────────────────────

function UploadView() {
  const { setView, setUploadResult, setLoading, isLoading } = useAppStore();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.atom') && !file.name.endsWith('.xml')) {
      toast({ title: 'Formato inválido', description: 'Solo .atom o .xml', variant: 'destructive' });
      return;
    }
    setFileName(file.name);
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar');
      setUploadResult(data);
      toast({ title: 'Importación exitosa', description: `${data.storedCount} entradas de "${data.blogTitle}"` });
      setView('dashboard');
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error desconocido', variant: 'destructive' });
    } finally {
      setLoading(false);
      setFileName(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) processFile(e.dataTransfer.files[0]);
  }, []);

  const pickFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.atom,.xml';
    input.onchange = (ev) => {
      const f = (ev.target as HTMLInputElement).files?.[0];
      if (f) processFile(f);
    };
    input.click();
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="max-w-lg w-full mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-amber-500">Curador</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-md mx-auto">
            Subí tu backup .atom de Blogger, revisá cada post, y exportá solo lo que vale la pena.
          </p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={pickFile}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
            ${isDragging ? 'border-amber-500 bg-amber-500/5' : 'border-muted-foreground/25 hover:border-amber-500/50 hover:bg-muted/30'}
            ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
              <p className="text-sm text-muted-foreground">Analizando {fileName}...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">
                Arrastrá tu <span className="text-amber-500 font-semibold">.atom</span> acá
              </p>
              <p className="text-xs text-muted-foreground">o click para seleccionar</p>
            </div>
          )}
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 border-t py-3 bg-background/95 backdrop-blur">
        <div className="text-center text-xs text-muted-foreground">Curador — Migración desde Blogger</div>
      </footer>
    </div>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────────────────

function StatsBar() {
  const { stats } = useAppStore();
  if (!stats) return null;

  const breakdown = stats.issueBreakdown;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      {[
        { label: 'Posts', value: stats.posts },
        { label: 'Páginas', value: stats.pages },
        { label: 'Borradores', value: stats.drafts },
        { label: 'Aprobados', value: stats.approved },
        { label: 'Pendientes', value: stats.pending },
        { label: 'Descartados', value: stats.discarded },
      ].map((item) => (
        <div key={item.label} className="rounded-lg p-2.5 text-center bg-muted/30 border border-border/50">
          <div className="text-lg font-bold">{item.value.toLocaleString('es-AR')}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{item.label}</div>
        </div>
      ))}

      {/* Issues card — with breakdown tooltip */}
      {stats.withIssues > 0 && breakdown && (
        <div
          className="rounded-lg p-2.5 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 col-span-2 sm:col-span-1"
          title={`Imágenes rotas: ${breakdown.deadImages}\nFlash: ${breakdown.flashEmbeds}\nSin título: ${breakdown.noTitle}\nVacíos/cortos: ${breakdown.emptyOrShort}`}
        >
          <div className="text-lg font-bold text-red-600 dark:text-red-400">{stats.withIssues}</div>
          <div className="text-[10px] text-red-600/70 dark:text-red-400/70 mt-0.5">Con issues</div>
          <div className="text-[9px] text-muted-foreground mt-1 leading-tight">
            {breakdown.deadImages > 0 && <div>🔴 {breakdown.deadImages} img rotas</div>}
            {breakdown.flashEmbeds > 0 && <div>🟠 {breakdown.flashEmbeds} flash</div>}
            {breakdown.noTitle > 0 && <div>🟡 {breakdown.noTitle} sin título</div>}
            {breakdown.emptyOrShort > 0 && <div>🟡 {breakdown.emptyOrShort} vacíos/cortos</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Filter Bar ─────────────────────────────────────────────────────────────

function FilterBar() {
  const { filters, setFilter, stats } = useAppStore();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          className="pl-9 h-9 text-sm"
        />
        {filters.search && (
          <button onClick={() => setFilter('search', '')} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      <Select value={filters.type || '_all'} onValueChange={(v) => setFilter('type', v === '_all' ? '' : v)}>
        <SelectTrigger className="w-[120px] h-9 text-sm">
          <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos</SelectItem>
          <SelectItem value="POST">Posts</SelectItem>
          <SelectItem value="PAGE">Páginas</SelectItem>
          <SelectItem value="DRAFT">Borradores</SelectItem>
          <SelectItem value="COMMENT">Comentarios</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status || '_all'} onValueChange={(v) => setFilter('status', v === '_all' ? '' : v)}>
        <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos</SelectItem>
          <SelectItem value="pending">Pendiente</SelectItem>
          <SelectItem value="approved">Aprobado</SelectItem>
          <SelectItem value="discarded">Descartado</SelectItem>
          <SelectItem value="needs_editing">Necesita edición</SelectItem>
        </SelectContent>
      </Select>

      {stats && stats.labels.length > 0 && (
        <Select value={filters.label || '_all'} onValueChange={(v) => setFilter('label', v === '_all' ? '' : v)}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <Tag className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Etiqueta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas</SelectItem>
            {stats.labels.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
          </SelectContent>
        </Select>
      )}

      <button
        onClick={() => setFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
        className="flex items-center gap-1 h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-muted/50"
        title="Orden"
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        {filters.sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {(filters.type || filters.status || filters.label || filters.search) && (
        <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => {
          setFilter('type', ''); setFilter('status', ''); setFilter('label', ''); setFilter('search', '');
        }}>
          <X className="h-3 w-3 mr-1" /> Limpiar
        </Button>
      )}
    </div>
  );
}

// ── Entry Row ──────────────────────────────────────────────────────────────

function EntryRow({ entry, onPreview, onStatusChange }: {
  entry: EntryListItem;
  onPreview: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const typeCfg = TYPE_CONFIG[entry.entryType] || TYPE_CONFIG.POST;
  const labels: string[] = JSON.parse(entry.labels || '[]');
  const issues: { type: string; message: string; count?: number }[] = JSON.parse(entry.issues || '[]');
  const platforms: string[] = JSON.parse(entry.platforms || '[]');
  const hasMuseoData = entry.nostalgiaScore > 0 || entry.smokeIndex > 0 || platforms.length > 0;

  return (
    <div
      className="group flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-border/50
        hover:border-amber-500/30 hover:bg-muted/20 cursor-pointer transition-colors
        data-row"
      onClick={onPreview}
    >
      <div className="pt-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <StatusDot status={entry.status} onChange={(s) => onStatusChange(entry.id, s)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${typeCfg.color}`}>
            {typeCfg.icon} {typeCfg.label}
          </span>
          <span className="text-sm font-medium truncate">{entry.title}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
          <span>{formatShortDate(entry.publishedAt)}</span>
          {entry.author && <span>{entry.author}</span>}
          <span>{entry.wordCount.toLocaleString('es-AR')} pal.</span>
          {hasMuseoData && (
            <span className="text-amber-500 font-medium" title={`Nostalgia: ${entry.nostalgiaScore}% | Humo: ${entry.smokeIndex}%`}>
              {entry.nostalgiaScore > 0 && `${entry.nostalgiaScore}%`} 
              {entry.nostalgiaScore > 0 && entry.smokeIndex > 0 && '/'} 
              {entry.smokeIndex > 0 && `${entry.smokeIndex}%`} 
              {platforms.length > 0 && ` · ${platforms.length} pl.`}
            </span>
          )}
        </div>
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {labels.slice(0, 3).map((l) => (
              <span key={l} className="px-1.5 py-px rounded bg-muted text-[9px] text-muted-foreground">{l}</span>
            ))}
            {labels.length > 3 && <span className="text-[9px] text-muted-foreground">+{labels.length - 3}</span>}
          </div>
        )}
      </div>

      {/* Issue badges */}
      {issues.length > 0 && (
        <div className="flex-shrink-0 flex flex-col items-end gap-0.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
          {issues.slice(0, 3).map((issue, i) => {
            const ic = ISSUE_CONFIG[issue.type];
            return (
              <div key={i} className="flex items-center gap-1" title={issue.message}>
                <span className={ic?.color || 'text-amber-500'}>{ic?.icon || <AlertTriangle className="h-3 w-3" />}</span>
                {issue.count && issue.count > 1 && <span className="text-[9px] font-medium text-muted-foreground">{issue.count}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Entry List (with proper pagination) ────────────────────────────────────

function EntryList() {
  const { filters, setFilter, isLoading, refreshTrigger } = useAppStore();
  const [entries, setEntries] = React.useState<EntryListItem[]>([]);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const f = useAppStore.getState().filters;
      const params = new URLSearchParams();
      if (f.type) params.set('type', f.type);
      if (f.status) params.set('status', f.status);
      if (f.label) params.set('label', f.label);
      if (f.search) params.set('search', f.search);
      params.set('sortBy', f.sortBy);
      params.set('sortOrder', f.sortOrder);
      params.set('page', String(f.page));
      params.set('limit', '50');
      try {
        const res = await fetch(`/api/entries?${params}`);
        const data = await res.json();
        if (!cancelled) {
          setEntries(data.entries || []);
          setTotalPages(data.pagination?.totalPages || 1);
          setTotal(data.pagination?.total || 0);
        }
      } catch {
        if (!cancelled) toast({ title: 'Error al cargar', variant: 'destructive' });
      }
    };
    load();
    return () => { cancelled = true; };
  }, [filters.type, filters.status, filters.label, filters.search, filters.sortBy, filters.sortOrder, filters.page, refreshTrigger, toast]);

  const refreshEntries = () => {
    const f = useAppStore.getState().filters;
    const params = new URLSearchParams();
    if (f.type) params.set('type', f.type);
    if (f.status) params.set('status', f.status);
    if (f.label) params.set('label', f.label);
    if (f.search) params.set('search', f.search);
    params.set('sortBy', f.sortBy);
    params.set('sortOrder', f.sortOrder);
    params.set('page', String(f.page));
    params.set('limit', '50');
    fetch(`/api/entries?${params}`)
      .then(r => r.json())
      .then(data => {
        setEntries(data.entries || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      })
      .catch(() => {});
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch(`/api/entries/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      refreshEntries();
      fetch('/api/stats').then(r => r.json()).then(d => useAppStore.getState().setStats(d)).catch(() => {});
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handlePreview = async (id: string) => {
    useAppStore.getState().setSelectedId(id);
    useAppStore.getState().setPreviewOpen(true);
    try {
      const res = await fetch(`/api/entries/${id}`);
      const data = await res.json();
      useAppStore.getState().setSelectedEntry(data);
    } catch {
      toast({ title: 'Error al cargar', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="space-y-2 p-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 320px)', minHeight: '300px' }}>
      {/* Header */}
      <div className="px-3 py-2 text-[11px] text-muted-foreground border-b bg-card flex items-center justify-between flex-shrink-0">
        <span>{total.toLocaleString('es-AR')} resultados</span>
        {totalPages > 1 && <span>Pág. {filters.page} de {totalPages}</span>}
      </div>

      {/* Scrollable entries — this is the ONLY thing that scrolls */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-1.5 space-y-0.5">
          {entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Sin resultados
            </div>
          ) : (
            entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onPreview={() => handlePreview(entry.id)}
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </div>
      </div>

      {/* Pagination — fixed at bottom, never scrolls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-2.5 px-3 border-t bg-card flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={filters.page <= 1}
            onClick={() => setFilter('page', 1)}
          >
            <ChevronLeft className="h-4 w-4" /><ChevronLeft className="h-4 w-4 -ml-2" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={filters.page <= 1}
            onClick={() => setFilter('page', filters.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground px-1 tabular-nums min-w-[70px] text-center font-medium">
            {filters.page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={filters.page >= totalPages}
            onClick={() => setFilter('page', filters.page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={filters.page >= totalPages}
            onClick={() => setFilter('page', totalPages)}
          >
            <ChevronRight className="h-4 w-4" /><ChevronRight className="h-4 w-4 -ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Preview Modal ──────────────────────────────────────────────────────────

function PreviewPanel() {
  const { selectedEntry, isPreviewOpen, setPreviewOpen, setSelectedEntry, publishedEntries } = useAppStore();
  const { toast } = useToast();
  const [showSource, setShowSource] = React.useState(false);
  const [showMuseum, setShowMuseum] = React.useState(false);
  const [museumHtml, setMuseumHtml] = React.useState('');
  const [museumLoading, setMuseumLoading] = React.useState(false);

  if (!selectedEntry) return null;

  const entry = selectedEntry as unknown as FullEntry;
  const typeCfg = TYPE_CONFIG[entry.entryType] || TYPE_CONFIG.POST;
  const labels: string[] = JSON.parse(entry.labels || '[]');
  const issues: { type: string; message: string; count?: number }[] = JSON.parse(entry.issues || '[]');
  const platforms: string[] = JSON.parse(entry.platforms || '[]');
  // Fallback platform tags for display consistency (same logic as exporter)
  const displayPlatforms = platforms.length > 0
    ? platforms.map(p => p.toLowerCase())
    : (() => {
        const fb: string[] = [];
        const c = entry.content || '';
        if (/youtube\.com|youtu\.be/i.test(c)) fb.push('youtube');
        if (/<img[^>]+src=/i.test(c) || /<a[^>]+imageanchor/i.test(c)) fb.push('imagenes');
        if (!fb.length) fb.push('web');
        return fb;
      })();
  const nostalgia = entry.nostalgiaScore || 0;
  const smoke = entry.smokeIndex || 0;
  const isPublished = publishedEntries.includes(entry.id);

  const handleStatusChange = async (status: string) => {
    try {
      await fetch(`/api/entries/${entry.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      setSelectedEntry({ ...entry, status });
      useAppStore.getState().bumpRefresh();
      fetch('/api/stats').then(r => r.json()).then(d => useAppStore.getState().setStats(d)).catch(() => {});
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const loadMuseumCard = async () => {
    if (showMuseum) { setShowMuseum(false); return; }
    setMuseumLoading(true);
    try {
      const res = await fetch(`/api/museum-card/${entry.id}`);
      const data = await res.json();
      if (data.html) {
        setMuseumHtml(data.html);
        setShowMuseum(true);
      }
    } catch {
      toast({ title: 'Error al generar Museum Card', variant: 'destructive' });
    } finally {
      setMuseumLoading(false);
    }
  };

  const copyMuseumHtml = async () => {
    try {
      await navigator.clipboard.writeText(museumHtml);
      toast({ title: 'HTML copiado al portapapeles' });
    } catch {
      toast({ title: 'Error al copiar', variant: 'destructive' });
    }
  };

  const handleClose = () => {
    setPreviewOpen(false);
    setSelectedEntry(null);
    setShowSource(false);
    setShowMuseum(false);
    setMuseumHtml('');
  };

  const smokeLevel = smoke <= 20 ? 'Leve' : smoke <= 40 ? 'Moderado' : smoke <= 60 ? 'Moderado-Alto' : smoke <= 80 ? 'Alto' : 'Humo Total';
  const smokeColor = smoke >= 80 ? 'bg-red-500' : smoke >= 60 ? 'bg-orange-500' : smoke >= 40 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <Dialog open={isPreviewOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent
        key={entry.id}
        /* Grid layout: row 1 = header (auto), row 2 = content (1fr), row 3 = footer (auto)
           With Grid, 1fr resolves to the remaining space even when the container has only max-height.
           This is the key difference from Flexbox where flex:1 + min-h:0 often fails to activate overflow. */
        className="w-[95vw] max-w-7xl sm:max-w-7xl max-h-[92vh] overflow-hidden grid-rows-[auto_1fr_auto] p-0 gap-0"
      >
        {/* ── Row 1: Header (auto-sized) ── */}
        <div className="overflow-hidden">
          <div className="p-5 pb-3 space-y-2.5">
            <DialogHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${typeCfg.color}`}>
                  {typeCfg.icon} {typeCfg.label}
                </span>
                {labels.map(l => (
                  <Badge key={l} variant="secondary" className="text-[10px] px-1.5 py-0">{l}</Badge>
                ))}
              </div>
              <DialogTitle className="text-lg font-semibold leading-tight pr-10">{entry.title}</DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
              <span>{formatLongDate(entry.publishedAt)}</span>
              {entry.author && <span>· {entry.author}</span>}
              <span>· {entry.wordCount.toLocaleString('es-AR')} palabras</span>
              {entry.originalUrl && (
                <a href={entry.originalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-amber-500 hover:underline">
                  <ExternalLink className="h-3 w-3" /> Original
                </a>
              )}
            </div>

            {issues.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {issues.map((issue, i) => {
                  const ic = ISSUE_CONFIG[issue.type];
                  return (
                    <div key={i} className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 text-[11px] text-red-700 dark:text-red-300">
                      <span className={ic?.color || 'text-amber-500'}>{ic?.icon || <AlertTriangle className="h-3 w-3" />}</span>
                      {issue.message}
                      {issue.count && issue.count > 1 && <span className="font-bold">×{issue.count}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Museum Metrics */}
            {(nostalgia > 0 || smoke > 0 || displayPlatforms.length > 0) && (
              <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-violet-50 to-amber-50 dark:from-violet-950/20 dark:to-amber-950/20 border border-violet-200/40 dark:border-violet-800/30">
                {/* Nostalgia Score */}
                {nostalgia > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="relative w-10 h-10 flex-shrink-0" title={`Nostalgia: ${nostalgia}%`}>
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted-foreground/20" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={`${nostalgia} ${100 - nostalgia}`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-amber-600">{nostalgia}</span>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Nostalgia</div>
                      <div className="text-xs font-semibold text-amber-600">{nostalgia}%</div>
                    </div>
                  </div>
                )}

                {/* Smoke Index */}
                {smoke > 0 && (
                  <div className="flex items-center gap-2 min-w-[120px]" title={`Indice Fumico: ${smoke}% — ${smokeLevel}`}>
                    <span className="text-lg">{smoke >= 80 ? '🔥' : '💨'}</span>
                    <div className="flex-1">
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Indice Fumico</div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${smokeColor}`} style={{ width: `${Math.min(100, smoke)}%` }} />
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">{smoke}% — {smokeLevel}</div>
                    </div>
                  </div>
                )}

                {/* Platform Tags */}
                <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                  {displayPlatforms.map(p => (
                    <span key={p} className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-[9px] font-medium truncate max-w-[100px]" title={p}>{p}</span>
                  ))}
                </div>

                {/* Published indicator */}
                {isPublished && (
                  <span className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1" title="Exportado como Museum Card">
                    <Landmark className="h-3 w-3" /> Exportado
                  </span>
                )}
              </div>
            )}
          </div>
          <Separator />
        </div>

        {/* ── Row 2: Content (1fr — gets remaining space, scrollable) ── */}
        <div
          /* min-h-0 is critical: without it the grid item won't shrink below content height
             and overflow-y won't activate */
          className="min-h-0 overflow-y-auto relative"
        >
          {/* Toggle buttons — absolute so they don't affect layout */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
            {entry.entryType !== 'COMMENT' && (
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-[11px] gap-1.5 shadow-md border-border/50"
                onClick={loadMuseumCard}
                disabled={museumLoading}
              >
                {museumLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Landmark className="h-3 w-3" />}
                {showMuseum ? 'Contenido' : 'Museum Card'}
              </Button>
            )}
            {!showMuseum && (
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-[11px] gap-1.5 shadow-md border-border/50"
                onClick={() => setShowSource(s => !s)}
              >
                {showSource ? <><Eye className="h-3 w-3" /> Preview</> : <><Code2 className="h-3 w-3" /> HTML</>}
              </Button>
            )}
          </div>

          {showMuseum ? (
            <div className="p-5 pt-12">
              {museumLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 text-amber-500 animate-spin" />
                </div>
              ) : museumHtml ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-muted-foreground">Snippet listo para pegar en Quill</div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-[11px] gap-1.5"
                      onClick={copyMuseumHtml}
                    >
                      <Copy className="h-3 w-3" /> Copiar HTML
                    </Button>
                  </div>
                  <pre className="p-3 text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all leading-relaxed bg-muted/20 rounded-lg border border-border/50 max-h-[calc(100vh-320px)] overflow-y-auto">
{museumHtml}</pre>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No se pudo generar la Museum Card
                </div>
              )}
            </div>
          ) : showSource ? (
            <pre className="p-5 pt-10 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-all leading-relaxed">
              {entry.content}
            </pre>
          ) : (
            <div
              className="p-5 pt-10 prose prose-sm dark:prose-invert max-w-none
                prose-img:max-w-full prose-img:h-auto
                prose-a:text-amber-500 hover:prose-a:text-amber-400
                prose-headings:font-semibold"
              style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: entry.content }}
            />
          )}
        </div>

        {/* ── Row 3: Footer (auto-sized) ── */}
        <div className="overflow-hidden">
          <Separator />
          <div className="p-3 px-5 flex items-center gap-3 bg-card">
            <span className="text-[11px] text-muted-foreground">Estado:</span>
            <Select value={entry.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 w-44 text-xs gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${STATUS_CONFIG[entry.status]?.dotClass || ''}`} />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([key, c]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${c.dotClass}`} />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Export Buttons ─────────────────────────────────────────────────────────

const EXPORT_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'approved+needs_editing', label: 'Aprobados + Edición' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'needs_editing', label: 'Necesitan Edición' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'discarded', label: 'Descartados' },
] as const;

function ExportButtons() {
  const { toast } = useToast();
  const [exportStatus, setExportStatus] = React.useState('all');

  const doExport = async (format: string) => {
    try {
      const params = new URLSearchParams({ format, status: exportStatus });
      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Error');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const ext = format === 'museum-html' ? 'museum.html' : format === 'markdown' ? 'md' : format;
      a.download = `curador-export.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
      const statusLabel = EXPORT_STATUS_OPTIONS.find(o => o.value === exportStatus)?.label || exportStatus;
      toast({ title: `${statusLabel} exportados` });

      // Track museum exports
      if (format === 'museum-html') {
        try {
          const listRes = await fetch(`/api/entries?status=${exportStatus}&limit=1000`);
          const listData = await listRes.json();
          const ids = (listData.entries || []).map((e: { id: string }) => e.id);
          if (ids.length > 0) useAppStore.getState().markPublished(ids);
        } catch { /* best effort */ }
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Select value={exportStatus} onValueChange={setExportStatus}>
        <SelectTrigger className="h-8 text-[11px] gap-1.5 w-[120px]">
          <Download className="h-3.5 w-3.5" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EXPORT_STATUS_OPTIONS.map(o => (
            <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select onValueChange={(v) => doExport(v)}>
        <SelectTrigger className="h-8 text-[11px] gap-1.5">
          <SelectValue placeholder="Formato" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="json"><span className="flex items-center gap-2"><FileJson className="h-3.5 w-3.5" /> JSON</span></SelectItem>
          <SelectItem value="markdown"><span className="flex items-center gap-2"><FileDown className="h-3.5 w-3.5" /> Markdown</span></SelectItem>
          <SelectItem value="html"><span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> HTML</span></SelectItem>
          <SelectItem value="museum-html"><span className="flex items-center gap-2"><Landmark className="h-3.5 w-3.5 text-violet-500" /> Museo HTML</span></SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────

function DashboardView() {
  const { stats, setStats, resetAll, uploadResult, filters } = useAppStore();
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
      if (data.total === 0) resetAll();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  }, [setStats, resetAll, toast]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleBulkAction = async (action: string) => {
    try {
      let body: Record<string, unknown>;
      if (action === 'DISCARD_COMMENTS') {
        body = { ids: 'DISCARD_ALL_COMMENTS', status: 'discarded' };
      } else {
        // Apply to current filter, defaulting to non-comments if no filter
        body = {
          ids: 'ALL_FILTERED',
          status: action,
          filter: {
            type: filters.type || undefined,
            status: filters.status || undefined,
            label: filters.label || undefined,
            search: filters.search || undefined,
          },
        };
      }
      const res = await fetch('/api/entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      toast({ title: `${data.updated} entradas actualizadas` });
      fetchStats();
      useAppStore.getState().bumpRefresh();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleReset = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
      resetAll();
      toast({ title: 'Datos eliminados' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const currentFilterLabel = filters.type
    ? (TYPE_CONFIG[filters.type]?.label || filters.type).toLowerCase() + 's'
    : 'posts y páginas';

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-md flex-shrink-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold"><span className="text-amber-500">Curador</span></h1>
            {uploadResult && (
              <span className="hidden sm:inline text-xs text-muted-foreground border-l border-border pl-3">
                {uploadResult.blogTitle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <ExportButtons />

            {/* Bulk actions */}
            <Select onValueChange={handleBulkAction}>
              <SelectTrigger className="h-8 text-[11px] gap-1.5 w-auto">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <SelectValue placeholder="Bulk..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Aprobar {currentFilterLabel}</SelectItem>
                <SelectItem value="pending">Pendiente {currentFilterLabel}</SelectItem>
                <SelectItem value="discarded">Descartar {currentFilterLabel}</SelectItem>
              </SelectContent>
            </Select>

            {/* Discard all comments */}
            {stats && stats.comments > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-[11px] gap-1 text-red-500 hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" />
                    Descartar {stats.comments.toLocaleString('es-AR')} comentarios
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Descartar todos los comentarios</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se van a marcar {stats.comments.toLocaleString('es-AR')} comentarios como descartados.
                      Los posts no se ven afectados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleBulkAction('DISCARD_COMMENTS')} className="bg-red-600 text-white hover:bg-red-700">
                      Sí, descartar todos
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-[11px] gap-1 text-destructive hover:text-destructive">
                  <RotateCcw className="h-3.5 w-3.5" /> Nueva importación
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Nueva importación</AlertDialogTitle>
                  <AlertDialogDescription>Se eliminan todos los datos. No se puede deshacer.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset} className="bg-destructive text-white hover:bg-destructive/90">
                    Eliminar todo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">
          <StatsBar />
          <FilterBar />
          <EntryList />
        </div>
      </main>

      {/* Footer — fixed at bottom */}
      <footer className="border-t py-2 bg-card/80 backdrop-blur-md flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Curador — Migración desde Blogger</span>
          {stats && <span>{stats.totalWords.toLocaleString('es-AR')} palabras en posts</span>}
        </div>
      </footer>

      <PreviewPanel />
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function Home() {
  const { view } = useAppStore();

  useEffect(() => {
    if (view === 'upload') {
      fetch('/api/stats')
        .then(r => r.json())
        .then(data => {
          if (data.total > 0) {
            useAppStore.getState().setStats(data);
            useAppStore.getState().setView('dashboard');
          }
        })
        .catch(() => {});
    }
  }, [view]);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {view === 'upload' ? <UploadView /> : <DashboardView />}
      </main>
    </div>
  );
}
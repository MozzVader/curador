'use client';

import React, { useEffect, useCallback } from 'react';
import { useAppStore, type FullEntry, type EntryListItem } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';

// ── Config ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  POST: { label: 'Post', icon: <FileText className="h-3.5 w-3.5" />, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  PAGE: { label: 'Página', icon: <FileImage className="h-3.5 w-3.5" />, color: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
  DRAFT: { label: 'Borrador', icon: <FilePenLine className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  COMMENT: { label: 'Comentario', icon: <MessageSquare className="h-3.5 w-3.5" />, color: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; dotClass: string }> = {
  pending: { label: 'Pendiente', icon: <Clock className="h-3.5 w-3.5" />, dotClass: 'bg-amber-500' },
  approved: { label: 'Aprobado', icon: <CheckCircle2 className="h-3.5 w-3.5" />, dotClass: 'bg-emerald-500' },
  discarded: { label: 'Descartado', icon: <XCircle className="h-3.5 w-3.5" />, dotClass: 'bg-red-500' },
  needs_editing: { label: 'Necesita edición', icon: <Edit3 className="h-3.5 w-3.5" />, dotClass: 'bg-blue-500' },
};

const formatShortDate = (iso: string | null) => {
  if (!iso) return 'Sin fecha';
  try { return new Date(iso).toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
};

const formatLongDate = (iso: string | null) => {
  if (!iso) return 'Sin fecha';
  try { return new Date(iso).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
};

// ── Upload View ────────────────────────────────────────────────────────────

function UploadView() {
  const { setView, setUploadResult, setLoading, isLoading } = useAppStore();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [debugResult, setDebugResult] = React.useState<Record<string, unknown> | null>(null);
  const [showDebug, setShowDebug] = React.useState(false);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.atom') && !file.name.endsWith('.xml')) {
      toast({ title: 'Formato inválido', description: 'Solo se aceptan archivos .atom o .xml', variant: 'destructive' });
      return;
    }
    setFileName(file.name);
    setLoading(true);
    setDebugResult(null);
    setShowDebug(false);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar el archivo');
      setUploadResult(data);
      toast({ title: 'Importación exitosa', description: `${data.storedCount} entradas procesadas de "${data.blogTitle}"` });
      setView('dashboard');
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error desconocido', variant: 'destructive' });
    } finally {
      setLoading(false);
      setFileName(null);
    }
  };

  const processDebugFile = async (file: File) => {
    if (!file.name.endsWith('.atom') && !file.name.endsWith('.xml')) {
      toast({ title: 'Formato inválido', description: 'Solo se aceptan archivos .atom o .xml', variant: 'destructive' });
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/debug-parse', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al analizar');
      setDebugResult(data);
      setShowDebug(true);
      toast({ title: 'Análisis de debug completado' });
    } catch (err) {
      toast({ title: 'Error en debug', description: err instanceof Error ? err.message : 'Error desconocido', variant: 'destructive' });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) processFile(e.dataTransfer.files[0]);
  }, []);

  const pickFile = (onSelect: (f: File) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.atom,.xml';
    input.onchange = (ev) => {
      const f = (ev.target as HTMLInputElement).files?.[0];
      if (f) onSelect(f);
    };
    input.click();
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="max-w-lg w-full mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-amber-600">Curador</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-md mx-auto">
            Herramienta de curaduría para migrar tu blog desde Blogger.
            Subí tu archivo de backup .atom, revisá cada post, y exportá solo lo que vale la pena.
          </p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => pickFile(processFile)}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
            ${isDragging ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : 'border-muted-foreground/25 hover:border-amber-400 hover:bg-muted/50'}
            ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
              <p className="text-sm text-muted-foreground">Analizando {fileName}...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Arrastrá tu archivo <span className="text-amber-600 font-semibold">.atom</span> o <span className="text-amber-600 font-semibold">.xml</span> aquí
                </p>
                <p className="text-xs text-muted-foreground mt-1">o hacé click para seleccionarlo</p>
              </div>
            </div>
          )}
        </div>

        {/* Debug button */}
        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              pickFile(processDebugFile);
            }}
          >
            <Search className="h-3 w-3 mr-1" />
            Diagnosticar estructura del XML (sin importar)
          </Button>
        </div>

        {/* Debug output */}
        {showDebug && debugResult && (
          <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-xs font-mono max-h-80 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-amber-600">Resultado del diagnóstico</span>
              <button onClick={() => setShowDebug(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <pre className="whitespace-pre-wrap break-all text-[11px] leading-relaxed">
              {JSON.stringify(debugResult, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Posts</span>
          <span className="flex items-center gap-1"><FilePenLine className="h-3.5 w-3.5" /> Borradores</span>
          <span className="flex items-center gap-1"><FileImage className="h-3.5 w-3.5" /> Páginas</span>
          <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Comentarios</span>
        </div>
      </div>
    </div>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────────────────

function StatsBar() {
  const { stats, uploadResult } = useAppStore();
  if (!stats) return null;

  const items = [
    { label: 'Total', value: stats.total, highlight: false },
    { label: 'Posts', value: stats.posts, highlight: false },
    { label: 'Páginas', value: stats.pages, highlight: false },
    { label: 'Borradores', value: stats.drafts, highlight: false },
    { label: 'Con problemas', value: stats.withIssues, highlight: true },
    { label: 'Aprobados', value: stats.approved, highlight: false },
    { label: 'Pendientes', value: stats.pending, highlight: false },
    { label: 'Descartados', value: stats.discarded, highlight: false },
  ];

  return (
    <div className="space-y-3">
      {uploadResult && (
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <Archive className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="font-medium">{uploadResult.blogTitle}</span>
          {uploadResult.blogAuthor && <span className="text-muted-foreground">· {uploadResult.blogAuthor}</span>}
          {uploadResult.skippedTypes.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              Se omitieron: {uploadResult.skippedTypes.map(s => `${s.type} (${s.count})`).join(', ')}
            </span>
          )}
        </div>
      )}
      {uploadResult?.debugInfo && (
        <div className="text-[10px] text-muted-foreground/70 font-mono bg-muted/30 rounded px-2 py-1">
          Parser: {uploadResult.debugInfo.parseStrategy} ·
          Primer entry keys: [{uploadResult.debugInfo.firstEntryKeys.slice(0, 8).join(', ')}] ·
          Título: &quot;{uploadResult.debugInfo.sampleTitle}&quot; ·
          Tipo: {uploadResult.debugInfo.sampleBloggerType} ·
          Status: {uploadResult.debugInfo.sampleBloggerStatus} ·
          Filename: {uploadResult.debugInfo.sampleFilename}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {items.map((item) => (
          <div key={item.label} className={`rounded-lg p-3 text-center ${item.highlight ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800' : 'bg-muted/50'}`}>
            <div className={`text-xl font-bold ${item.highlight ? 'text-amber-600' : ''}`}>{item.value.toLocaleString('es-AR')}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Filter Bar ─────────────────────────────────────────────────────────────

function FilterBar() {
  const { filters, setFilter, stats } = useAppStore();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por título o contenido..." value={filters.search} onChange={(e) => setFilter('search', e.target.value)} className="pl-9 h-9 text-sm" />
        {filters.search && (
          <button onClick={() => setFilter('search', '')} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      <Select value={filters.type || 'all_types'} onValueChange={(v) => setFilter('type', v === 'all_types' ? '' : v)}>
        <SelectTrigger className="w-[130px] h-9 text-sm">
          <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all_types">Todos</SelectItem>
          <SelectItem value="POST">Posts</SelectItem>
          <SelectItem value="PAGE">Páginas</SelectItem>
          <SelectItem value="DRAFT">Borradores</SelectItem>
          <SelectItem value="COMMENT">Comentarios</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status || 'all_statuses'} onValueChange={(v) => setFilter('status', v === 'all_statuses' ? '' : v)}>
        <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all_statuses">Todos</SelectItem>
          <SelectItem value="pending">Pendiente</SelectItem>
          <SelectItem value="approved">Aprobado</SelectItem>
          <SelectItem value="discarded">Descartado</SelectItem>
          <SelectItem value="needs_editing">Necesita edición</SelectItem>
        </SelectContent>
      </Select>

      {stats && stats.labels.length > 0 && (
        <Select value={filters.label || 'all_labels'} onValueChange={(v) => setFilter('label', v === 'all_labels' ? '' : v)}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <Tag className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Etiqueta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_labels">Todas</SelectItem>
            {stats.labels.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
          </SelectContent>
        </Select>
      )}

      <button
        onClick={() => setFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
        className="flex items-center gap-1 h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-muted/50 transition-colors"
        title="Cambiar orden"
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
  const typeConfig = TYPE_CONFIG[entry.entryType] || TYPE_CONFIG.POST;
  const statusConfig = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending;
  const labels: string[] = JSON.parse(entry.labels || '[]');
  const issues: { type: string; message: string }[] = JSON.parse(entry.issues || '[]');

  const cycleStatus = () => {
    const order = ['pending', 'approved', 'discarded', 'needs_editing'];
    const idx = order.indexOf(entry.status);
    onStatusChange(entry.id, order[(idx + 1) % order.length]);
  };

  return (
    <div
      className={`group flex items-start gap-3 p-3 rounded-lg border transition-all duration-150 cursor-pointer
        hover:border-amber-300 dark:hover:border-amber-700
        ${entry.status === 'discarded' ? 'opacity-50 hover:opacity-100' : ''}
        ${entry.status === 'approved' ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10' : 'border-border'}`}
      onClick={onPreview}
    >
      <button onClick={(e) => { e.stopPropagation(); cycleStatus(); }} className="mt-1 flex-shrink-0" title={statusConfig.label}>
        <div className={`w-3 h-3 rounded-full ${statusConfig.dotClass} ring-2 ring-offset-1 ring-offset-background ring-current/20 transition-all group-hover:scale-125`} />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${typeConfig.color}`}>
            {typeConfig.icon} {typeConfig.label}
          </span>
          <h3 className="text-sm font-medium truncate">{entry.title}</h3>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>{formatShortDate(entry.publishedAt)}</span>
          {entry.author && <span>· {entry.author}</span>}
          <span>· {entry.wordCount.toLocaleString('es-AR')} palabras</span>
          {entry.commentCount > 0 && <span>· {entry.commentCount} comentarios</span>}
        </div>
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {labels.slice(0, 4).map((l) => (<span key={l} className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">{l}</span>))}
            {labels.length > 4 && <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">+{labels.length - 4}</span>}
          </div>
        )}
      </div>

      {issues.length > 0 && (
        <div className="flex-shrink-0 mt-1" title={issues.map(i => i.message).join('\n')}>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </div>
      )}
    </div>
  );
}

// ── Entry List ─────────────────────────────────────────────────────────────

function EntryList() {
  const { filters, setFilter, isLoading } = useAppStore();
  const [entries, setEntries] = React.useState<EntryListItem[]>([]);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const { toast } = useToast();

  React.useEffect(() => {
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
        if (!cancelled) toast({ title: 'Error al cargar entradas', variant: 'destructive' });
      }
    };
    load();
    return () => { cancelled = true; };
  }, [filters.type, filters.status, filters.label, filters.search, filters.sortBy, filters.sortOrder, filters.page, toast]);

  const refreshEntries = () => {
    // Re-trigger effect by toggling a dummy value isn't possible, so we manually fetch
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
      .then(data => { setEntries(data.entries || []); setTotalPages(data.pagination?.totalPages || 1); setTotal(data.pagination?.total || 0); })
      .catch(() => toast({ title: 'Error al cargar entradas', variant: 'destructive' }));
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch(`/api/entries/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      refreshEntries();
      // Also refresh stats
      fetch('/api/stats').then(r => r.json()).then(d => useAppStore.getState().setStats(d)).catch(() => {});
    } catch {
      toast({ title: 'Error al cambiar estado', variant: 'destructive' });
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
      toast({ title: 'Error al cargar vista previa', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="space-y-2 p-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 text-xs text-muted-foreground border-b flex items-center justify-between">
        <span>{total} {total === 1 ? 'resultado' : 'resultados'}</span>
        {totalPages > 1 && <span>Página {filters.page} de {totalPages}</span>}
      </div>

      <ScrollArea className="max-h-[calc(100vh-380px)] min-h-0">
        <div className="p-2 space-y-1">
          {entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No se encontraron entradas con los filtros actuales</div>
          ) : (
            entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} onPreview={() => handlePreview(entry.id)} onStatusChange={handleStatusChange} />
            ))
          )}
        </div>
      </ScrollArea>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2 border-t">
          <Button variant="outline" size="sm" className="h-8 text-xs" disabled={filters.page <= 1} onClick={() => setFilter('page', filters.page - 1)}>Anterior</Button>
          <span className="text-xs text-muted-foreground px-2">{filters.page} / {totalPages}</span>
          <Button variant="outline" size="sm" className="h-8 text-xs" disabled={filters.page >= totalPages} onClick={() => setFilter('page', filters.page + 1)}>Siguiente</Button>
        </div>
      )}
    </div>
  );
}

// ── Preview Panel ──────────────────────────────────────────────────────────

function PreviewPanel() {
  const { selectedEntry, isPreviewOpen, setPreviewOpen, setSelectedEntry } = useAppStore();
  const { toast } = useToast();

  if (!selectedEntry) return null;

  const entry = selectedEntry as unknown as FullEntry;
  const typeConfig = TYPE_CONFIG[entry.entryType] || TYPE_CONFIG.POST;
  const statusConfig = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending;
  const labels: string[] = JSON.parse(entry.labels || '[]');
  const issues: { type: string; message: string; count?: number }[] = JSON.parse(entry.issues || '[]');

  const handleStatusChange = async (status: string) => {
    try {
      await fetch(`/api/entries/${entry.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      setSelectedEntry({ ...entry, status });
      // Refresh list + stats
      fetch('/api/stats').then(r => r.json()).then(d => useAppStore.getState().setStats(d)).catch(() => {});
    } catch {
      toast({ title: 'Error al cambiar estado', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={isPreviewOpen} onOpenChange={(open) => { if (!open) { setPreviewOpen(false); setSelectedEntry(null); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <div className="p-5 pb-3 space-y-3 flex-shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${typeConfig.color}`}>{typeConfig.icon} {typeConfig.label}</span>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                <div className={`w-2 h-2 rounded-full ${statusConfig.dotClass}`} /> {statusConfig.label}
              </div>
              {labels.map(l => (<Badge key={l} variant="secondary" className="text-[10px] px-1.5 py-0">{l}</Badge>))}
            </div>
            <DialogTitle className="text-lg font-semibold leading-tight">{entry.title}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span>{formatLongDate(entry.publishedAt)}</span>
            {entry.author && <span>· {entry.author}</span>}
            <span>· {entry.wordCount.toLocaleString('es-AR')} palabras</span>
            {entry.commentCount > 0 && <span>· {entry.commentCount} comentarios</span>}
            {entry.originalUrl && (
              <a href={entry.originalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-amber-600 hover:underline">
                <ExternalLink className="h-3 w-3" /> Ver original
              </a>
            )}
          </div>

          {issues.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {issues.map((issue, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" /> {issue.message}
                  {issue.count && issue.count > 1 && <span className="font-semibold">({issue.count})</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <ScrollArea className="flex-1 min-h-0">
          <div
            className="p-5 prose prose-sm dark:prose-invert max-w-none prose-img:max-w-full prose-img:h-auto prose-a:text-amber-600 prose-headings:font-semibold"
            dangerouslySetInnerHTML={{ __html: entry.content }}
          />
        </ScrollArea>

        <Separator />

        <div className="p-4 flex items-center gap-2 flex-wrap flex-shrink-0">
          <span className="text-xs text-muted-foreground mr-1">Marcar como:</span>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <Button key={key} variant={entry.status === key ? 'default' : 'outline'} size="sm" className="h-8 text-xs gap-1" onClick={() => handleStatusChange(key)}>
              {config.icon} {config.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Export Buttons ─────────────────────────────────────────────────────────

function ExportButtons() {
  const { toast } = useToast();

  const doExport = async (format: string, status: string) => {
    try {
      const params = new URLSearchParams({ format, status });
      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al exportar');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `curador-export.${format === 'markdown' ? 'md' : format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Exportación descargada' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al exportar', variant: 'destructive' });
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select onValueChange={(v) => doExport(v, 'approved')}>
        <SelectTrigger className="w-auto h-9 text-sm gap-2">
          <Download className="h-3.5 w-3.5" />
          <SelectValue placeholder="Exportar aprobados..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="json"><span className="flex items-center gap-2"><FileJson className="h-3.5 w-3.5" /> JSON (Supabase)</span></SelectItem>
          <SelectItem value="markdown"><span className="flex items-center gap-2"><FileDown className="h-3.5 w-3.5" /> Markdown</span></SelectItem>
          <SelectItem value="html"><span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> HTML (visual)</span></SelectItem>
        </SelectContent>
      </Select>

      <Select onValueChange={(v) => doExport(v, 'pending')}>
        <SelectTrigger className="w-auto h-9 text-sm gap-2">
          <Download className="h-3.5 w-3.5 text-amber-500" />
          <SelectValue placeholder="Exportar pendientes..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="json">JSON (Supabase)</SelectItem>
          <SelectItem value="markdown">Markdown</SelectItem>
          <SelectItem value="html">HTML (visual)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Dashboard View ─────────────────────────────────────────────────────────

function DashboardView() {
  const { stats, setStats, resetAll, uploadResult } = useAppStore();
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
      if (data.total === 0) resetAll();
    } catch {
      toast({ title: 'Error al cargar estadísticas', variant: 'destructive' });
    }
  }, [setStats, resetAll, toast]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleReset = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
      resetAll();
      toast({ title: 'Datos eliminados', description: 'Podés importar un nuevo archivo' });
    } catch {
      toast({ title: 'Error al reiniciar', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold"><span className="text-amber-600">Curador</span></h1>
            {uploadResult && <span className="hidden sm:inline text-xs text-muted-foreground">{uploadResult.blogTitle}</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportButtons />
            <BulkApproveButton onDone={fetchStats} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-destructive hover:text-destructive">
                  <RotateCcw className="h-3.5 w-3.5" /> Nueva importación
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Nueva importación</AlertDialogTitle>
                  <AlertDialogDescription>Esto va a eliminar todos los datos actuales. Esta acción no se puede deshacer.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset} className="bg-destructive text-white hover:bg-destructive/90">Sí, eliminar todo</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 space-y-4">
        <StatsBar />
        <FilterBar />
        <EntryList />
      </main>

      <footer className="border-t py-3 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Curador — Herramienta de migración desde Blogger</span>
          {stats && <span>{stats.totalWords.toLocaleString('es-AR')} palabras totales</span>}
        </div>
      </footer>

      <PreviewPanel />
    </div>
  );
}

// ── Bulk Approve ───────────────────────────────────────────────────────────

function BulkApproveButton({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();

  const handleApproveAll = async () => {
    try {
      const res = await fetch('/api/entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: 'ALL_CURRENT_FILTERS', status: 'approved' }),
      });
      const data = await res.json();
      toast({ title: `${data.updated || 'Todas las'} entradas aprobadas` });
      onDone();
    } catch {
      toast({ title: 'Error en acción masiva', variant: 'destructive' });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Aprobar todos
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aprobar todos los posts</AlertDialogTitle>
          <AlertDialogDescription>Esto va a cambiar el estado de TODAS las entradas a "Aprobado". ¿Estás seguro?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleApproveAll}>Sí, aprobar todos</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

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
      {view === 'upload' && (
        <footer className="border-t py-3 mt-auto">
          <div className="text-center text-xs text-muted-foreground">Curador — Herramienta de curaduría para migración desde Blogger</div>
        </footer>
      )}
    </div>
  );
}
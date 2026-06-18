import { create } from 'zustand';

export type ViewMode = 'upload' | 'dashboard';
export type EntryType = 'POST' | 'PAGE' | 'DRAFT' | 'COMMENT' | '';
export type EntryStatus = 'pending' | 'approved' | 'discarded' | 'needs_editing' | '';
export type SortField = 'publishedAt' | 'title' | 'wordCount' | 'commentCount';
export type SortOrder = 'asc' | 'desc';

export interface Stats {
  total: number;
  posts: number;
  pages: number;
  drafts: number;
  comments: number;
  approved: number;
  pending: number;
  discarded: number;
  needsEditing: number;
  withIssues: number;
  totalWords: number;
  labels: string[];
}

export interface DebugInfo {
  parseStrategy: string;
  firstEntryKeys: string[];
  sampleTitle: string;
  sampleBloggerType: string;
  sampleBloggerStatus: string;
  sampleFilename: string;
}

export interface UploadResult {
  blogTitle: string;
  blogAuthor: string;
  totalEntries: number;
  storedCount: number;
  skippedTypes: { type: string; count: number }[];
  breakdown: { POST: number; PAGE: number; DRAFT: number; COMMENT: number };
  debugInfo?: DebugInfo;
}

export interface EntryListItem {
  id: string;
  entryId: string;
  entryType: string;
  title: string;
  publishedAt: string | null;
  author: string | null;
  labels: string;
  status: string;
  issues: string;
  wordCount: number;
  commentCount: number;
}

interface AppState {
  view: ViewMode;
  uploadResult: UploadResult | null;
  stats: Stats | null;
  selectedId: string | null;
  selectedEntry: FullEntry | null;
  filters: {
    type: EntryType;
    status: EntryStatus;
    label: string;
    search: string;
    sortBy: SortField;
    sortOrder: SortOrder;
    page: number;
  };
  isLoading: boolean;
  isPreviewOpen: boolean;

  setView: (v: ViewMode) => void;
  setUploadResult: (r: UploadResult) => void;
  setStats: (s: Stats) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedEntry: (e: FullEntry | null) => void;
  setFilter: <K extends keyof AppState['filters']>(key: K, value: AppState['filters'][K]) => void;
  setLoading: (l: boolean) => void;
  setPreviewOpen: (open: boolean) => void;
  resetAll: () => void;
}

export interface FullEntry {
  id: string;
  entryId: string;
  entryType: string;
  title: string;
  content: string;
  publishedAt: string | null;
  atomUpdated: string | null;
  author: string | null;
  labels: string;
  originalUrl: string | null;
  status: string;
  issues: string;
  wordCount: number;
  commentCount: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

const initialFilters = {
  type: '' as EntryType,
  status: '' as EntryStatus,
  label: '',
  search: '',
  sortBy: 'publishedAt' as SortField,
  sortOrder: 'desc' as SortOrder,
  page: 1,
};

export const useAppStore = create<AppState>((set) => ({
  view: 'upload',
  uploadResult: null,
  stats: null,
  selectedId: null,
  selectedEntry: null,
  filters: initialFilters,
  isLoading: false,
  isPreviewOpen: false,

  setView: (v) => set({ view: v }),
  setUploadResult: (r) => set({ uploadResult: r }),
  setStats: (s) => set({ stats: s }),
  setSelectedId: (id) => set({ selectedId: id }),
  setSelectedEntry: (e) => set({ selectedEntry: e }),
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value, ...(key !== 'page' ? { page: 1 } : {}) },
    })),
  setLoading: (l) => set({ isLoading: l }),
  setPreviewOpen: (open) => set({ isPreviewOpen: open }),
  resetAll: () =>
    set({
      view: 'upload',
      uploadResult: null,
      stats: null,
      selectedId: null,
      selectedEntry: null,
      filters: initialFilters,
      isPreviewOpen: false,
    }),
}));
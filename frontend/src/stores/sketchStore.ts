/**
 * Sketch Store
 * Manages Excalidraw sketches state using Zustand
 * Aligned with SDK v2.1.0 sketch-schema.json
 *
 * Provides state management for freeform diagrams created with Excalidraw.
 * Sketches are stored per domain and can be linked to tables, systems, and assets.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sketchService } from '@/services/sdk/sketchService';
import type {
  Sketch,
  SketchFilter,
  SketchListItem,
  SketchType,
  SketchStatus,
} from '@/types/sketch';
import { createNewSketch, getNextSketchNumber } from '@/types/sketch';

interface SketchState {
  // State
  sketches: Sketch[];
  selectedSketch: Sketch | null;
  filter: SketchFilter;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Computed (via selectors)
  filteredSketches: Sketch[];

  // Setters
  setSketches: (sketches: Sketch[]) => void;
  setSelectedSketch: (sketch: Sketch | null) => void;
  setFilter: (filter: SketchFilter | ((prev: SketchFilter) => SketchFilter)) => void;
  setLoading: (isLoading: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Data operations (in-memory)
  addSketch: (sketch: Sketch) => void;
  updateSketchInStore: (sketchId: string, updates: Partial<Sketch>) => void;
  removeSketch: (sketchId: string) => void;

  // High-level operations
  createSketch: (data: {
    title: string;
    domain_id: string;
    workspace_id?: string;
    description?: string;
    sketch_type?: SketchType;
    // Deprecated alias
    name?: string;
  }) => Sketch;

  updateSketch: (sketchId: string, updates: Partial<Sketch>) => Sketch | null;

  updateSketchData: (sketchId: string, excalidrawData: string) => Promise<Sketch | null>;

  updateSketchStatus: (sketchId: string, status: SketchStatus) => Sketch | null;

  // Linking operations
  linkTable: (sketchId: string, tableId: string) => void;
  unlinkTable: (sketchId: string, tableId: string) => void;
  linkSystem: (sketchId: string, systemId: string) => void;
  unlinkSystem: (sketchId: string, systemId: string) => void;
  linkAsset: (sketchId: string, assetId: string) => void;
  unlinkAsset: (sketchId: string, assetId: string) => void;
  linkArticle: (sketchId: string, articleId: string) => void;
  unlinkArticle: (sketchId: string, articleId: string) => void;
  linkDecision: (sketchId: string, decisionId: string) => void;
  unlinkDecision: (sketchId: string, decisionId: string) => void;
  linkRelatedSketch: (sketchId: string, relatedSketchId: string) => void;
  unlinkRelatedSketch: (sketchId: string, relatedSketchId: string) => void;

  // Selectors
  getSketchById: (id: string) => Sketch | undefined;
  getSketchesByDomain: (domainId: string) => Sketch[];
  getSketchesByTable: (tableId: string) => Sketch[];
  getSketchesBySystem: (systemId: string) => Sketch[];
  getSketchesByAsset: (assetId: string) => Sketch[];
  getSketchesByArticle: (articleId: string) => Sketch[];
  getSketchesByDecision: (decisionId: string) => Sketch[];
  getSketchesByStatus: (status: SketchStatus) => Sketch[];
  getSketchesByType: (type: SketchType) => Sketch[];
  getSketchListItems: (domainId?: string) => SketchListItem[];
  getNextNumber: (domainId?: string) => number;

  // Reset
  reset: () => void;
}

const initialState = {
  sketches: [],
  selectedSketch: null,
  filter: {},
  isLoading: false,
  isSaving: false,
  error: null,
  filteredSketches: [],
};

export const useSketchStore = create<SketchState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Setters
      setSketches: (sketches) => {
        set({ sketches });
        const filter = get().filter;
        const filtered = applyFilter(sketches, filter);
        set({ filteredSketches: filtered });
      },

      setSelectedSketch: (sketch) => set({ selectedSketch: sketch }),

      setFilter: (filterOrUpdater) => {
        const currentFilter = get().filter;
        const newFilter =
          typeof filterOrUpdater === 'function' ? filterOrUpdater(currentFilter) : filterOrUpdater;

        set({ filter: newFilter });
        const sketches = get().sketches;
        const filtered = applyFilter(sketches, newFilter);
        set({ filteredSketches: filtered });
      },

      setLoading: (isLoading) => set({ isLoading }),

      setSaving: (isSaving) => set({ isSaving }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // Data operations (in-memory)
      addSketch: (sketch) => {
        const sketches = [...get().sketches, sketch];
        const filter = get().filter;
        set({
          sketches,
          filteredSketches: applyFilter(sketches, filter),
        });
      },

      updateSketchInStore: (sketchId, updates) => {
        const sketches = get().sketches.map((s) =>
          s.id === sketchId ? { ...s, ...updates, last_modified_at: new Date().toISOString() } : s
        );
        const filter = get().filter;
        const selectedSketch = get().selectedSketch;
        const updatedSketch = sketches.find((s) => s.id === sketchId);

        set({
          sketches,
          filteredSketches: applyFilter(sketches, filter),
          selectedSketch:
            selectedSketch?.id === sketchId ? (updatedSketch ?? null) : selectedSketch,
        });
      },

      removeSketch: (sketchId) => {
        const sketches = get().sketches.filter((s) => s.id !== sketchId);
        const filter = get().filter;
        const selectedSketch = get().selectedSketch;

        set({
          sketches,
          filteredSketches: applyFilter(sketches, filter),
          selectedSketch: selectedSketch?.id === sketchId ? null : selectedSketch,
        });
      },

      // High-level creation
      createSketch: (data) => {
        const title = data.title || data.name || 'Untitled Sketch';
        const number = get().getNextNumber(data.domain_id);
        const sketchData = createNewSketch(data.domain_id, title, data.workspace_id, number);
        const sketch: Sketch = {
          ...sketchData,
          id: crypto.randomUUID(),
          description: data.description || '',
          sketch_type: data.sketch_type || 'other',
        };

        get().addSketch(sketch);
        set({ selectedSketch: sketch });

        return sketch;
      },

      updateSketch: (sketchId, updates) => {
        const sketch = get().getSketchById(sketchId);
        if (!sketch) {
          set({ error: `Sketch not found: ${sketchId}` });
          return null;
        }

        // Handle title/name sync for backwards compatibility
        const syncedUpdates = { ...updates };
        if (updates.title && !updates.name) {
          syncedUpdates.name = updates.title;
        } else if (updates.name && !updates.title) {
          syncedUpdates.title = updates.name;
        }

        get().updateSketchInStore(sketchId, syncedUpdates);
        return get().getSketchById(sketchId) || null;
      },

      updateSketchData: async (sketchId, excalidrawData) => {
        const sketch = get().getSketchById(sketchId);
        if (!sketch) {
          set({ error: `Sketch not found: ${sketchId}` });
          return null;
        }

        set({ isSaving: true });
        try {
          // Generate thumbnail from the new data
          const thumbnail = await sketchService.generateThumbnail(excalidrawData);

          get().updateSketchInStore(sketchId, {
            excalidraw_data: excalidrawData,
            thumbnail,
          });

          set({ isSaving: false });
          return get().getSketchById(sketchId) || null;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update sketch',
            isSaving: false,
          });
          return null;
        }
      },

      updateSketchStatus: (sketchId, status) => {
        const sketch = get().getSketchById(sketchId);
        if (!sketch) {
          set({ error: `Sketch not found: ${sketchId}` });
          return null;
        }

        get().updateSketchInStore(sketchId, { status });
        return get().getSketchById(sketchId) || null;
      },

      // Linking operations
      linkTable: (sketchId, tableId) => {
        const sketch = get().getSketchById(sketchId);
        if (!sketch) return;

        const linked = sketch.linked_tables || [];
        if (!linked.includes(tableId)) {
          get().updateSketchInStore(sketchId, {
            linked_tables: [...linked, tableId],
          });
        }
      },

      unlinkTable: (sketchId, tableId) => {
        const sketch = get().getSketchById(sketchId);
        if (!sketch) return;

        get().updateSketchInStore(sketchId, {
          linked_tables: (sketch.linked_tables || []).filter((id) => id !== tableId),
        });
      },

      linkSystem: (sketchId, systemId) => {
        const sketch = get().getSketchById(sketchId);
        if (!sketch) return;

        const linked = sketch.linked_systems || [];
        if (!linked.includes(systemId)) {
          get().updateSketchInStore(sketchId, {
            linked_systems: [...linked, systemId],
          });
        }
      },

      unlinkSystem: (sketchId, systemId) => {
        const sketch = get().getSketchById(sketchId);
        if (!sketch) return;

        get().updateSketchInStore(sketchId, {
          linked_systems: (sketch.linked_systems || []).filter((id) => id !== systemId),
        });
      },

      linkAsset: (sketchId, assetId) => {
        const sketch = get().getSketchById(sketchId);
        if (!sketch) return;

        const linked = sketch.linked_assets || [];
        // For backwards compatibility, check if it's an array of strings or LinkedAssetRef
        const hasAsset = linked.some((item) =>
          typeof item === 'string' ? item === assetId : item.id === assetId
        );

        if (!hasAsset) {
          // Add as simple string array for now
          get().updateSketchInStore(sketchId, {
            linked_assets: [...linked, assetId] as any,
          });
        }
      },

      unlinkAsset: (sketchId, assetId) => {
        const sketch = get().getSketchById(sketchId);
        if (!sketch) return;

        get().updateSketchInStore(sketchId, {
          linked_assets: (sketch.linked_assets || []).filter((item) =>
            typeof item === 'string' ? item !== assetId : item.id !== assetId
          ) as any,
        });
      },

      linkArticle: (sketchId, articleId) => {
        const sketch = get().getSketchById(sketchId);
        if (!sketch) return;

        const linked = sketch.linked_articles || [];
        const linkedKnowledge = sketch.linked_knowledge || [];

        if (!linked.includes(articleId)) {
          get().updateSketchInStore(sketchId, {
            linked_articles: [...linked, articleId],
            linked_knowledge: [...linkedKnowledge, articleId],
          });
        }
      },

      unlinkArticle: (sketchId, articleId) => {
        const sketch = get().getSketchById(sketchId);
        if (!sketch) return;

        get().updateSketchInStore(sketchId, {
          linked_articles: (sketch.linked_articles || []).filter((id) => id !== articleId),
          linked_knowledge: (sketch.linked_knowledge || []).filter((id) => id !== articleId),
        });
      },

      linkDecision: (sketchId, decisionId) => {
        const sketch = get().getSketchById(sketchId);
        if (!sketch) return;

        const linked = sketch.linked_decisions || [];
        if (!linked.includes(decisionId)) {
          get().updateSketchInStore(sketchId, {
            linked_decisions: [...linked, decisionId],
          });
        }
      },

      unlinkDecision: (sketchId, decisionId) => {
        const sketch = get().getSketchById(sketchId);
        if (!sketch) return;

        get().updateSketchInStore(sketchId, {
          linked_decisions: (sketch.linked_decisions || []).filter((id) => id !== decisionId),
        });
      },

      linkRelatedSketch: (sketchId, relatedSketchId) => {
        const sketch = get().getSketchById(sketchId);
        if (!sketch || sketchId === relatedSketchId) return;

        const linked = sketch.related_sketches || [];
        if (!linked.includes(relatedSketchId)) {
          get().updateSketchInStore(sketchId, {
            related_sketches: [...linked, relatedSketchId],
          });
        }
      },

      unlinkRelatedSketch: (sketchId, relatedSketchId) => {
        const sketch = get().getSketchById(sketchId);
        if (!sketch) return;

        get().updateSketchInStore(sketchId, {
          related_sketches: (sketch.related_sketches || []).filter((id) => id !== relatedSketchId),
        });
      },

      // Selectors
      getSketchById: (id) => {
        return get().sketches.find((s) => s.id === id);
      },

      getSketchesByDomain: (domainId) => {
        return get().sketches.filter((s) => s.domain_id === domainId);
      },

      getSketchesByTable: (tableId) => {
        return get().sketches.filter((s) => s.linked_tables?.includes(tableId));
      },

      getSketchesBySystem: (systemId) => {
        return get().sketches.filter((s) => s.linked_systems?.includes(systemId));
      },

      getSketchesByAsset: (assetId) => {
        return get().sketches.filter((s) =>
          s.linked_assets?.some((item) =>
            typeof item === 'string' ? item === assetId : item.id === assetId
          )
        );
      },

      getSketchesByArticle: (articleId) => {
        return get().sketches.filter(
          (s) => s.linked_articles?.includes(articleId) || s.linked_knowledge?.includes(articleId)
        );
      },

      getSketchesByDecision: (decisionId) => {
        return get().sketches.filter((s) => s.linked_decisions?.includes(decisionId));
      },

      getSketchesByStatus: (status) => {
        return get().sketches.filter((s) => s.status === status);
      },

      getSketchesByType: (type) => {
        return get().sketches.filter((s) => s.sketch_type === type);
      },

      getSketchListItems: (domainId) => {
        let sketches = get().sketches;
        if (domainId) {
          sketches = sketches.filter((s) => s.domain_id === domainId);
        }

        return sketches.map((s) => ({
          id: s.id,
          number: s.number,
          title: s.title || s.name || 'Untitled',
          domain_id: s.domain_id,
          sketch_type: s.sketch_type,
          status: s.status,
          description: s.description,
          thumbnail: s.thumbnail,
          thumbnail_path: s.thumbnail_path,
          tags: s.tags,
          authors: s.authors,
          created_at: s.created_at,
          last_modified_at: s.last_modified_at,
          // Deprecated alias
          name: s.name || s.title,
        }));
      },

      getNextNumber: (domainId) => {
        return getNextSketchNumber(get().sketches, domainId);
      },

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'sketch-store',
      partialize: (state) => ({
        // Only persist selected sketch ID and filter
        selectedSketchId: state.selectedSketch?.id,
        filter: state.filter,
      }),
    }
  )
);

/**
 * Apply filter to sketches
 */
function applyFilter(sketches: Sketch[], filter: SketchFilter): Sketch[] {
  let filtered = [...sketches];

  if (filter.domain_id) {
    filtered = filtered.filter((s) => s.domain_id === filter.domain_id);
  }

  if (filter.status) {
    filtered = filtered.filter((s) => s.status === filter.status);
  }

  if (filter.sketch_type) {
    filtered = filtered.filter((s) => s.sketch_type === filter.sketch_type);
  }

  if (filter.search) {
    const searchLower = filter.search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        (s.title || s.name || '').toLowerCase().includes(searchLower) ||
        (s.description && s.description.toLowerCase().includes(searchLower))
    );
  }

  if (filter.tags && filter.tags.length > 0) {
    filtered = filtered.filter((s) =>
      s.tags?.some((tag) => {
        // Handle Tag type: can be string, {key, value}, or {key, values}
        const tagName = typeof tag === 'string' ? tag : tag.key;
        return filter.tags!.includes(tagName);
      })
    );
  }

  if (filter.linked_table_id) {
    filtered = filtered.filter((s) => s.linked_tables?.includes(filter.linked_table_id!));
  }

  if (filter.linked_system_id) {
    filtered = filtered.filter((s) => s.linked_systems?.includes(filter.linked_system_id!));
  }

  // Sort by number ascending within domain, then by last modified descending
  filtered.sort((a, b) => {
    // First sort by number if both have numbers
    if (a.number && b.number && a.domain_id === b.domain_id) {
      return a.number - b.number;
    }
    // Then by last modified descending (newest first)
    return new Date(b.last_modified_at).getTime() - new Date(a.last_modified_at).getTime();
  });

  return filtered;
}

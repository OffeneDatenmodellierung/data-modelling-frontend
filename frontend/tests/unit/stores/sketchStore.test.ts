/**
 * Unit tests for Sketch Store
 * Tests Zustand store for Excalidraw sketches
 * Aligned with SDK v2.1.0 sketch-schema.json
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSketchStore } from '@/stores/sketchStore';
import { sketchService } from '@/services/sdk/sketchService';
import type { Sketch, SketchType, SketchStatus } from '@/types/sketch';

// Mock sketchService
vi.mock('@/services/sdk/sketchService', () => ({
  sketchService: {
    parseJSON: vi.fn(),
    toJSON: vi.fn(),
    toSDKJSON: vi.fn(),
    toExcalidrawJSON: vi.fn(),
    validateData: vi.fn(),
    validateSketch: vi.fn(),
    generateThumbnail: vi.fn(),
    exportToPNG: vi.fn(),
    exportToSVG: vi.fn(),
    export: vi.fn(),
    downloadBlob: vi.fn(),
    downloadString: vi.fn(),
    getElementCount: vi.fn(),
    isEmpty: vi.fn(),
    mergeData: vi.fn(),
  },
}));

describe('useSketchStore', () => {
  const mockSketch: Sketch = {
    id: 'sketch-1',
    number: 1,
    title: 'Architecture Diagram',
    name: 'Architecture Diagram',
    sketch_type: 'architecture' as SketchType,
    status: 'draft' as SketchStatus,
    domain_id: 'domain-1',
    workspace_id: 'workspace-1',
    description: 'System architecture overview',
    excalidraw_data: JSON.stringify({
      elements: [{ id: 'elem-1', type: 'rectangle' }],
      appState: { viewBackgroundColor: '#ffffff' },
      files: {},
    }),
    thumbnail: 'data:image/png;base64,abc123',
    linked_tables: ['table-1'],
    linked_systems: ['system-1'],
    linked_assets: [],
    linked_articles: [],
    linked_decisions: [],
    linked_knowledge: [],
    related_sketches: [],
    tags: [{ key: 'architecture', value: 'system' }],
    authors: [{ name: 'John Doe', email: 'john@example.com' }],
    created_at: '2024-01-01T00:00:00Z',
    last_modified_at: '2024-01-01T00:00:00Z',
  };

  const mockSketch2: Sketch = {
    ...mockSketch,
    id: 'sketch-2',
    number: 2,
    title: 'Data Flow Diagram',
    name: 'Data Flow Diagram',
    description: 'Data flow overview',
    sketch_type: 'dataflow' as SketchType,
    status: 'published' as SketchStatus,
    domain_id: 'domain-2',
  };

  const mockSketch3: Sketch = {
    ...mockSketch,
    id: 'sketch-3',
    number: 3,
    title: 'Entity Relationship',
    name: 'Entity Relationship',
    description: 'ER diagram for database',
    sketch_type: 'entity-relationship' as SketchType,
    status: 'review' as SketchStatus,
    domain_id: 'domain-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useSketchStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useSketchStore.getState();

      expect(state.sketches).toEqual([]);
      expect(state.selectedSketch).toBeNull();
      expect(state.filter).toEqual({});
      expect(state.isLoading).toBe(false);
      expect(state.isSaving).toBe(false);
      expect(state.error).toBeNull();
      expect(state.filteredSketches).toEqual([]);
    });
  });

  describe('setters', () => {
    it('should set sketches and update filtered sketches', () => {
      const store = useSketchStore.getState();

      store.setSketches([mockSketch, mockSketch2]);

      const state = useSketchStore.getState();
      expect(state.sketches).toHaveLength(2);
      expect(state.filteredSketches).toHaveLength(2);
    });

    it('should set selected sketch', () => {
      const store = useSketchStore.getState();

      store.setSelectedSketch(mockSketch);

      const state = useSketchStore.getState();
      expect(state.selectedSketch).toEqual(mockSketch);
    });

    it('should set filter and update filtered sketches', () => {
      const store = useSketchStore.getState();
      store.setSketches([mockSketch, mockSketch2, mockSketch3]);

      store.setFilter({ domain_id: 'domain-1' });

      const state = useSketchStore.getState();
      expect(state.filter).toEqual({ domain_id: 'domain-1' });
      expect(state.filteredSketches).toHaveLength(2);
      expect(state.filteredSketches.every((s) => s.domain_id === 'domain-1')).toBe(true);
    });

    it('should filter by status', () => {
      const store = useSketchStore.getState();
      store.setSketches([mockSketch, mockSketch2, mockSketch3]);

      store.setFilter({ status: 'draft' });

      const state = useSketchStore.getState();
      expect(state.filteredSketches).toHaveLength(1);
      expect(state.filteredSketches[0].status).toBe('draft');
    });

    it('should filter by sketch_type', () => {
      const store = useSketchStore.getState();
      store.setSketches([mockSketch, mockSketch2, mockSketch3]);

      store.setFilter({ sketch_type: 'architecture' });

      const state = useSketchStore.getState();
      expect(state.filteredSketches).toHaveLength(1);
      expect(state.filteredSketches[0].sketch_type).toBe('architecture');
    });

    it('should filter by search term in title', () => {
      const store = useSketchStore.getState();
      store.setSketches([mockSketch, mockSketch2, mockSketch3]);

      store.setFilter({ search: 'architecture' });

      const state = useSketchStore.getState();
      expect(state.filteredSketches).toHaveLength(1);
      expect(state.filteredSketches[0].title).toContain('Architecture');
    });

    it('should set loading state', () => {
      const store = useSketchStore.getState();

      store.setLoading(true);

      expect(useSketchStore.getState().isLoading).toBe(true);
    });

    it('should set saving state', () => {
      const store = useSketchStore.getState();

      store.setSaving(true);

      expect(useSketchStore.getState().isSaving).toBe(true);
    });

    it('should set and clear error', () => {
      const store = useSketchStore.getState();

      store.setError('Test error');
      expect(useSketchStore.getState().error).toBe('Test error');

      store.clearError();
      expect(useSketchStore.getState().error).toBeNull();
    });
  });

  describe('data operations', () => {
    it('should add a sketch', () => {
      const store = useSketchStore.getState();

      store.addSketch(mockSketch);

      const state = useSketchStore.getState();
      expect(state.sketches).toHaveLength(1);
      expect(state.sketches[0]).toEqual(mockSketch);
    });

    it('should update a sketch in store', () => {
      const store = useSketchStore.getState();
      store.setSketches([mockSketch]);

      store.updateSketchInStore('sketch-1', { title: 'Updated Title', name: 'Updated Title' });

      const state = useSketchStore.getState();
      expect(state.sketches[0].title).toBe('Updated Title');
      expect(state.sketches[0].last_modified_at).not.toBe(mockSketch.last_modified_at);
    });

    it('should update selected sketch when updating', () => {
      const store = useSketchStore.getState();
      store.setSketches([mockSketch]);
      store.setSelectedSketch(mockSketch);

      store.updateSketchInStore('sketch-1', { title: 'Updated Title' });

      const state = useSketchStore.getState();
      expect(state.selectedSketch?.title).toBe('Updated Title');
    });

    it('should remove a sketch', () => {
      const store = useSketchStore.getState();
      store.setSketches([mockSketch, mockSketch2]);

      store.removeSketch('sketch-1');

      const state = useSketchStore.getState();
      expect(state.sketches).toHaveLength(1);
      expect(state.sketches[0].id).toBe('sketch-2');
    });

    it('should clear selected sketch when removed', () => {
      const store = useSketchStore.getState();
      store.setSketches([mockSketch]);
      store.setSelectedSketch(mockSketch);

      store.removeSketch('sketch-1');

      expect(useSketchStore.getState().selectedSketch).toBeNull();
    });
  });

  describe('createSketch', () => {
    it('should create a new sketch with required fields', () => {
      const store = useSketchStore.getState();

      const newSketch = store.createSketch({
        title: 'New Sketch',
        domain_id: 'domain-1',
        workspace_id: 'workspace-1',
      });

      expect(newSketch.id).toBeDefined();
      expect(newSketch.title).toBe('New Sketch');
      expect(newSketch.name).toBe('New Sketch');
      expect(newSketch.domain_id).toBe('domain-1');
      expect(newSketch.number).toBe(1);
      expect(newSketch.sketch_type).toBe('other');
      expect(newSketch.status).toBe('draft');

      const state = useSketchStore.getState();
      expect(state.sketches).toHaveLength(1);
      expect(state.selectedSketch?.id).toBe(newSketch.id);
    });

    it('should create sketch with custom sketch_type', () => {
      const store = useSketchStore.getState();

      const newSketch = store.createSketch({
        title: 'Architecture Sketch',
        domain_id: 'domain-1',
        sketch_type: 'architecture',
      });

      expect(newSketch.sketch_type).toBe('architecture');
    });

    it('should increment sketch number within domain', () => {
      const store = useSketchStore.getState();
      store.setSketches([mockSketch]); // number: 1, domain-1

      const newSketch = store.createSketch({
        title: 'Second Sketch',
        domain_id: 'domain-1',
      });

      expect(newSketch.number).toBe(2);
    });

    it('should handle backwards compatible name field', () => {
      const store = useSketchStore.getState();

      const newSketch = store.createSketch({
        title: 'Title Sketch',
        name: 'Name Sketch',
        domain_id: 'domain-1',
      });

      // title takes precedence
      expect(newSketch.title).toBe('Title Sketch');
    });
  });

  describe('updateSketch', () => {
    it('should update an existing sketch', () => {
      const store = useSketchStore.getState();
      store.setSketches([mockSketch]);

      const updated = store.updateSketch('sketch-1', {
        title: 'Updated Title',
        description: 'Updated description',
      });

      expect(updated?.title).toBe('Updated Title');
      expect(updated?.description).toBe('Updated description');
    });

    it('should sync title and name fields', () => {
      const store = useSketchStore.getState();
      store.setSketches([mockSketch]);

      store.updateSketch('sketch-1', { title: 'New Title' });

      const state = useSketchStore.getState();
      expect(state.sketches[0].title).toBe('New Title');
      expect(state.sketches[0].name).toBe('New Title');
    });

    it('should return null for non-existent sketch', () => {
      const store = useSketchStore.getState();

      const result = store.updateSketch('non-existent', { title: 'Test' });

      expect(result).toBeNull();
      expect(useSketchStore.getState().error).toContain('not found');
    });
  });

  describe('updateSketchData', () => {
    it('should update excalidraw data and generate thumbnail', async () => {
      vi.mocked(sketchService.generateThumbnail).mockResolvedValue(
        'data:image/png;base64,newthumb'
      );

      const store = useSketchStore.getState();
      store.setSketches([mockSketch]);

      const newData = JSON.stringify({ elements: [{ id: 'new' }], appState: {}, files: {} });
      const result = await store.updateSketchData('sketch-1', newData);

      expect(result?.excalidraw_data).toBe(newData);
      expect(result?.thumbnail).toBe('data:image/png;base64,newthumb');
      expect(sketchService.generateThumbnail).toHaveBeenCalledWith(newData);
    });

    it('should handle thumbnail generation failure gracefully', async () => {
      vi.mocked(sketchService.generateThumbnail).mockResolvedValue(undefined);

      const store = useSketchStore.getState();
      store.setSketches([mockSketch]);

      const newData = JSON.stringify({ elements: [], appState: {}, files: {} });
      const result = await store.updateSketchData('sketch-1', newData);

      expect(result?.excalidraw_data).toBe(newData);
      expect(result?.thumbnail).toBeUndefined();
    });

    it('should set saving state during update', async () => {
      vi.mocked(sketchService.generateThumbnail).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('thumb'), 10))
      );

      const store = useSketchStore.getState();
      store.setSketches([mockSketch]);

      const promise = store.updateSketchData('sketch-1', '{}');

      expect(useSketchStore.getState().isSaving).toBe(true);

      await promise;

      expect(useSketchStore.getState().isSaving).toBe(false);
    });
  });

  describe('updateSketchStatus', () => {
    it('should update sketch status', () => {
      const store = useSketchStore.getState();
      store.setSketches([mockSketch]);

      const result = store.updateSketchStatus('sketch-1', 'published');

      expect(result?.status).toBe('published');
    });

    it('should return null for non-existent sketch', () => {
      const store = useSketchStore.getState();

      const result = store.updateSketchStatus('non-existent', 'published');

      expect(result).toBeNull();
    });
  });

  describe('linking operations', () => {
    beforeEach(() => {
      useSketchStore.getState().setSketches([mockSketch]);
    });

    describe('tables', () => {
      it('should link a table', () => {
        const store = useSketchStore.getState();

        store.linkTable('sketch-1', 'table-2');

        const sketch = store.getSketchById('sketch-1');
        expect(sketch?.linked_tables).toContain('table-2');
      });

      it('should not duplicate linked table', () => {
        const store = useSketchStore.getState();

        store.linkTable('sketch-1', 'table-1'); // already linked

        const sketch = store.getSketchById('sketch-1');
        expect(sketch?.linked_tables?.filter((t) => t === 'table-1')).toHaveLength(1);
      });

      it('should unlink a table', () => {
        const store = useSketchStore.getState();

        store.unlinkTable('sketch-1', 'table-1');

        const sketch = store.getSketchById('sketch-1');
        expect(sketch?.linked_tables).not.toContain('table-1');
      });
    });

    describe('systems', () => {
      it('should link a system', () => {
        const store = useSketchStore.getState();

        store.linkSystem('sketch-1', 'system-2');

        const sketch = store.getSketchById('sketch-1');
        expect(sketch?.linked_systems).toContain('system-2');
      });

      it('should unlink a system', () => {
        const store = useSketchStore.getState();

        store.unlinkSystem('sketch-1', 'system-1');

        const sketch = store.getSketchById('sketch-1');
        expect(sketch?.linked_systems).not.toContain('system-1');
      });
    });

    describe('articles/knowledge', () => {
      it('should link an article and sync to linked_knowledge', () => {
        const store = useSketchStore.getState();

        store.linkArticle('sketch-1', 'article-1');

        const sketch = store.getSketchById('sketch-1');
        expect(sketch?.linked_articles).toContain('article-1');
        expect(sketch?.linked_knowledge).toContain('article-1');
      });

      it('should unlink an article from both fields', () => {
        const store = useSketchStore.getState();
        store.linkArticle('sketch-1', 'article-1');

        store.unlinkArticle('sketch-1', 'article-1');

        const sketch = store.getSketchById('sketch-1');
        expect(sketch?.linked_articles).not.toContain('article-1');
        expect(sketch?.linked_knowledge).not.toContain('article-1');
      });
    });

    describe('decisions', () => {
      it('should link a decision', () => {
        const store = useSketchStore.getState();

        store.linkDecision('sketch-1', 'decision-1');

        const sketch = store.getSketchById('sketch-1');
        expect(sketch?.linked_decisions).toContain('decision-1');
      });

      it('should unlink a decision', () => {
        const store = useSketchStore.getState();
        store.linkDecision('sketch-1', 'decision-1');

        store.unlinkDecision('sketch-1', 'decision-1');

        const sketch = store.getSketchById('sketch-1');
        expect(sketch?.linked_decisions).not.toContain('decision-1');
      });
    });

    describe('related sketches', () => {
      it('should link a related sketch', () => {
        const store = useSketchStore.getState();
        store.setSketches([mockSketch, mockSketch2]);

        store.linkRelatedSketch('sketch-1', 'sketch-2');

        const sketch = store.getSketchById('sketch-1');
        expect(sketch?.related_sketches).toContain('sketch-2');
      });

      it('should not link sketch to itself', () => {
        const store = useSketchStore.getState();

        store.linkRelatedSketch('sketch-1', 'sketch-1');

        const sketch = store.getSketchById('sketch-1');
        expect(sketch?.related_sketches).not.toContain('sketch-1');
      });

      it('should unlink a related sketch', () => {
        const store = useSketchStore.getState();
        store.linkRelatedSketch('sketch-1', 'sketch-2');

        store.unlinkRelatedSketch('sketch-1', 'sketch-2');

        const sketch = store.getSketchById('sketch-1');
        expect(sketch?.related_sketches).not.toContain('sketch-2');
      });
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      useSketchStore.getState().setSketches([mockSketch, mockSketch2, mockSketch3]);
    });

    it('should get sketch by id', () => {
      const sketch = useSketchStore.getState().getSketchById('sketch-1');
      expect(sketch?.id).toBe('sketch-1');
    });

    it('should return undefined for non-existent id', () => {
      const sketch = useSketchStore.getState().getSketchById('non-existent');
      expect(sketch).toBeUndefined();
    });

    it('should get sketches by domain', () => {
      const sketches = useSketchStore.getState().getSketchesByDomain('domain-1');
      expect(sketches).toHaveLength(2);
      expect(sketches.every((s) => s.domain_id === 'domain-1')).toBe(true);
    });

    it('should get sketches by table', () => {
      const sketches = useSketchStore.getState().getSketchesByTable('table-1');
      expect(sketches).toHaveLength(3); // all have table-1 linked
    });

    it('should get sketches by system', () => {
      const sketches = useSketchStore.getState().getSketchesBySystem('system-1');
      expect(sketches).toHaveLength(3);
    });

    it('should get sketches by status', () => {
      const sketches = useSketchStore.getState().getSketchesByStatus('draft');
      expect(sketches).toHaveLength(1);
      expect(sketches[0].status).toBe('draft');
    });

    it('should get sketches by type', () => {
      const sketches = useSketchStore.getState().getSketchesByType('dataflow');
      expect(sketches).toHaveLength(1);
      expect(sketches[0].sketch_type).toBe('dataflow');
    });

    it('should get next number for domain', () => {
      const nextNumber = useSketchStore.getState().getNextNumber('domain-1');
      // domain-1 has sketches with numbers 1 and 3
      expect(nextNumber).toBe(4);
    });

    it('should return 1 for empty domain', () => {
      const nextNumber = useSketchStore.getState().getNextNumber('empty-domain');
      expect(nextNumber).toBe(1);
    });

    it('should get sketch list items', () => {
      const items = useSketchStore.getState().getSketchListItems('domain-1');

      expect(items).toHaveLength(2);
      expect(items[0]).toHaveProperty('id');
      expect(items[0]).toHaveProperty('title');
      expect(items[0]).toHaveProperty('number');
      expect(items[0]).toHaveProperty('sketch_type');
      expect(items[0]).toHaveProperty('status');
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const store = useSketchStore.getState();
      store.setSketches([mockSketch]);
      store.setSelectedSketch(mockSketch);
      store.setFilter({ domain_id: 'domain-1' });
      store.setError('Some error');

      store.reset();

      const state = useSketchStore.getState();
      expect(state.sketches).toEqual([]);
      expect(state.selectedSketch).toBeNull();
      expect(state.filter).toEqual({});
      expect(state.error).toBeNull();
    });
  });
});

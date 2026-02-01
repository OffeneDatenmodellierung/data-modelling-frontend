/**
 * Unit tests for Sketch Service
 * Tests Excalidraw diagram operations including parsing, validation, and export
 * Aligned with SDK v2.1.0 sketch-schema.json
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sketchService } from '@/services/sdk/sketchService';
import type { Sketch } from '@/types/sketch';

// Mock Excalidraw exports
vi.mock('@excalidraw/excalidraw', () => ({
  exportToBlob: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'image/png' })),
  exportToSvg: vi.fn().mockResolvedValue({
    outerHTML: '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>',
  }),
}));

describe('sketchService', () => {
  const validExcalidrawData = JSON.stringify({
    elements: [{ id: 'elem-1', type: 'rectangle', x: 0, y: 0, width: 100, height: 100 }],
    appState: {
      viewBackgroundColor: '#ffffff',
      gridSize: null,
    },
    files: {},
  });

  const emptyExcalidrawData = JSON.stringify({
    elements: [],
    appState: { viewBackgroundColor: '#ffffff' },
    files: {},
  });

  const mockSketch: Sketch = {
    id: 'sketch-1',
    number: 1,
    title: 'Test Sketch',
    name: 'Test Sketch',
    sketch_type: 'architecture',
    status: 'draft',
    domain_id: 'domain-1',
    workspace_id: 'workspace-1',
    description: 'A test sketch',
    excalidraw_data: validExcalidrawData,
    linked_tables: ['table-1'],
    linked_systems: ['system-1'],
    linked_assets: [],
    linked_articles: [],
    linked_decisions: [],
    linked_knowledge: [],
    related_sketches: [],
    tags: [],
    created_at: '2024-01-01T00:00:00Z',
    last_modified_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseJSON', () => {
    describe('frontend format (snake_case)', () => {
      it('should parse valid sketch JSON with excalidraw_data', async () => {
        const json = JSON.stringify({
          id: 'sketch-1',
          number: 1,
          title: 'Test Sketch',
          sketch_type: 'architecture',
          status: 'draft',
          domain_id: 'domain-1',
          excalidraw_data: validExcalidrawData,
          created_at: '2024-01-01T00:00:00Z',
          last_modified_at: '2024-01-01T00:00:00Z',
        });

        const result = await sketchService.parseJSON(json);

        expect(result.id).toBe('sketch-1');
        expect(result.number).toBe(1);
        expect(result.title).toBe('Test Sketch');
        expect(result.sketch_type).toBe('architecture');
        expect(result.status).toBe('draft');
        expect(result.domain_id).toBe('domain-1');
        expect(result.excalidraw_data).toBe(validExcalidrawData);
      });

      it('should handle name field as title alias', async () => {
        const json = JSON.stringify({
          id: 'sketch-1',
          number: 1,
          name: 'Named Sketch',
          sketch_type: 'other',
          status: 'draft',
          excalidraw_data: validExcalidrawData,
        });

        const result = await sketchService.parseJSON(json);

        expect(result.title).toBe('Named Sketch');
        expect(result.name).toBe('Named Sketch');
      });

      it('should apply default values for missing optional fields', async () => {
        const json = JSON.stringify({
          excalidraw_data: validExcalidrawData,
        });

        const result = await sketchService.parseJSON(json);

        expect(result.id).toBeDefined();
        expect(result.number).toBe(1);
        expect(result.title).toBe('Untitled Sketch');
        expect(result.sketch_type).toBe('other');
        expect(result.status).toBe('draft');
        expect(result.domain_id).toBe('');
        expect(result.linked_tables).toEqual([]);
        expect(result.linked_systems).toEqual([]);
      });
    });

    describe('SDK format (camelCase)', () => {
      it('should parse SDK schema format with excalidrawData', async () => {
        const json = JSON.stringify({
          id: 'sketch-1',
          number: 1,
          title: 'SDK Sketch',
          sketchType: 'dataflow',
          status: 'published',
          domainId: 'domain-1',
          workspaceId: 'workspace-1',
          excalidrawData: validExcalidrawData,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        });

        const result = await sketchService.parseJSON(json);

        expect(result.id).toBe('sketch-1');
        expect(result.title).toBe('SDK Sketch');
        expect(result.sketch_type).toBe('dataflow');
        expect(result.status).toBe('published');
        expect(result.domain_id).toBe('domain-1');
        expect(result.workspace_id).toBe('workspace-1');
      });

      it('should handle SDK linkedAssets format', async () => {
        const json = JSON.stringify({
          id: 'sketch-1',
          number: 1,
          title: 'With Assets',
          sketchType: 'other',
          status: 'draft',
          excalidrawData: validExcalidrawData,
          linkedAssets: [{ id: 'table-1', type: 'table', relationship: 'describes' }],
          linkedDecisions: ['decision-1'],
          linkedKnowledge: ['article-1'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        });

        const result = await sketchService.parseJSON(json);

        expect(result.linked_assets).toHaveLength(1);
        expect(result.linked_decisions).toContain('decision-1');
        expect(result.linked_knowledge).toContain('article-1');
      });
    });

    describe('raw Excalidraw format', () => {
      it('should parse raw Excalidraw JSON with elements array', async () => {
        const result = await sketchService.parseJSON(validExcalidrawData);

        expect(result.id).toBeDefined();
        expect(result.title).toBe('Imported Sketch');
        expect(result.sketch_type).toBe('other');
        expect(result.status).toBe('draft');
        expect(result.excalidraw_data).toBe(validExcalidrawData);
      });
    });

    describe('error handling', () => {
      it('should throw error for invalid JSON', async () => {
        await expect(sketchService.parseJSON('not valid json')).rejects.toThrow(
          'Invalid JSON format'
        );
      });

      it('should throw error for missing excalidraw data', async () => {
        const json = JSON.stringify({ id: 'sketch-1', title: 'No data' });

        await expect(sketchService.parseJSON(json)).rejects.toThrow('Invalid sketch format');
      });

      it('should throw error for data exceeding max size', async () => {
        const largeData = 'x'.repeat(60 * 1024 * 1024); // 60MB

        await expect(sketchService.parseJSON(largeData)).rejects.toThrow('exceeds maximum size');
      });
    });
  });

  describe('toJSON', () => {
    it('should export sketch to JSON string', async () => {
      const result = await sketchService.toJSON(mockSketch);
      const parsed = JSON.parse(result);

      expect(parsed.id).toBe('sketch-1');
      expect(parsed.number).toBe(1);
      expect(parsed.title).toBe('Test Sketch');
      expect(parsed.sketch_type).toBe('architecture');
      expect(parsed.status).toBe('draft');
      expect(parsed.domain_id).toBe('domain-1');
      expect(parsed.excalidraw_data).toBe(validExcalidrawData);
      expect(parsed.linked_tables).toEqual(['table-1']);
    });

    it('should include all metadata fields', async () => {
      const result = await sketchService.toJSON(mockSketch);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('created_at');
      expect(parsed).toHaveProperty('last_modified_at');
      expect(parsed).toHaveProperty('linked_systems');
      expect(parsed).toHaveProperty('linked_assets');
      expect(parsed).toHaveProperty('linked_decisions');
      expect(parsed).toHaveProperty('linked_knowledge');
    });
  });

  describe('toSDKJSON', () => {
    it('should export sketch in SDK camelCase format', async () => {
      const result = await sketchService.toSDKJSON(mockSketch);
      const parsed = JSON.parse(result);

      expect(parsed.id).toBe('sketch-1');
      expect(parsed.number).toBe(1);
      expect(parsed.title).toBe('Test Sketch');
      expect(parsed.sketchType).toBe('architecture');
      expect(parsed.status).toBe('draft');
      expect(parsed.domainId).toBe('domain-1');
      expect(parsed.workspaceId).toBe('workspace-1');
      expect(parsed.excalidrawData).toBe(validExcalidrawData);
      expect(parsed.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(parsed.updatedAt).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('toExcalidrawJSON', () => {
    it('should export only Excalidraw data', async () => {
      const result = await sketchService.toExcalidrawJSON(mockSketch);
      const parsed = JSON.parse(result);

      expect(parsed.elements).toBeDefined();
      expect(parsed.appState).toBeDefined();
      expect(parsed.files).toBeDefined();
      expect(parsed.id).toBeUndefined(); // No sketch metadata
      expect(parsed.title).toBeUndefined();
    });

    it('should handle invalid excalidraw_data gracefully', async () => {
      const sketchWithBadData = { ...mockSketch, excalidraw_data: 'not json' };

      const result = await sketchService.toExcalidrawJSON(sketchWithBadData);

      expect(result).toBe('not json');
    });
  });

  describe('validateData', () => {
    it('should validate correct Excalidraw structure', async () => {
      const result = await sketchService.validateData(validExcalidrawData);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should invalidate missing elements array', async () => {
      const data = JSON.stringify({ appState: {}, files: {} });

      const result = await sketchService.validateData(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid "elements" array');
    });

    it('should invalidate non-object appState', async () => {
      const data = JSON.stringify({ elements: [], appState: 'invalid', files: {} });

      const result = await sketchService.validateData(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid "appState" - must be an object');
    });

    it('should invalidate non-object files', async () => {
      const data = JSON.stringify({ elements: [], appState: {}, files: 'invalid' });

      const result = await sketchService.validateData(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid "files" - must be an object');
    });

    it('should return error for invalid JSON', async () => {
      const result = await sketchService.validateData('not json');

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validateSketch', () => {
    it('should validate a correct sketch', async () => {
      const result = await sketchService.validateSketch(mockSketch);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should invalidate missing required fields', async () => {
      const invalidSketch = {
        ...mockSketch,
        id: '',
        title: '',
        number: 0,
      };

      const result = await sketchService.validateSketch(invalidSketch as Sketch);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: id');
      expect(result.errors).toContain('Title is required');
      expect(result.errors).toContain('Number must be >= 1');
    });

    it('should invalidate title exceeding 200 characters', async () => {
      const invalidSketch = {
        ...mockSketch,
        title: 'x'.repeat(201),
      };

      const result = await sketchService.validateSketch(invalidSketch);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title must be 200 characters or less');
    });

    it('should invalidate description exceeding 1000 characters', async () => {
      const invalidSketch = {
        ...mockSketch,
        description: 'x'.repeat(1001),
      };

      const result = await sketchService.validateSketch(invalidSketch);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Description must be 1000 characters or less');
    });
  });

  describe('getElementCount', () => {
    it('should return element count', () => {
      const count = sketchService.getElementCount(validExcalidrawData);
      expect(count).toBe(1);
    });

    it('should return 0 for empty elements', () => {
      const count = sketchService.getElementCount(emptyExcalidrawData);
      expect(count).toBe(0);
    });

    it('should return 0 for invalid JSON', () => {
      const count = sketchService.getElementCount('not json');
      expect(count).toBe(0);
    });
  });

  describe('isEmpty', () => {
    it('should return false for sketch with elements', () => {
      const result = sketchService.isEmpty(validExcalidrawData);
      expect(result).toBe(false);
    });

    it('should return true for empty sketch', () => {
      const result = sketchService.isEmpty(emptyExcalidrawData);
      expect(result).toBe(true);
    });

    it('should return true for invalid JSON', () => {
      const result = sketchService.isEmpty('not json');
      expect(result).toBe(true);
    });
  });

  describe('mergeData', () => {
    it('should merge two Excalidraw data sets', () => {
      const target = JSON.stringify({
        elements: [{ id: 'elem-1' }],
        appState: { zoom: 1 },
        files: { 'file-1': {} },
      });

      const source = JSON.stringify({
        elements: [{ id: 'elem-2' }],
        appState: { zoom: 2 },
        files: { 'file-2': {} },
      });

      const result = sketchService.mergeData(target, source);
      const parsed = JSON.parse(result);

      expect(parsed.elements).toHaveLength(2);
      expect(parsed.elements[0].id).toBe('elem-1');
      expect(parsed.elements[1].id).toBe('elem-2');
      expect(parsed.files['file-1']).toBeDefined();
      expect(parsed.files['file-2']).toBeDefined();
      // appState from target is preserved
      expect(parsed.appState.zoom).toBe(1);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => sketchService.mergeData('not json', '{}')).toThrow(
        'Failed to merge sketch data'
      );
    });
  });

  describe('export methods', () => {
    it('should export to PNG', async () => {
      const result = await sketchService.exportToPNG(validExcalidrawData);

      expect(result).toBeInstanceOf(Blob);
    });

    it('should export to SVG', async () => {
      const result = await sketchService.exportToSVG(validExcalidrawData);

      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('should export sketch based on format option', async () => {
      // PNG
      const pngResult = await sketchService.export(mockSketch, { format: 'png' });
      expect(pngResult).toBeInstanceOf(Blob);

      // SVG
      const svgResult = await sketchService.export(mockSketch, { format: 'svg' });
      expect(typeof svgResult).toBe('string');
      expect(svgResult).toContain('<svg');

      // JSON
      const jsonResult = await sketchService.export(mockSketch, { format: 'json' });
      expect(typeof jsonResult).toBe('string');
      const parsed = JSON.parse(jsonResult as string);
      expect(parsed.elements).toBeDefined();
    });

    it('should throw error for unsupported format', async () => {
      await expect(sketchService.export(mockSketch, { format: 'pdf' as any })).rejects.toThrow(
        'Unsupported export format'
      );
    });
  });

  describe('download methods', () => {
    it('should download blob', () => {
      const createObjectURL = vi.fn().mockReturnValue('blob:url');
      const revokeObjectURL = vi.fn();
      const appendChild = vi.fn();
      const removeChild = vi.fn();
      const click = vi.fn();

      global.URL.createObjectURL = createObjectURL;
      global.URL.revokeObjectURL = revokeObjectURL;

      const mockAnchor = {
        href: '',
        download: '',
        click,
      };

      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(appendChild);
      vi.spyOn(document.body, 'removeChild').mockImplementation(removeChild);

      const blob = new Blob(['test'], { type: 'image/png' });
      sketchService.downloadBlob(blob, 'test.png');

      expect(createObjectURL).toHaveBeenCalledWith(blob);
      expect(mockAnchor.download).toBe('test.png');
      expect(click).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:url');
    });

    it('should download string as file', () => {
      const createObjectURL = vi.fn().mockReturnValue('blob:url');
      const revokeObjectURL = vi.fn();
      const click = vi.fn();

      global.URL.createObjectURL = createObjectURL;
      global.URL.revokeObjectURL = revokeObjectURL;

      const mockAnchor = { href: '', download: '', click };

      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);

      sketchService.downloadString('{"test": true}', 'test.json', 'application/json');

      expect(createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.download).toBe('test.json');
      expect(click).toHaveBeenCalled();
    });
  });
});

/**
 * Sketch Service
 * Handles Excalidraw diagram operations including parsing, validation, and export
 * Works entirely client-side as Excalidraw data is stored as JSON
 * Aligned with SDK v2.1.0 sketch-schema.json
 */

import type { Sketch, SketchExportOptions, SketchType, SketchStatus } from '@/types/sketch';
import { fromSDKSchema, toSDKSchema } from '@/types/sketch';

const MAX_SKETCH_SIZE = 50 * 1024 * 1024; // 50MB (sketches with embedded images can be large)

class SketchService {
  /**
   * Validate sketch data size
   */
  private validateSize(data: string): void {
    if (data.length > MAX_SKETCH_SIZE) {
      throw new Error(`Sketch data exceeds maximum size of ${MAX_SKETCH_SIZE / 1024 / 1024}MB`);
    }
  }

  /**
   * Parse JSON content to Sketch object
   * Handles both SDK schema format (camelCase) and frontend format (snake_case)
   */
  async parseJSON(jsonContent: string): Promise<Sketch> {
    this.validateSize(jsonContent);

    try {
      const parsed = JSON.parse(jsonContent);

      // Handle SDK schema format (camelCase fields like excalidrawData)
      if (parsed.excalidrawData !== undefined) {
        const converted = fromSDKSchema(parsed);
        return {
          id: converted.id || crypto.randomUUID(),
          number: converted.number || 1,
          title: converted.title || 'Untitled Sketch',
          name: converted.title || 'Untitled Sketch', // Backwards compatibility
          sketch_type: converted.sketch_type || 'other',
          status: converted.status || 'draft',
          domain_id: converted.domain_id || '',
          domain: converted.domain,
          workspace_id: converted.workspace_id,
          description: converted.description || '',
          excalidraw_data:
            typeof parsed.excalidrawData === 'string'
              ? parsed.excalidrawData
              : JSON.stringify(parsed.excalidrawData),
          thumbnail: converted.thumbnail,
          thumbnail_path: converted.thumbnail_path,
          authors: converted.authors || [],
          linked_assets: converted.linked_assets || [],
          linked_decisions: converted.linked_decisions || [],
          linked_knowledge: converted.linked_knowledge || [],
          related_sketches: converted.related_sketches || [],
          linked_tables: [],
          linked_systems: [],
          linked_articles: converted.linked_knowledge || [],
          tags: converted.tags || [],
          notes: converted.notes,
          created_at: converted.created_at || new Date().toISOString(),
          last_modified_at: converted.last_modified_at || new Date().toISOString(),
        };
      }

      // Handle frontend format (snake_case fields like excalidraw_data)
      if (parsed.excalidraw_data !== undefined) {
        return {
          id: parsed.id || crypto.randomUUID(),
          number: parsed.number || 1,
          title: parsed.title || parsed.name || 'Untitled Sketch',
          name: parsed.name || parsed.title || 'Untitled Sketch',
          sketch_type: (parsed.sketch_type as SketchType) || 'other',
          status: (parsed.status as SketchStatus) || 'draft',
          domain_id: parsed.domain_id || '',
          domain: parsed.domain,
          workspace_id: parsed.workspace_id,
          description: parsed.description || '',
          excalidraw_data:
            typeof parsed.excalidraw_data === 'string'
              ? parsed.excalidraw_data
              : JSON.stringify(parsed.excalidraw_data),
          thumbnail: parsed.thumbnail,
          thumbnail_path: parsed.thumbnail_path,
          authors: parsed.authors || [],
          linked_assets: parsed.linked_assets || [],
          linked_decisions: parsed.linked_decisions || [],
          linked_knowledge: parsed.linked_knowledge || parsed.linked_articles || [],
          related_sketches: parsed.related_sketches || [],
          linked_tables: parsed.linked_tables || [],
          linked_systems: parsed.linked_systems || [],
          linked_articles: parsed.linked_articles || parsed.linked_knowledge || [],
          tags: parsed.tags || [],
          notes: parsed.notes,
          created_at: parsed.created_at || new Date().toISOString(),
          last_modified_at: parsed.last_modified_at || new Date().toISOString(),
        };
      }

      // Handle raw Excalidraw format (just elements array)
      if (parsed.elements !== undefined) {
        return {
          id: crypto.randomUUID(),
          number: 1,
          title: 'Imported Sketch',
          name: 'Imported Sketch',
          sketch_type: 'other',
          status: 'draft',
          domain_id: '',
          description: '',
          excalidraw_data: jsonContent,
          linked_assets: [],
          linked_decisions: [],
          linked_knowledge: [],
          related_sketches: [],
          linked_tables: [],
          linked_systems: [],
          linked_articles: [],
          tags: [],
          created_at: new Date().toISOString(),
          last_modified_at: new Date().toISOString(),
        };
      }

      throw new Error(
        'Invalid sketch format: missing excalidrawData, excalidraw_data, or elements'
      );
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format');
      }
      throw error;
    }
  }

  /**
   * Export Sketch to JSON string (frontend format with metadata)
   */
  async toJSON(sketch: Sketch): Promise<string> {
    const exportData = {
      id: sketch.id,
      number: sketch.number,
      title: sketch.title || sketch.name,
      sketch_type: sketch.sketch_type,
      status: sketch.status,
      domain_id: sketch.domain_id,
      domain: sketch.domain,
      workspace_id: sketch.workspace_id,
      description: sketch.description,
      excalidraw_data: sketch.excalidraw_data,
      thumbnail_path: sketch.thumbnail_path,
      authors: sketch.authors,
      linked_assets: sketch.linked_assets,
      linked_decisions: sketch.linked_decisions,
      linked_knowledge: sketch.linked_knowledge,
      related_sketches: sketch.related_sketches,
      // Legacy fields for backwards compatibility
      linked_tables: sketch.linked_tables,
      linked_systems: sketch.linked_systems,
      linked_articles: sketch.linked_articles,
      tags: sketch.tags,
      notes: sketch.notes,
      created_at: sketch.created_at,
      last_modified_at: sketch.last_modified_at,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export Sketch to SDK schema format (camelCase)
   */
  async toSDKJSON(sketch: Sketch): Promise<string> {
    const sdkData = toSDKSchema(sketch);
    return JSON.stringify(sdkData, null, 2);
  }

  /**
   * Export raw Excalidraw data (for .excalidraw file format)
   */
  async toExcalidrawJSON(sketch: Sketch): Promise<string> {
    // Return just the Excalidraw data, formatted
    try {
      const data = JSON.parse(sketch.excalidraw_data);
      return JSON.stringify(data, null, 2);
    } catch {
      return sketch.excalidraw_data;
    }
  }

  /**
   * Validate Excalidraw data structure
   */
  async validateData(data: string): Promise<{ valid: boolean; errors?: string[] }> {
    this.validateSize(data);

    try {
      const parsed = JSON.parse(data);
      const errors: string[] = [];

      // Check for required Excalidraw structure
      if (!Array.isArray(parsed.elements)) {
        errors.push('Missing or invalid "elements" array');
      }

      if (parsed.appState !== undefined && typeof parsed.appState !== 'object') {
        errors.push('Invalid "appState" - must be an object');
      }

      if (parsed.files !== undefined && typeof parsed.files !== 'object') {
        errors.push('Invalid "files" - must be an object');
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Invalid JSON'],
      };
    }
  }

  /**
   * Validate sketch metadata against SDK schema
   */
  async validateSketch(sketch: Sketch): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // Required fields
    if (!sketch.id) errors.push('Missing required field: id');
    if (!sketch.number || sketch.number < 1) errors.push('Number must be >= 1');
    if (!sketch.title || sketch.title.length === 0) errors.push('Title is required');
    if (sketch.title && sketch.title.length > 200)
      errors.push('Title must be 200 characters or less');
    if (!sketch.sketch_type) errors.push('Sketch type is required');
    if (!sketch.status) errors.push('Status is required');
    if (!sketch.excalidraw_data) errors.push('Excalidraw data is required');

    // Optional field validation
    if (sketch.description && sketch.description.length > 1000) {
      errors.push('Description must be 1000 characters or less');
    }

    // Validate excalidraw data structure
    const dataValidation = await this.validateData(sketch.excalidraw_data);
    if (!dataValidation.valid && dataValidation.errors) {
      errors.push(...dataValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Generate a thumbnail from Excalidraw data
   * Uses Excalidraw's export utilities when available
   * Returns base64 PNG string or undefined if generation fails
   */
  async generateThumbnail(data: string, width: number = 200): Promise<string | undefined> {
    try {
      // Dynamic import to avoid loading Excalidraw until needed
      const { exportToBlob } = await import('@excalidraw/excalidraw');

      const parsed = JSON.parse(data);
      const elements = parsed.elements || [];

      if (elements.length === 0) {
        return undefined; // No elements to render
      }

      // Export to blob at small size for thumbnail
      const blob = await exportToBlob({
        elements,
        appState: {
          ...parsed.appState,
          exportWithDarkMode: false,
        },
        files: parsed.files || {},
        maxWidthOrHeight: width,
      });

      // Convert blob to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('[SketchService] Failed to generate thumbnail:', error);
      return undefined;
    }
  }

  /**
   * Export sketch to PNG blob
   */
  async exportToPNG(
    data: string,
    options: { scale?: number; background?: boolean } = {}
  ): Promise<Blob> {
    const { exportToBlob } = await import('@excalidraw/excalidraw');

    const parsed = JSON.parse(data);
    const elements = parsed.elements || [];

    return exportToBlob({
      elements,
      appState: {
        ...parsed.appState,
        exportWithDarkMode: false,
        exportBackground: options.background !== false,
      },
      files: parsed.files || {},
      exportPadding: 20,
      quality: 1,
      ...(options.scale ? { maxWidthOrHeight: undefined } : {}),
    });
  }

  /**
   * Export sketch to SVG string
   */
  async exportToSVG(data: string): Promise<string> {
    const { exportToSvg } = await import('@excalidraw/excalidraw');

    const parsed = JSON.parse(data);
    const elements = parsed.elements || [];

    const svg = await exportToSvg({
      elements,
      appState: {
        ...parsed.appState,
        exportWithDarkMode: false,
        exportBackground: true,
      },
      files: parsed.files || {},
      exportPadding: 20,
    });

    return svg.outerHTML;
  }

  /**
   * Export sketch based on options
   */
  async export(sketch: Sketch, options: SketchExportOptions): Promise<Blob | string> {
    switch (options.format) {
      case 'png':
        return this.exportToPNG(sketch.excalidraw_data, {
          scale: options.scale,
          background: options.background,
        });
      case 'svg':
        return this.exportToSVG(sketch.excalidraw_data);
      case 'json':
        return this.toExcalidrawJSON(sketch);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Download a blob as a file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Download a string as a file
   */
  downloadString(content: string, filename: string, mimeType: string = 'application/json'): void {
    const blob = new Blob([content], { type: mimeType });
    this.downloadBlob(blob, filename);
  }

  /**
   * Get element count from Excalidraw data
   */
  getElementCount(data: string): number {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed.elements) ? parsed.elements.length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Check if sketch data is empty (no elements)
   */
  isEmpty(data: string): boolean {
    return this.getElementCount(data) === 0;
  }

  /**
   * Merge two Excalidraw data sets
   * Useful for copying elements between sketches
   */
  mergeData(target: string, source: string): string {
    try {
      const targetParsed = JSON.parse(target);
      const sourceParsed = JSON.parse(source);

      const mergedElements = [...(targetParsed.elements || []), ...(sourceParsed.elements || [])];

      const mergedFiles = {
        ...(targetParsed.files || {}),
        ...(sourceParsed.files || {}),
      };

      return JSON.stringify({
        ...targetParsed,
        elements: mergedElements,
        files: mergedFiles,
      });
    } catch (error) {
      console.error('[SketchService] Failed to merge data:', error);
      throw new Error('Failed to merge sketch data');
    }
  }
}

export const sketchService = new SketchService();

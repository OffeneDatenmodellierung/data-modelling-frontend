/**
 * Type definitions for Sketch entity (Excalidraw diagrams)
 * Aligned with SDK v2.1.0 sketch-schema.json
 * Provides freeform diagramming capabilities alongside structured ERD canvas
 */

import type { Tag } from './decision';

// Re-export Tag for convenience
export type { Tag };

/**
 * Sketch type categorization matching SDK schema
 */
export type SketchType =
  | 'architecture'
  | 'dataflow'
  | 'entity-relationship'
  | 'sequence'
  | 'flowchart'
  | 'wireframe'
  | 'concept'
  | 'infrastructure'
  | 'other';

/**
 * Sketch lifecycle status matching SDK schema
 */
export type SketchStatus = 'draft' | 'review' | 'published' | 'archived';

/**
 * Author information for sketch attribution
 */
export interface SketchAuthor {
  name: string;
  email?: string;
}

/**
 * Linked asset reference with relationship type
 */
export interface LinkedAssetRef {
  id: string; // UUID of the linked asset
  type: 'table' | 'system' | 'asset' | 'product' | 'process' | 'decision';
  relationship?: string; // Optional description of the relationship
}

/**
 * Sketch entity for storing Excalidraw diagrams
 * Aligned with SDK v2.1.0 sketch-schema.json
 */
export interface Sketch {
  // Required fields per SDK schema
  id: string; // UUID - unique identifier
  number: number; // Sequential number within domain/workspace (min 1)
  title: string; // 1-200 chars, display name
  sketch_type: SketchType; // Category of the sketch
  status: SketchStatus; // Lifecycle status
  excalidraw_data: string; // JSON string of Excalidraw elements and state
  created_at: string; // ISO timestamp
  last_modified_at: string; // ISO timestamp (updatedAt in SDK)

  // Optional organizational fields
  domain_id?: string; // UUID - domain this sketch belongs to (domainId in SDK)
  domain?: string; // Domain name for display
  workspace_id?: string; // UUID - workspace this sketch belongs to

  // Optional metadata
  description?: string; // Up to 1000 chars
  thumbnail_path?: string; // Path to PNG thumbnail file
  thumbnail?: string; // Base64 PNG thumbnail for previews (frontend convenience)

  // Attribution
  authors?: SketchAuthor[];

  // Linked resources (SDK uses linkedAssets with relationship types)
  linked_assets?: LinkedAssetRef[]; // Structured asset references
  linked_decisions?: string[]; // Array of decision record IDs
  linked_knowledge?: string[]; // Array of knowledge article IDs
  related_sketches?: string[]; // Array of related sketch IDs

  // Legacy linked fields (kept for backwards compatibility)
  linked_tables?: string[]; // Array of table IDs this sketch relates to
  linked_systems?: string[]; // Array of system IDs
  linked_articles?: string[]; // Array of knowledge article IDs (alias for linked_knowledge)

  // Categorization
  tags?: Tag[];
  notes?: string; // Additional commentary

  // Deprecated - use title instead
  name?: string; // Alias for title (backwards compatibility)
}

/**
 * Excalidraw export format options
 */
export type SketchExportFormat = 'png' | 'svg' | 'json';

/**
 * Options for exporting sketches
 */
export interface SketchExportOptions {
  format: SketchExportFormat;
  scale?: number; // For PNG export (default 2x for retina)
  background?: boolean; // Include background in export
  padding?: number; // Padding around content in pixels
}

/**
 * Sketch filter options for list views
 */
export interface SketchFilter {
  search?: string; // Search term for title/description
  tags?: string[]; // Filter by tag names
  domain_id?: string; // Filter by domain
  status?: SketchStatus; // Filter by lifecycle status
  sketch_type?: SketchType; // Filter by sketch type
  linked_table_id?: string; // Filter by linked table
  linked_system_id?: string; // Filter by linked system
}

/**
 * Minimal sketch data for list views (without full excalidraw_data)
 */
export interface SketchListItem {
  id: string;
  number: number;
  title: string;
  domain_id?: string;
  sketch_type: SketchType;
  status: SketchStatus;
  description?: string;
  thumbnail?: string;
  thumbnail_path?: string;
  tags?: Tag[];
  authors?: SketchAuthor[];
  created_at: string;
  last_modified_at: string;
  // Deprecated alias
  name?: string;
}

/**
 * Get the next sketch number for a domain
 */
export function getNextSketchNumber(existingSketches: Sketch[], domainId?: string): number {
  const domainSketches = domainId
    ? existingSketches.filter((s) => s.domain_id === domainId)
    : existingSketches;

  if (domainSketches.length === 0) return 1;

  const maxNumber = Math.max(...domainSketches.map((s) => s.number || 0));
  return maxNumber + 1;
}

/**
 * Create a new sketch with default values
 * Aligned with SDK v2.1.0 schema
 */
export function createNewSketch(
  domainId: string,
  title: string = 'Untitled Sketch',
  workspaceId?: string,
  number: number = 1
): Omit<Sketch, 'id'> {
  const now = new Date().toISOString();
  return {
    number,
    title,
    name: title, // Backwards compatibility alias
    sketch_type: 'other',
    status: 'draft',
    domain_id: domainId,
    workspace_id: workspaceId,
    description: '',
    excalidraw_data: JSON.stringify({
      elements: [],
      appState: {
        viewBackgroundColor: '#ffffff',
        gridSize: null,
      },
      files: {},
    }),
    linked_assets: [],
    linked_decisions: [],
    linked_knowledge: [],
    related_sketches: [],
    linked_tables: [],
    linked_systems: [],
    linked_articles: [],
    tags: [],
    created_at: now,
    last_modified_at: now,
  };
}

/**
 * Generate a safe filename for sketch export
 */
export function generateSketchFilename(title: string, format: SketchExportFormat): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
  return `${slug}.${format}`;
}

/**
 * Get display label for export format
 */
export function getExportFormatLabel(format: SketchExportFormat): string {
  const labels: Record<SketchExportFormat, string> = {
    png: 'PNG Image',
    svg: 'SVG Vector',
    json: 'Excalidraw JSON',
  };
  return labels[format];
}

/**
 * Get display label for sketch type
 */
export function getSketchTypeLabel(type: SketchType): string {
  const labels: Record<SketchType, string> = {
    architecture: 'Architecture',
    dataflow: 'Data Flow',
    'entity-relationship': 'Entity Relationship',
    sequence: 'Sequence',
    flowchart: 'Flowchart',
    wireframe: 'Wireframe',
    concept: 'Concept',
    infrastructure: 'Infrastructure',
    other: 'Other',
  };
  return labels[type];
}

/**
 * Get display label for sketch status
 */
export function getSketchStatusLabel(status: SketchStatus): string {
  const labels: Record<SketchStatus, string> = {
    draft: 'Draft',
    review: 'In Review',
    published: 'Published',
    archived: 'Archived',
  };
  return labels[status];
}

/**
 * Get status color for UI display
 */
export function getSketchStatusColor(
  status: SketchStatus
): 'gray' | 'yellow' | 'green' | 'neutral' {
  const colors: Record<SketchStatus, 'gray' | 'yellow' | 'green' | 'neutral'> = {
    draft: 'gray',
    review: 'yellow',
    published: 'green',
    archived: 'neutral',
  };
  return colors[status];
}

/**
 * Validate sketch title
 */
export function validateSketchTitle(title: string): { valid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: 'Title is required' };
  }
  if (title.length > 200) {
    return { valid: false, error: 'Title must be 200 characters or less' };
  }
  return { valid: true };
}

/**
 * Validate sketch name (alias for validateSketchTitle for backwards compatibility)
 */
export function validateSketchName(name: string): { valid: boolean; error?: string } {
  return validateSketchTitle(name);
}

/**
 * Parse Excalidraw data from JSON string
 * Returns null if parsing fails
 */
export function parseExcalidrawData(data: string): {
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
} | null {
  try {
    const parsed = JSON.parse(data);
    return {
      elements: parsed.elements || [],
      appState: parsed.appState || {},
      files: parsed.files || {},
    };
  } catch {
    return null;
  }
}

/**
 * Check if excalidraw data is empty (no elements)
 */
export function isSketchEmpty(data: string): boolean {
  const parsed = parseExcalidrawData(data);
  if (!parsed) return true;
  return parsed.elements.length === 0;
}

/**
 * Convert SDK schema field names to frontend field names
 */
export function fromSDKSchema(sdkSketch: Record<string, unknown>): Partial<Sketch> {
  return {
    id: sdkSketch.id as string,
    number: sdkSketch.number as number,
    title: sdkSketch.title as string,
    name: sdkSketch.title as string, // Alias
    sketch_type: (sdkSketch.sketchType as SketchType) || 'other',
    status: (sdkSketch.status as SketchStatus) || 'draft',
    excalidraw_data: sdkSketch.excalidrawData as string,
    domain_id: sdkSketch.domainId as string | undefined,
    domain: sdkSketch.domain as string | undefined,
    workspace_id: sdkSketch.workspaceId as string | undefined,
    description: sdkSketch.description as string | undefined,
    thumbnail_path: sdkSketch.thumbnailPath as string | undefined,
    authors: sdkSketch.authors as SketchAuthor[] | undefined,
    linked_assets: sdkSketch.linkedAssets as LinkedAssetRef[] | undefined,
    linked_decisions: sdkSketch.linkedDecisions as string[] | undefined,
    linked_knowledge: sdkSketch.linkedKnowledge as string[] | undefined,
    related_sketches: sdkSketch.relatedSketches as string[] | undefined,
    tags: sdkSketch.tags as Tag[] | undefined,
    notes: sdkSketch.notes as string | undefined,
    created_at: sdkSketch.createdAt as string,
    last_modified_at: sdkSketch.updatedAt as string,
  };
}

/**
 * Convert frontend field names to SDK schema field names
 */
export function toSDKSchema(sketch: Sketch): Record<string, unknown> {
  return {
    id: sketch.id,
    number: sketch.number,
    title: sketch.title || sketch.name,
    sketchType: sketch.sketch_type,
    status: sketch.status,
    excalidrawData: sketch.excalidraw_data,
    domainId: sketch.domain_id,
    domain: sketch.domain,
    workspaceId: sketch.workspace_id,
    description: sketch.description,
    thumbnailPath: sketch.thumbnail_path,
    authors: sketch.authors,
    linkedAssets: sketch.linked_assets,
    linkedDecisions: sketch.linked_decisions,
    linkedKnowledge: sketch.linked_knowledge || sketch.linked_articles,
    relatedSketches: sketch.related_sketches,
    tags: sketch.tags,
    notes: sketch.notes,
    createdAt: sketch.created_at,
    updatedAt: sketch.last_modified_at,
  };
}

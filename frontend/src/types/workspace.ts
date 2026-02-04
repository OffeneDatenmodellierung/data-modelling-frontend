/**
 * Type definitions for Workspace entity
 * Updated for SDK 2.3.0+
 */

import type { Domain, ViewPositions, SharedResourceReference } from './domain';
import type { System, SystemType } from './system';
import type { Owner } from './table';
import type {
  ForeignKeyDetails,
  ETLJobMetadata,
  VisualMetadata,
  ContactDetails,
  SLAProperty,
  FlowDirection,
} from './relationship';

export interface Workspace {
  id: string; // UUID
  name: string; // max 255 chars
  description?: string; // Workspace description (from README.md)
  owner_id: string; // UUID
  created_at: string; // ISO timestamp
  last_modified_at: string; // ISO timestamp
  domains?: Domain[];
}

/**
 * Workspace metadata stored in workspace.yaml (v1 format - folder-based)
 * Contains domain IDs to avoid regenerating them on each load
 */
export interface WorkspaceMetadata {
  id: string; // UUID
  name: string;
  created_at: string; // ISO timestamp
  last_modified_at: string; // ISO timestamp
  domains: Array<{
    id: string; // UUID
    name: string;
  }>;
}

/**
 * WorkspaceV2 - Flat file format matching SDK workspace-schema.json
 * Single {workspace}.workspace.yaml file containing all workspace structure
 */
export interface WorkspaceV2 {
  // Required fields (per SDK schema)
  id: string; // UUID - unique workspace identifier
  name: string; // Alphanumeric with hyphens/underscores, max 255 chars
  owner_id: string; // UUID - creator's user identifier
  created_at: string; // ISO 8601 timestamp
  last_modified_at: string; // ISO 8601 timestamp

  // Optional fields
  description?: string;
  domains?: DomainV2[]; // Domain references with nested systems
  assets?: AssetReference[]; // Asset references belonging to workspace
  relationships?: RelationshipV2[]; // Connections between assets
}

/**
 * AssetReference - Reference to an asset file in the workspace
 * Matches SDK schema AssetReference definition
 */
export interface AssetReference {
  id: string; // UUID
  name: string; // Asset title
  domain: string; // Parent domain name
  system?: string; // Parent system name (optional)
  asset_type: 'odcs' | 'odps' | 'cads' | 'bpmn' | 'dmn' | 'openapi';
  file_path?: string; // Generated filename following convention
}

/**
 * RelationshipV2 - Relationship definition matching SDK schema (SDK 2.3.0+)
 * Supports crow's feet notation with EndpointCardinality and FlowDirection
 */
export interface RelationshipV2 {
  id: string; // UUID
  source_table_id: string; // UUID - origin asset
  target_table_id: string; // UUID - destination asset
  cardinality?: 'one_to_one' | 'one_to_many' | 'many_to_many';
  source_optional?: boolean;
  target_optional?: boolean;
  relationship_type?: 'foreign_key' | 'data_flow' | 'dependency' | 'etl';
  notes?: string;
  owner?: string;
  color?: string; // Hex or named color for visualization

  // SDK 2.3.0+ fields
  source_key?: string; // UUID reference to source column/compound key
  target_key?: string; // UUID reference to target column/compound key
  label?: string; // Display label for relationship
  flow_direction?: FlowDirection; // Direction of data flow
  infrastructure_type?: string; // Infrastructure classification
  source_handle?: string; // ReactFlow handle ID for source connection
  target_handle?: string; // ReactFlow handle ID for target connection
  foreign_key_details?: ForeignKeyDetails; // Column-level FK mapping
  etl_job_metadata?: ETLJobMetadata; // ETL job info
  visual_metadata?: VisualMetadata; // Waypoints, label positions
  contact_details?: ContactDetails; // Owner contact info
  sla?: SLAProperty[]; // SLA properties
}

/**
 * DomainV2 - Domain definition matching SDK schema DomainReference (SDK 2.3.0+)
 */
export interface DomainV2 {
  // Required fields (per SDK schema)
  id: string; // UUID
  name: string; // Filename-compatible name

  // Optional fields
  description?: string;
  owner?: Owner; // Domain owner (SDK 2.3.0+)
  systems?: SystemV2[]; // Nested system references
  view_positions?: ViewPositions; // Canvas positions for nodes per view mode

  // SDK 2.3.0+ fields for resource management
  shared_resources?: SharedResourceReference[]; // Cross-domain resource sharing
  transformation_links?: TransformationLinkV2[]; // BPMN-to-table mappings for ETL view
  table_visibility?: TableVisibilityV2[]; // Cross-domain table visibility settings
}

/**
 * TransformationLinkV2 - Data transformation link within a domain (SDK 2.3.0+)
 * Links BPMN processes to tables for ETL view visualization
 */
export interface TransformationLinkV2 {
  id: string; // UUID
  name?: string; // Optional name
  transformation_type?: string; // Type of transformation
  bpmn_process_id?: string; // UUID of the BPMN process
  source_table_id: string; // UUID of source table
  target_table_id: string; // UUID of target table
  metadata?: Record<string, unknown>; // Additional transformation metadata
  bpmn_element_id?: string; // Reference to specific BPMN element
  url?: string; // Optional URL reference
  description?: string; // Optional description
}

/**
 * TableVisibilityV2 - Table visibility setting for a domain (SDK 2.3.0+)
 */
export interface TableVisibilityV2 {
  table_id: string; // UUID of the table
  visibility: 'public' | 'domainOnly' | 'hidden'; // Visibility level
  visible_in_domains?: string[]; // Array of domain UUIDs where this table is visible
}

/**
 * SystemV2 - System definition matching SDK schema SystemReference (SDK 2.3.0+)
 * Includes DataFlow metadata (owner, SLA, contact_details, infrastructure_type)
 */
export interface SystemV2 {
  // Required fields (per SDK schema)
  id: string; // UUID
  name: string; // Filename-compatible name

  // Optional fields
  description?: string;
  system_type?: SystemType; // Database/system type (SDK 2.3.0+)
  connection_string?: string; // Connection URL (SDK 2.3.0+)
  table_ids?: string[]; // UUIDs of tables belonging to this system
  asset_ids?: string[]; // UUIDs of compute assets belonging to this system

  // SDK 2.3.0+ DataFlow metadata fields
  owner?: Owner; // System owner
  sla?: SLAProperty[]; // SLA properties
  contact_details?: ContactDetails; // Contact information
  infrastructure_type?: string; // Infrastructure classification
  notes?: string; // Additional notes
  version?: string; // Version tracking
}

/**
 * @deprecated Use DomainV2 instead - kept for backward compatibility during migration
 */
export interface DomainV2Legacy {
  id: string; // UUID
  name: string;
  description?: string;
  owner?: Owner;
  view_positions?: ViewPositions;
  created_at?: string;
  last_modified_at?: string;
  systems: System[];
  tables?: string[];
  products?: string[];
  assets?: string[];
  processes?: string[];
  decisions?: string[];
  tags?: Array<{ key?: string; value: string }>;
}

/**
 * Parsed filename structure for flat file naming convention
 */
export interface ParsedFileName {
  workspace: string;
  domain?: string;
  system?: string;
  resource?: string;
  type: 'workspace' | 'odcs' | 'odps' | 'cads' | 'bpmn' | 'dmn';
}

/**
 * Categorized workspace files by type
 */
export interface CategorizedFiles {
  workspace?: string;
  odcs: string[];
  odps: string[];
  cads: string[];
  bpmn: string[];
  dmn: string[];
  kb: string[]; // Knowledge base articles (.kb.yaml)
  adr: string[]; // Architecture decision records (.adr.yaml)
  sketch: string[]; // Excalidraw sketches (.sketch.json)
}

/**
 * Files filtered by domain
 */
export interface DomainFiles {
  odcs: File[];
  odps: File[];
  cads: File[];
  bpmn: File[];
  dmn: File[];
  kb: File[]; // Knowledge base articles (.kb.yaml)
  adr: File[]; // Architecture decision records (.adr.yaml)
  sketch: File[]; // Excalidraw sketches (.sketch.json)
}

// Legacy ModelType - deprecated, kept for backward compatibility
// New architecture uses business domains, not model-type domains
export type ModelType = 'conceptual' | 'logical' | 'physical';

// Note: Table and Relationship types are defined in separate files
// Import them when needed: import type { Table } from './table';

/**
 * Type definitions for Domain entity (SDK 1.5.0 Domain-Centric Architecture)
 */

import type { Owner } from './table';

export interface ViewPositions {
  [viewMode: string]: {
    [entityId: string]: {
      x: number;
      y: number;
    };
  };
}

export interface Domain {
  id: string; // UUID
  workspace_id: string; // UUID
  name: string; // max 255 chars, unique within workspace
  description?: string;
  owner?: Owner;
  created_at: string; // ISO timestamp
  last_modified_at: string; // ISO timestamp
  
  // Domain contains multiple asset types (loaded separately)
  systems?: string[]; // Array of system IDs
  tables?: string[]; // Array of table IDs (ODCS)
  products?: string[]; // Array of product IDs (ODPS)
  assets?: string[]; // Array of compute asset IDs (CADS)
  processes?: string[]; // Array of BPMN process IDs
  decisions?: string[]; // Array of DMN decision IDs
  
  // Canvas positions per view mode
  view_positions?: ViewPositions; // Positions for tables, systems, and assets per view (systems, process, operational, analytical, products)
  
  // Folder path tracking (for offline mode)
  folder_path?: string; // Path to domain folder (e.g., "/path/to/workspace/domain-name")
  workspace_path?: string; // Path to workspace root folder (e.g., "/path/to/workspace")
}

export interface DomainDefinition {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  owner?: Owner;
  created_at: string;
  last_modified_at: string;
}



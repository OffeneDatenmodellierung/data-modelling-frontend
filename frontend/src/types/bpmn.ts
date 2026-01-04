/**
 * Type definitions for BPMN Process entity
 */

export interface BPMNProcess {
  id: string; // UUID
  domain_id: string; // UUID
  name: string; // max 255 chars, unique within domain
  bpmn_xml: string; // BPMN 2.0 XML content
  linked_assets?: string[]; // Array of CADS asset IDs
  transformation_links?: TransformationLink[];
  created_at: string; // ISO timestamp
  last_modified_at: string; // ISO timestamp
}

export interface TransformationLink {
  id: string; // UUID
  source_table_id: string; // UUID
  target_table_id: string; // UUID
  metadata?: Record<string, unknown>; // Transformation metadata
  bpmn_element_id?: string; // Reference to BPMN element (task, gateway, etc.)
}

export interface BPMNElement {
  id: string;
  type: 'task' | 'gateway' | 'event' | 'dataObject' | 'dataStore';
  name?: string;
  [key: string]: unknown; // Additional BPMN element properties
}




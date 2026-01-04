/**
 * Type definitions for ODPS (Open Data Product Standard) Data Product entity
 */

export interface DataProduct {
  id: string; // UUID
  domain_id: string; // UUID
  name: string; // max 255 chars, unique within domain
  description?: string;
  linked_tables: string[]; // Array of ODCS table IDs
  input_ports?: ODPSInputPort[];
  output_ports?: ODPSOutputPort[];
  support?: ODPSSupport;
  team?: string;
  status?: 'draft' | 'published' | 'deprecated';
  custom_properties?: Record<string, unknown>;
  created_at: string; // ISO timestamp
  last_modified_at: string; // ISO timestamp
}

export interface ODPSInputPort {
  name: string;
  table_id: string; // UUID reference to ODCS table
  description?: string;
}

export interface ODPSOutputPort {
  name: string;
  table_id: string; // UUID reference to ODCS table
  description?: string;
}

export interface ODPSSupport {
  team?: string;
  contact?: string;
  slack_channel?: string;
  documentation_url?: string;
}




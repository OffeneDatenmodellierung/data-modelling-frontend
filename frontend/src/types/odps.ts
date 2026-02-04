/**
 * Type definitions for ODPS (Open Data Product Standard) Data Product entity
 * Updated for SDK 2.3.0+
 */

import type { Owner, Role, SupportChannel, Pricing } from './table';

/**
 * ODPS Status following product lifecycle
 */
export type ODPSStatus = 'draft' | 'published' | 'deprecated' | 'retired';

/**
 * Server/endpoint configuration for data product access
 */
export interface ODPSServer {
  url: string; // Server URL
  environment?: string; // e.g., "production", "staging"
  description?: string;
}

/**
 * Service level agreement for data product
 */
export interface ODPSServiceLevel {
  objective: string; // SLA objective name
  value: string; // SLA value
  unit?: string; // Unit of measure
  description?: string;
}

/**
 * Terms and conditions for data product usage
 */
export interface ODPSTerms {
  usage?: string; // Usage terms
  limitations?: string; // Usage limitations
  billing?: string; // Billing terms
  description?: string;
}

/**
 * Link/reference associated with data product
 */
export interface ODPSLink {
  rel: string; // Relationship type (e.g., "documentation", "support")
  href: string; // URL
  title?: string; // Display title
  description?: string;
}

/**
 * Management port for data product operations
 */
export interface ODPSManagementPort {
  name: string;
  description?: string;
  type?: string; // e.g., "metrics", "health", "admin"
  url?: string;
}

export interface DataProduct {
  id: string; // UUID
  domain_id: string; // UUID
  name: string; // max 255 chars, unique within domain
  description?: string;
  linked_tables: string[]; // Array of ODCS table IDs
  input_ports?: ODPSInputPort[];
  output_ports?: ODPSOutputPort[];
  management_ports?: ODPSManagementPort[]; // SDK 2.3.0+ - Management/admin ports
  support?: ODPSSupport;
  team?: string; // Simple team name for display (backward compatible)
  team_members?: ODPSTeamMember[]; // SDK 2.3.0+ - Full team structure with roles
  status?: ODPSStatus;
  custom_properties?: Record<string, unknown>;
  created_at: string; // ISO timestamp
  last_modified_at: string; // ISO timestamp

  // SDK 2.3.0+ fields
  tenant?: string; // Tenant/organization identifier
  owner?: Owner; // Data product owner
  roles?: Role[]; // Access roles
  servers?: ODPSServer[]; // Server endpoints
  service_levels?: ODPSServiceLevel[]; // SLA definitions
  pricing?: Pricing; // Pricing information
  terms?: ODPSTerms; // Terms and conditions
  links?: ODPSLink[]; // Related links

  // Store raw ODPS data for round-trip preservation
  _odps_raw?: unknown; // Full ODPS structure as parsed from YAML
}

export interface ODPSInputPort {
  name: string;
  table_id?: string; // UUID reference to ODCS table
  contract_id?: string; // UUID reference to ODCS contract
  version?: string; // Contract version
  description?: string;
}

export interface ODPSOutputPort {
  name: string;
  table_id?: string; // UUID reference to ODCS table
  contract_id?: string; // UUID reference to ODCS contract
  version?: string; // Contract version
  description?: string;
}

export interface ODPSSupport {
  team?: string;
  contact?: string;
  slack_channel?: string;
  documentation_url?: string;
  channels?: SupportChannel[]; // SDK 2.3.0+ - Full support channel support
}

/**
 * ODPS Team Member (SDK 2.3.0+)
 * Extended team member with role and history tracking
 */
export interface ODPSTeamMember {
  username?: string;
  name?: string;
  email?: string;
  role?: string;
  dateIn?: string; // ISO date
  dateOut?: string; // ISO date
  replacedByUsername?: string;
  comment?: string;
}

# Data Model: SDK 1.5.0 Domain-Centric Architecture

**Date**: 2025-01-27  
**Feature**: SDK 1.5.0 Domain-Centric Migration  
**Phase**: 1 - Design & Contracts

## Overview

This document defines the data model for the domain-centric architecture aligned with SDK 1.5.0. The model replaces the old Conceptual/Logical/Physical model-type domains with business domains containing multiple asset types.

---

## Core Entities

### Workspace

**Purpose**: Top-level container for all data modeling work

**Properties**:
- `id: string` (UUID) - Unique identifier
- `name: string` (max 255 chars) - Workspace name
- `type: 'personal' | 'shared'` - Workspace visibility
- `owner_id: string` (UUID) - Owner user ID
- `created_at: string` (ISO timestamp)
- `last_modified_at: string` (ISO timestamp)

**Relationships**:
- Contains multiple `Domain` entities
- Owned by one `User` (via `owner_id`)

**Validation Rules**:
- Name must be unique per owner (for personal workspaces)
- Name cannot be empty
- Type must be either 'personal' or 'shared'

**State Transitions**:
- Created → Active (on creation)
- Active → Archived (user action, future feature)
- Personal → Shared (user action, FR-112)

---

### Domain

**Purpose**: Business domain container organizing all asset types

**Properties**:
- `id: string` (UUID) - Unique identifier
- `workspace_id: string` (UUID) - Parent workspace
- `name: string` (max 255 chars) - Domain name (e.g., "Customer Service", "Order Processing")
- `description?: string` - Domain description
- `owner?: Owner` - Domain owner information
- `created_at: string` (ISO timestamp)
- `last_modified_at: string` (ISO timestamp)

**Relationships**:
- Belongs to one `Workspace` (via `workspace_id`)
- Contains multiple `Table` entities (ODCS)
- Contains multiple `DataProduct` entities (ODPS)
- Contains multiple `ComputeAsset` entities (CADS)
- Contains multiple `BPMNProcess` entities
- Contains multiple `DMNDecision` entities

**Validation Rules**:
- Name must be unique within workspace
- Name cannot be empty
- At least one domain required per workspace

**State Transitions**:
- Created → Active (on creation)
- Active → Deleted (user action, cannot delete last domain)

**File Storage**:
- Stored as `domain.yaml` in domain folder
- Contains domain metadata and references to asset files

---

### Table (ODCS)

**Purpose**: Data contract/table definition following ODCS 3.1.0 specification

**Properties**:
- `id: string` (UUID) - Unique identifier
- `workspace_id: string` (UUID) - Parent workspace
- `primary_domain_id: string` (UUID) - Domain where table is editable
- `name: string` (max 255 chars) - Table name, unique within workspace
- `alias?: string` (max 255 chars) - Optional alias
- `description?: string` - Table description
- `tags?: string[]` - Categorization tags (Simple, Pair, or List format)
- `model_type: 'conceptual' | 'logical' | 'physical'` - Legacy field (deprecated, kept for compatibility)
- `columns: Column[]` - Column definitions
- `compound_keys?: CompoundKey[]` - Compound key definitions
- `position_x: number` - Canvas X position
- `position_y: number` - Canvas Y position
- `width: number` - Canvas width (default 200)
- `height: number` - Canvas height (default 150)
- `visible_domains: string[]` - Array of domain UUIDs where table is visible
- `data_level?: 'operational' | 'bronze' | 'silver' | 'gold'` - Data quality tier
- `is_owned_by_domain: boolean` - True if owned by current domain (for cross-domain viewing)
- `owner?: Owner` - Table owner information (ODCS)
- `sla?: SLA` - Service level agreement (ODCS)
- `metadata?: Record<string, unknown>` - Custom metadata (includes `quality_tier`, `data_modeling_method`)
- `quality_rules?: Record<string, unknown>` - Table-level quality rules (ODCS)
- `created_at: string` (ISO timestamp)
- `last_modified_at: string` (ISO timestamp)

**Relationships**:
- Belongs to one `Workspace` (via `workspace_id`)
- Owned by one `Domain` (via `primary_domain_id`)
- Visible on multiple `Domain` entities (via `visible_domains`)
- Contains multiple `Column` entities
- Participates in multiple `Relationship` entities (as source or target)
- Can be linked to `DataProduct` entities (via ODPS `linked_tables`)
- Can be linked to `BPMNProcess` entities (via transformation links)

**Validation Rules**:
- Name must be unique within workspace
- Name must be alphanumeric with underscores only
- At least one column required
- `primary_domain_id` must reference valid domain in workspace
- All `visible_domains` must reference valid domains in workspace
- `data_level` must be one of: 'operational', 'bronze', 'silver', 'gold'

**State Transitions**:
- Created → Active (on creation)
- Active → Deleted (user action)
- Data level can change: operational ↔ bronze ↔ silver ↔ gold

**File Storage**:
- Stored as `{table-name}.odcs.yaml` in domain folder
- Follows ODCS 3.1.0 specification

---

### Column

**Purpose**: Column/attribute definition within a table

**Properties**:
- `id: string` (UUID) - Unique identifier
- `table_id: string` (UUID) - Parent table
- `name: string` (max 255 chars) - Column name, unique within table
- `data_type: string` - Data type (e.g., "VARCHAR", "INTEGER", "BIGINT")
- `nullable: boolean` - Whether column allows NULL (default false)
- `is_primary_key: boolean` - Whether column is part of primary key (default false)
- `is_foreign_key: boolean` - Whether column is a foreign key (default false)
- `foreign_key_reference?: string` (UUID) - Referenced Column ID
- `default_value?: string` - Default value
- `constraints?: Record<string, unknown>` - JSON object with constraint definitions and quality rules
- `description?: string` - Column description (ODCS)
- `quality_rules?: Record<string, unknown>` - Column-level quality rules (ODCS, includes `quality` array)
- `order: number` - Display order
- `compound_key_id?: string` (UUID) - ID of compound key this column belongs to
- `compound_key_order?: number` - Order within compound key
- `created_at: string` (ISO timestamp)

**Relationships**:
- Belongs to one `Table` (via `table_id`)
- Can reference one `Column` (via `foreign_key_reference`)
- Can belong to one `CompoundKey` (via `compound_key_id`)

**Validation Rules**:
- Name must be unique within table
- Name must be alphanumeric with underscores only
- `foreign_key_reference` must reference valid column in same or different table
- `compound_key_id` must reference valid compound key in same table
- If `is_primary_key` is true, column cannot be nullable

**State Transitions**:
- Created → Active (on creation)
- Active → Deleted (user action)
- Can be added to/removed from compound keys

---

### CompoundKey

**Purpose**: Compound key definition (multiple columns forming a key)

**Properties**:
- `id: string` (UUID) - Unique identifier
- `table_id: string` (UUID) - Parent table
- `name?: string` - Optional name for the compound key
- `column_ids: string[]` (UUIDs) - IDs of columns forming the compound key
- `is_primary: boolean` - True if it's a primary key, false for unique key
- `created_at: string` (ISO timestamp)

**Relationships**:
- Belongs to one `Table` (via `table_id`)
- Contains multiple `Column` entities (via `column_ids`)

**Validation Rules**:
- Must have at least 2 columns
- All `column_ids` must reference valid columns in same table
- Only one primary compound key allowed per table
- Column cannot belong to multiple compound keys simultaneously

---

### Relationship

**Purpose**: Relationship between two tables

**Properties**:
- `id: string` (UUID) - Unique identifier
- `workspace_id: string` (UUID) - Parent workspace
- `domain_id: string` (UUID) - Domain where relationship is defined
- `source_table_id: string` (UUID) - Source table
- `target_table_id: string` (UUID) - Target table
- `cardinality: 'one-to-one' | 'one-to-many' | 'many-to-many'` - Relationship cardinality
- `optionality: 'required' | 'optional'` - Whether relationship is required
- `name?: string` - Optional relationship name
- `created_at: string` (ISO timestamp)
- `last_modified_at: string` (ISO timestamp)

**Relationships**:
- Belongs to one `Workspace` (via `workspace_id`)
- Defined in one `Domain` (via `domain_id`)
- Connects two `Table` entities (source and target)

**Validation Rules**:
- `source_table_id` and `target_table_id` must reference valid tables in workspace
- Cannot create relationship to non-existent table
- Circular relationships allowed but system displays warning
- Both tables must be visible in the domain where relationship is created

**State Transitions**:
- Created → Active (on creation)
- Active → Deleted (user action)

**File Storage**:
- Stored in SDK relationship format (separate from ODCS tables)
- Included in domain export

---

### DataProduct (ODPS)

**Purpose**: Data product linking multiple ODCS tables

**Properties**:
- `id: string` (UUID) - Unique identifier
- `domain_id: string` (UUID) - Parent domain
- `name: string` (max 255 chars) - Product name
- `description?: string` - Product description
- `linked_tables: string[]` (UUIDs) - References to ODCS table IDs
- `input_ports?: ODPSInputPort[]` - Input ports (ODPS format)
- `output_ports?: ODPSOutputPort[]` - Output ports (ODPS format)
- `support?: ODPSSupport` - Support information (ODPS format)
- `team?: string` - Team responsible for product
- `status?: 'draft' | 'published' | 'deprecated'` - Product status (ODPS)
- `custom_properties?: Record<string, unknown>` - Custom properties (ODPS)
- `created_at: string` (ISO timestamp)
- `last_modified_at: string` (ISO timestamp)

**Relationships**:
- Belongs to one `Domain` (via `domain_id`)
- Links to multiple `Table` entities (via `linked_tables`)

**Validation Rules**:
- Name must be unique within domain
- Name cannot be empty
- At least one `linked_table` required
- All `linked_tables` must reference valid tables in workspace

**State Transitions**:
- Created → Draft (on creation)
- Draft → Published (user action)
- Published → Deprecated (user action)

**File Storage**:
- Stored as `{product-name}.odps.yaml` in domain folder
- Follows ODPS specification

---

### ComputeAsset (CADS)

**Purpose**: AI/ML model or application (also referred to as CARD nodes)

**Properties**:
- `id: string` (UUID) - Unique identifier
- `domain_id: string` (UUID) - Parent domain
- `name: string` (max 255 chars) - Asset name
- `type: 'ai' | 'ml' | 'app'` - Asset type
- `description?: string` - Asset description
- `owner?: Owner` - Asset owner information
- `engineering_team?: string` - Engineering team responsible
- `source_repo?: string` - Source code repository URL
- `bpmn_link?: string` (UUID) - Reference to BPMN process showing logic within asset
- `dmn_link?: string` (UUID) - Optional reference to DMN decision
- `bpmn_models?: CADSBPMNModel[]` - CADS references to BPMN models
- `dmn_models?: CADSDMNModel[]` - CADS references to DMN models
- `openapi_specs?: CADSOpenAPISpec[]` - CADS references to OpenAPI specs
- `status?: 'development' | 'production' | 'deprecated'` - Asset status (CADS)
- `kind?: CADSKind` - CADS asset kind (AIModel, MLPipeline, Application, etc.)
- `custom_properties?: Record<string, unknown>` - Custom properties (CADS)
- `created_at: string` (ISO timestamp)
- `last_modified_at: string` (ISO timestamp)

**Relationships**:
- Belongs to one `Domain` (via `domain_id`)
- Can reference one `BPMNProcess` (via `bpmn_link`)
- Can reference one `DMNDecision` (via `dmn_link`)

**Validation Rules**:
- Name must be unique within domain
- Name cannot be empty
- `type` must be one of: 'ai', 'ml', 'app'
- `bpmn_link` and `dmn_link` must reference valid processes/decisions in domain

**State Transitions**:
- Created → Development (on creation)
- Development → Production (user action)
- Production → Deprecated (user action)

**File Storage**:
- Stored as `{asset-name}.cads.yaml` in domain folder
- Follows CADS v1.0 specification

---

### BPMNProcess

**Purpose**: Business process model using BPMN 2.0 notation

**Properties**:
- `id: string` (UUID) - Unique identifier
- `domain_id: string` (UUID) - Parent domain
- `name: string` (max 255 chars) - Process name
- `bpmn_xml: string` - BPMN 2.0 XML content
- `linked_assets?: string[]` (UUIDs) - References to CADS assets
- `transformation_links?: TransformationLink[]` - Links to ODCS tables with metadata
- `created_at: string` (ISO timestamp)
- `last_modified_at: string` (ISO timestamp)

**Relationships**:
- Belongs to one `Domain` (via `domain_id`)
- Can be linked to multiple `ComputeAsset` entities (via `linked_assets`)
- Can link to multiple `Table` entities (via `transformation_links`)

**Validation Rules**:
- Name must be unique within domain
- Name cannot be empty
- `bpmn_xml` must be valid BPMN 2.0 XML
- `bpmn_xml` size limit: 10MB
- All `linked_assets` must reference valid CADS assets in domain

**State Transitions**:
- Created → Active (on creation)
- Active → Deleted (user action)
- XML can be updated via bpmn-js editor

**File Storage**:
- Stored as `{process-name}.bpmn` in domain folder
- Native BPMN 2.0 XML format

---

### TransformationLink

**Purpose**: Link between BPMN process elements and ODCS tables with transformation metadata

**Properties**:
- `id: string` (UUID) - Unique identifier
- `source_table_id: string` (UUID) - Source ODCS table
- `target_table_id: string` (UUID) - Target ODCS table
- `metadata?: Record<string, unknown>` - Transformation metadata
- `bpmn_element_id?: string` - Reference to BPMN element (task, gateway, etc.)

**Relationships**:
- Links two `Table` entities (source and target)
- Can reference one BPMN element (via `bpmn_element_id`)

**Validation Rules**:
- `source_table_id` and `target_table_id` must reference valid tables
- `bpmn_element_id` must reference valid element in BPMN XML if provided

---

### DMNDecision

**Purpose**: Decision model using DMN 1.3 notation

**Properties**:
- `id: string` (UUID) - Unique identifier
- `domain_id: string` (UUID) - Parent domain
- `name: string` (max 255 chars) - Decision name
- `dmn_xml: string` - DMN 1.3 XML content
- `created_at: string` (ISO timestamp)
- `last_modified_at: string` (ISO timestamp)

**Relationships**:
- Belongs to one `Domain` (via `domain_id`)
- Can be linked to `ComputeAsset` entities (via CADS `dmn_link`)

**Validation Rules**:
- Name must be unique within domain
- Name cannot be empty
- `dmn_xml` must be valid DMN 1.3 XML
- `dmn_xml` size limit: 10MB

**State Transitions**:
- Created → Active (on creation)
- Active → Deleted (user action)
- XML can be updated via dmn-js editor

**File Storage**:
- Stored as `{decision-name}.dmn` in domain folder
- Native DMN 1.3 XML format

---

## Supporting Types

### Owner

**Purpose**: Owner information (ODCS/CADS)

**Properties**:
- `name?: string` - Owner name
- `email?: string` - Owner email
- `team?: string` - Owner team
- `role?: string` - Role (e.g., "Data Owner", "Data Steward")

---

### SLA

**Purpose**: Service level agreement (ODCS)

**Properties**:
- `latency?: number` - Latency in milliseconds
- `uptime?: number` - Uptime percentage (0-100)
- `response_time?: number` - Response time in milliseconds
- `error_rate?: number` - Error rate percentage (0-100)
- `update_frequency?: string` - Update frequency (e.g., "daily", "hourly", "real-time")

---

### ODPSInputPort / ODPSOutputPort

**Purpose**: ODPS data product input/output ports

**Properties**:
- `name: string` - Port name
- `table_id: string` (UUID) - Reference to ODCS table
- `description?: string` - Port description

---

### ODPSSupport

**Purpose**: ODPS support information

**Properties**:
- `team?: string` - Support team
- `contact?: string` - Contact information
- `slack_channel?: string` - Slack channel
- `documentation_url?: string` - Documentation URL

---

### CADSBPMNModel / CADSDMNModel / CADSOpenAPISpec

**Purpose**: CADS references to external models/specs

**Properties**:
- `name: string` - Reference name
- `reference: string` - File path or URL
- `format: string` - Format (e.g., "bpmn", "dmn", "openapi")
- `description?: string` - Description

---

## View Modes

View modes are **not separate entities** but filters/views of domain data:

### Systems View
- Displays physical systems as nodes
- Shows data flow between systems
- Displays ODCS tables as conceptual-level cards
- Displays CADS assets (AI/ML/Apps) as nodes

### ETL View
- Zoomed-in view of a single system
- Displays logical-level cards for ODCS data
- Shows transformation links between tables
- Links to BPMN processes

### Operational/Analytical Levels View
- Filters tables by data level: Operational, Bronze, Silver, Gold
- Shows relationships with crow's feet notation
- Allows changing table status between levels
- Shows cross-domain tables as view-only (dotted border, pastel shades)

### Data Product View
- Displays ODPS products as card objects
- Shows linked ODCS tables
- End-user focused design

### Compute Asset View
- Displays CADS assets (AI/ML/Apps)
- Shows asset metadata (owner, team, repo)
- Links to BPMN/DMN models
- Full CRUD support

---

## Identity & Uniqueness Rules

### Workspace
- `id`: Globally unique (UUID)
- `name`: Unique per `owner_id` (for personal workspaces)

### Domain
- `id`: Globally unique (UUID)
- `name`: Unique within `workspace_id`

### Table
- `id`: Globally unique (UUID)
- `name`: Unique within `workspace_id`

### Column
- `id`: Globally unique (UUID)
- `name`: Unique within `table_id`

### Relationship
- `id`: Globally unique (UUID)
- Unique combination: `source_table_id` + `target_table_id` + `domain_id` (same relationship cannot exist twice in same domain)

### DataProduct
- `id`: Globally unique (UUID)
- `name`: Unique within `domain_id`

### ComputeAsset
- `id`: Globally unique (UUID)
- `name`: Unique within `domain_id`

### BPMNProcess
- `id`: Globally unique (UUID)
- `name`: Unique within `domain_id`

### DMNDecision
- `id`: Globally unique (UUID)
- `name`: Unique within `domain_id`

---

## Lifecycle & State Transitions

### Workspace Lifecycle
1. **Created**: Workspace created with default domain
2. **Active**: Workspace in use, domains can be added/modified
3. **Archived**: Workspace archived (future feature)

### Domain Lifecycle
1. **Created**: Domain created with `domain.yaml`
2. **Active**: Domain in use, assets can be added/modified
3. **Deleted**: Domain deleted (cannot delete last domain)

### Table Lifecycle
1. **Created**: Table created with at least one column
2. **Active**: Table in use, can be edited on primary domain
3. **Deleted**: Table deleted, relationships cleaned up

### DataProduct Lifecycle
1. **Draft**: Product created but not published
2. **Published**: Product available for use
3. **Deprecated**: Product deprecated but retained

### ComputeAsset Lifecycle
1. **Development**: Asset in development
2. **Production**: Asset in production use
3. **Deprecated**: Asset deprecated but retained

---

## Data Volume & Scale Assumptions

- **Workspaces per user**: 10-50 typical, 100+ possible
- **Domains per workspace**: 5-20 typical, 50+ possible
- **Tables per domain**: 10-100 typical, 1000+ possible
- **Columns per table**: 5-50 typical, 200+ possible
- **Relationships per domain**: 10-200 typical, 1000+ possible
- **BPMN processes per domain**: 1-10 typical, 50+ possible
- **DMN decisions per domain**: 0-5 typical, 20+ possible
- **ODPS products per domain**: 1-20 typical, 100+ possible
- **CADS assets per domain**: 1-10 typical, 50+ possible

**Performance Targets**:
- Load workspace with 10 domains: <2s
- Render canvas with 100 tables: 60fps
- Save domain with 50 tables: <1s

---

## Cross-Domain Relationships

### Table Visibility Across Domains
- Tables can appear on multiple domains via `visible_domains` array
- Table is editable only on `primary_domain_id`
- On non-primary domains, table appears as read-only with visual indicators:
  - Dotted border
  - Pastel shades based on data level (bronze/silver/gold/blue for operational)
  - "RO" badge indicating read-only

### Domain References
- Tables reference domains via `primary_domain_id` and `visible_domains`
- Relationships are domain-scoped via `domain_id`
- BPMN/DMN processes belong to one domain but can reference tables from other domains

---

## Migration Considerations

### Legacy Model-Type Domains
- Old Conceptual/Logical/Physical domains are **incompatible** with new architecture
- Users must manually reorganize tables into business domains
- System provides migration guidance but no automatic conversion
- Old domain structure completely discarded

### Legacy Data Flow Diagrams
- Old data flow diagrams are **deprecated**
- Users must manually recreate as BPMN processes
- System notifies users when opening pre-migration workspaces

### Data Preservation
- All table data (columns, relationships) preserved during migration
- ODCS fields (description, quality rules, owner, SLA) preserved
- Canvas positions preserved where possible
- User must manually assign tables to new business domains

---

## File Structure

### Domain Folder Structure
```
{domain-name}/
├── domain.yaml              # Domain definition
├── {table-name}.odcs.yaml   # ODCS tables
├── {product-name}.odps.yaml # ODPS products
├── {asset-name}.cads.yaml   # CADS assets
├── {process-name}.bpmn      # BPMN processes
└── {decision-name}.dmn      # DMN decisions
```

### Workspace Root Structure
```
workspace/
├── schemas/                 # Schema reference files (optional)
│   ├── odcs-json-schema-v3.1.0.json
│   ├── odps-json-schema-latest.json
│   └── cads.schema.json
├── {domain-1}/              # Domain folders
│   ├── domain.yaml
│   └── ...
└── {domain-2}/
    ├── domain.yaml
    └── ...
```

---

## Validation Summary

### Required Fields
- **Workspace**: id, name, type, owner_id
- **Domain**: id, workspace_id, name
- **Table**: id, workspace_id, primary_domain_id, name, columns (at least one)
- **Column**: id, table_id, name, data_type
- **Relationship**: id, workspace_id, domain_id, source_table_id, target_table_id
- **DataProduct**: id, domain_id, name, linked_tables (at least one)
- **ComputeAsset**: id, domain_id, name, type
- **BPMNProcess**: id, domain_id, name, bpmn_xml
- **DMNDecision**: id, domain_id, name, dmn_xml

### Uniqueness Constraints
- Workspace name per owner
- Domain name per workspace
- Table name per workspace
- Column name per table
- Product/Asset/Process/Decision name per domain

### Referential Integrity
- All foreign key references must point to existing entities
- Deleting a domain requires reassigning or deleting all assets
- Deleting a table requires cleaning up relationships
- Cross-domain references validated on save

---

## Notes

- All timestamps use ISO 8601 format
- UUIDs use UUIDv4 format (random) for new entities
- File names use kebab-case
- YAML files follow ODCS/ODPS/CADS specifications
- XML files (BPMN/DMN) follow respective standard formats
- View modes are presentation-layer concepts, not stored entities

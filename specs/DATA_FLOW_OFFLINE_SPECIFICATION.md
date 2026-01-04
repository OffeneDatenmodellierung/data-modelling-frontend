# Data Flow Diagrams - Offline Mode Specification

## Overview

This specification defines how data flow diagrams should be created, edited, imported, and exported in offline mode without requiring the API. The specification is based on the API contract and designed to be implemented using the SDK (when available) or JavaScript fallback implementations.

## Current Status

### ✅ Currently Supported (Offline)
- **Import**: Data flow diagrams can be loaded from `data-flow.yaml` files in domain folders
- **Export**: Data flow diagrams are included in ODCS export

### ❌ Currently Missing (Offline)
- **Create**: Cannot create new data flow diagrams offline
- **Edit**: Cannot edit existing data flow diagrams offline
- **Delete**: Cannot delete data flow diagrams offline
- **SDK Support**: SDK does not expose data flow parsing/validation methods

## Data Flow Diagram Structure

Based on the API specification and current implementation:

```typescript
interface DataFlowDiagram {
  id: string; // UUID
  workspace_id: string; // UUID
  name: string; // max 255 chars
  nodes: DataFlowNode[];
  connections: DataFlowConnection[];
  linked_tables?: string[]; // Array of table UUIDs
  created_at: string; // ISO timestamp
  last_modified_at: string; // ISO timestamp
}

interface DataFlowNode {
  id: string; // UUID
  diagram_id: string; // UUID
  type: 'source' | 'target' | 'processor' | 'storage';
  label: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  metadata?: Record<string, unknown>;
}

interface DataFlowConnection {
  id: string; // UUID
  diagram_id: string; // UUID
  source_node_id: string; // UUID
  target_node_id: string; // UUID
  label?: string;
  metadata?: Record<string, unknown>;
}
```

## ODCS 3.1.0 Format

Data flow diagrams should be stored in ODCS format within domain folders:

**File Structure**:
```
workspace-folder/
  domain-folder/
    tables.yaml          # Tables for this domain
    relationships.yaml    # Relationships for this domain
    data-flow.yaml        # Data flow diagrams for this domain (NEW)
```

**data-flow.yaml Format**:
```yaml
data_flow_diagrams:
  - id: "uuid"
    workspace_id: "uuid"
    name: "Customer Data Flow"
    nodes:
      - id: "uuid"
        diagram_id: "uuid"
        type: "source"
        label: "Customer API"
        position_x: 100
        position_y: 100
        width: 150
        height: 100
        metadata: {}
    connections:
      - id: "uuid"
        diagram_id: "uuid"
        source_node_id: "uuid"
        target_node_id: "uuid"
        label: "Customer Data"
        metadata: {}
    linked_tables:
      - "table-uuid-1"
      - "table-uuid-2"
    created_at: "2025-01-02T00:00:00Z"
    last_modified_at: "2025-01-02T00:00:00Z"
```

## Required Operations

### 1. Create Data Flow Diagram

**Input**:
```typescript
{
  name: string;
  nodes?: DataFlowNode[];
  connections?: DataFlowConnection[];
  linked_tables?: string[];
}
```

**Output**: `DataFlowDiagram` with generated IDs and timestamps

**Implementation**:
- Generate UUID for diagram
- Generate UUIDs for nodes and connections
- Set `created_at` and `last_modified_at` to current timestamp
- Store in model store
- Save to `data-flow.yaml` file in domain folder

### 2. Update Data Flow Diagram

**Input**:
```typescript
{
  name?: string;
  nodes?: DataFlowNode[];
  connections?: DataFlowConnection[];
  linked_tables?: string[];
}
```

**Output**: Updated `DataFlowDiagram`

**Implementation**:
- Update fields in model store
- Update `last_modified_at` timestamp
- Save to `data-flow.yaml` file

### 3. Delete Data Flow Diagram

**Input**: `diagramId: string`

**Output**: `void`

**Implementation**:
- Remove from model store
- Remove from `data-flow.yaml` file
- If file becomes empty, optionally delete the file

### 4. Add/Update/Delete Node

**Operations**:
- `addNode(diagramId, node)`: Add node to diagram
- `updateNode(diagramId, nodeId, updates)`: Update node properties
- `deleteNode(diagramId, nodeId)`: Remove node and all its connections

**Implementation**:
- Update diagram in model store
- Update `data-flow.yaml` file

### 5. Add/Update/Delete Connection

**Operations**:
- `addConnection(diagramId, connection)`: Add connection between nodes
- `updateConnection(diagramId, connectionId, updates)`: Update connection properties
- `deleteConnection(diagramId, connectionId)`: Remove connection

**Implementation**:
- Update diagram in model store
- Update `data-flow.yaml` file

### 6. Import Data Flow Diagrams

**Input**: YAML content or file

**Output**: `DataFlowDiagram[]`

**Current Implementation**: ✅ Already works via `odcsService.parseYAML()`

**Required SDK Methods**:
- `parseDataFlowYAML(yaml_content: string): string` - Returns JSON string
- `validateDataFlowDiagram(diagram_json: string): string` - Returns validation result

### 7. Export Data Flow Diagrams

**Input**: `DataFlowDiagram[]`

**Output**: YAML string

**Current Implementation**: ✅ Already works via `odcsService.toYAML()`

**Required SDK Methods**:
- `exportDataFlowToYAML(diagrams_json: string): string` - Returns YAML string
- `validateDataFlowExport(diagrams_json: string): string` - Returns validation result

## File Storage Strategy

### Domain-Scoped Storage

Data flow diagrams are stored at the **domain level** (not workspace level) in offline mode:

```
workspace-folder/
  conceptual-domain/
    tables.yaml
    relationships.yaml
    data-flow.yaml    # Data flows for conceptual domain
  logical-domain/
    tables.yaml
    relationships.yaml
    data-flow.yaml    # Data flows for logical domain
```

### File Operations

1. **Read**: Parse `data-flow.yaml` from domain folder
2. **Write**: Save diagrams to `data-flow.yaml` in domain folder
3. **Update**: Read, modify, write back to `data-flow.yaml`
4. **Delete**: Read, remove diagram, write back (or delete file if empty)

## Validation Rules

### Diagram Validation
- `name` must be non-empty string (max 255 chars)
- `workspace_id` must be valid UUID
- `nodes` must be array (can be empty)
- `connections` must be array (can be empty)

### Node Validation
- `id` must be valid UUID
- `diagram_id` must match parent diagram ID
- `type` must be one of: `'source' | 'target' | 'processor' | 'storage'`
- `label` must be non-empty string
- `position_x`, `position_y`, `width`, `height` must be numbers
- `width` and `height` must be positive

### Connection Validation
- `id` must be valid UUID
- `diagram_id` must match parent diagram ID
- `source_node_id` must exist in diagram's nodes
- `target_node_id` must exist in diagram's nodes
- `source_node_id` and `target_node_id` must be different
- Connection must not create circular reference (optional warning)

## SDK Methods Required

The following methods should be exposed by the SDK for proper offline support:

### Parsing & Validation
```rust
// Parse data flow YAML to JSON
pub fn parse_data_flow_yaml(yaml_content: &str) -> Result<String, String>;

// Validate data flow diagram structure
pub fn validate_data_flow_diagram(diagram_json: &str) -> Result<String, String>;

// Validate data flow node
pub fn validate_data_flow_node(node_json: &str) -> Result<String, String>;

// Validate data flow connection
pub fn validate_data_flow_connection(connection_json: &str, nodes_json: &str) -> Result<String, String>;
```

### Export
```rust
// Export data flow diagrams to YAML
pub fn export_data_flow_to_yaml(diagrams_json: &str) -> Result<String, String>;

// Export single diagram to YAML
pub fn export_data_flow_diagram(diagram_json: &str) -> Result<String, String>;
```

### Utilities
```rust
// Generate UUID for new diagram/node/connection
pub fn generate_uuid() -> String;

// Check for circular references in connections
pub fn check_data_flow_circular_reference(connections_json: &str) -> Result<bool, String>;

// Validate node connections (source/target exist)
pub fn validate_node_connections(connection_json: &str, nodes_json: &str) -> Result<String, String>;
```

## Implementation Plan

### Phase 1: Offline Service Implementation (Current)
- ✅ Create `offlineDataFlowService.ts` with CRUD operations
- ✅ Implement file I/O for `data-flow.yaml`
- ✅ Update `modelStore` to use offline service when in offline mode
- ✅ Update `CreateDataFlowDiagramDialog` to work offline

### Phase 2: SDK Integration (Future)
- ⏳ Wait for SDK to expose data flow methods
- ⏳ Replace JavaScript fallback with SDK methods
- ⏳ Add validation using SDK methods

### Phase 3: Import/Export Enhancement (Future)
- ⏳ Add data flow-specific import/export options
- ⏳ Support importing data flows from separate files
- ⏳ Support exporting data flows to separate files

## API Contract Reference

Based on `/api/v1/workspaces/{workspace_id}/data-flow-diagrams` endpoints:

- `GET /api/v1/workspaces/{workspace_id}/data-flow-diagrams` - List diagrams
- `POST /api/v1/workspaces/{workspace_id}/data-flow-diagrams` - Create diagram
- `GET /api/v1/workspaces/{workspace_id}/data-flow-diagrams/{diagram_id}` - Get diagram
- `PUT /api/v1/workspaces/{workspace_id}/data-flow-diagrams/{diagram_id}` - Update diagram
- `DELETE /api/v1/workspaces/{workspace_id}/data-flow-diagrams/{diagram_id}` - Delete diagram

**Note**: In offline mode, these operations are performed on local files instead of API calls.

## Error Handling

### File I/O Errors
- File not found: Create new file with empty array
- Parse errors: Show error message, keep existing data
- Write errors: Show error message, keep changes in memory

### Validation Errors
- Invalid structure: Show field-level errors
- Missing required fields: Highlight missing fields
- Invalid references: Show which nodes/connections are invalid

## Testing Requirements

### Unit Tests
- Create diagram offline
- Update diagram offline
- Delete diagram offline
- Add/update/delete nodes
- Add/update/delete connections
- Import from YAML
- Export to YAML
- Validation rules

### Integration Tests
- File I/O operations
- Model store integration
- Offline/online mode switching
- Error handling

---

**Version**: 1.0  
**Date**: 2026-01-02  
**Status**: Specification Complete - Implementation In Progress




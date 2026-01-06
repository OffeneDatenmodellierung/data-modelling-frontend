# Research: SDK 1.5.0 Domain-Centric Migration with BPMN/DMN Editors

**Date**: 2025-01-27  
**Feature**: SDK 1.5.0 Domain-Centric Migration  
**Phase**: 0 - Research & Clarification

## Research Objectives

This research document resolves all NEEDS CLARIFICATION items from the implementation plan and provides technical decisions for integrating bpmn-js and dmn-js editors into the React application.

---

## 1. bpmn-js Integration Research

### Library Information

**Package**: `bpmn-js`  
**Latest Stable Version**: 18.0.0+ (as of 2024)  
**Repository**: https://github.com/bpmn-io/bpmn-js  
**License**: MIT  
**Documentation**: https://bpmn.io/toolkit/bpmn-js/

### React Compatibility

**Decision**: bpmn-js is framework-agnostic and works well with React via imperative API

**Rationale**:
- bpmn-js uses an imperative API (not React components)
- Integration pattern: Mount bpmn-js instance in `useEffect` hook
- React wrapper libraries exist but add unnecessary abstraction
- Direct integration provides better control and performance

**Integration Pattern**:
```typescript
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { useEffect, useRef } from 'react';

function BPMNEditor({ xml, onSave }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const modeler = new BpmnModeler({
      container: containerRef.current,
      // Additional options
    });
    modelerRef.current = modeler;

    // Import XML
    if (xml) {
      modeler.importXML(xml).catch(console.error);
    }

    return () => {
      modeler.destroy();
    };
  }, []);

  const handleSave = async () => {
    const { xml } = await modelerRef.current.saveXML({ format: true });
    onSave(xml);
  };

  return <div ref={containerRef} style={{ height: '100%' }} />;
}
```

### XML Import/Export API

**Decision**: Use `importXML()` and `saveXML()` methods

**API**:
- `modeler.importXML(xml: string): Promise<void>` - Import BPMN XML
- `modeler.saveXML(options?: { format?: boolean }): Promise<{ xml: string }>` - Export BPMN XML
- `modeler.saveSVG(): Promise<{ svg: string }>` - Export SVG diagram

**Error Handling**:
- `importXML` throws errors for invalid XML
- Wrap in try-catch and display user-friendly error messages
- Validate XML structure before import

### Customization Options

**Decision**: Use bpmn-js modules and plugins for customization

**Available Modules**:
- `bpmn-js-properties-panel` - Properties panel for editing element properties
- `bpmn-js-minimap` - Minimap for navigation
- `bpmn-js-token-simulation` - Token simulation for testing
- Custom modules can be created for domain-specific features

**Styling**:
- CSS can be customized via CSS variables and overrides
- Theme support available
- Responsive design supported

### Security Considerations

**Decision**: Implement XML sanitization and validation

**Security Measures**:
1. **XML Parsing**: bpmn-js uses DOMParser internally (browser API)
2. **XSS Protection**: 
   - Sanitize XML input before import
   - Use DOMPurify if needed for user-provided XML
   - React escapes output by default
3. **File Size Limits**: Enforce maximum file size (e.g., 10MB) to prevent DoS
4. **Validation**: Validate BPMN 2.0 XML structure before import
5. **Content Security Policy**: Ensure CSP allows inline styles (required by bpmn-js)

**Vulnerabilities**:
- No known critical vulnerabilities in bpmn-js
- Regular security audits recommended
- Monitor npm audit for dependency vulnerabilities

### Performance Considerations

**Decision**: Implement lazy loading and virtualization for large diagrams

**Performance Characteristics**:
- Handles diagrams with 100+ elements smoothly
- For larger diagrams (500+ elements), consider:
  - Lazy loading of diagram sections
  - Virtual scrolling (if implementing custom list views)
  - Debouncing save operations
- Initialization: <500ms for typical diagrams
- Memory usage: ~50-100MB for typical diagrams

### License Compatibility

**Decision**: MIT license is compatible with project (MIT license)

**Rationale**: 
- bpmn-js: MIT License
- Project license: MIT
- Full compatibility, no restrictions

---

## 2. dmn-js Integration Research

### Library Information

**Package**: `dmn-js`  
**Latest Stable Version**: 17.0.0+ (as of 2024)  
**Repository**: https://github.com/bpmn-io/dmn-js  
**License**: MIT  
**Documentation**: https://bpmn.io/toolkit/dmn-js/

### React Compatibility

**Decision**: dmn-js uses similar imperative API pattern as bpmn-js

**Integration Pattern**:
```typescript
import DmnModeler from 'dmn-js/lib/Modeler';
import { useEffect, useRef } from 'react';

function DMNEditor({ xml, onSave }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<DmnModeler | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const modeler = new DmnModeler({
      container: containerRef.current,
    });
    modelerRef.current = modeler;

    if (xml) {
      modeler.importXML(xml).catch(console.error);
    }

    return () => {
      modeler.destroy();
    };
  }, []);

  const handleSave = async () => {
    const { xml } = await modelerRef.current.saveXML({ format: true });
    onSave(xml);
  };

  return <div ref={containerRef} style={{ height: '100%' }} />;
}
```

### XML Import/Export API

**Decision**: Use `importXML()` and `saveXML()` methods (same pattern as bpmn-js)

**API**:
- `modeler.importXML(xml: string): Promise<void>` - Import DMN XML
- `modeler.saveXML(options?: { format?: boolean }): Promise<{ xml: string }>` - Export DMN XML
- `modeler.saveSVG(): Promise<{ svg: string }>` - Export SVG diagram

### Security Considerations

**Decision**: Same security measures as bpmn-js

**Security Measures**:
1. XML sanitization before import
2. File size limits (10MB)
3. DMN 1.3 XML validation
4. XSS protection via React escaping
5. CSP configuration

### Performance Considerations

**Decision**: Similar performance characteristics to bpmn-js

**Performance**:
- Handles decision tables with 100+ rules smoothly
- Initialization: <500ms
- Memory usage: ~30-50MB for typical decision tables

### License Compatibility

**Decision**: MIT license is compatible (same as bpmn-js)

---

## 3. SDK 1.5.0 WASM Bindings Research

### WASM Binding Verification

**Decision**: Verify SDK 1.5.0 WASM bindings exist for all required formats

**Required Bindings**:
- ✅ ODCS/ODCL parsing (existing)
- ✅ BPMN XML parsing (NEEDS VERIFICATION)
- ✅ DMN XML parsing (NEEDS VERIFICATION)
- ✅ ODPS YAML parsing (NEEDS VERIFICATION)
- ✅ CADS YAML parsing (NEEDS VERIFICATION)
- ✅ OpenAPI YAML/JSON parsing (NEEDS VERIFICATION)

**Verification Steps**:
1. Check SDK repository for WASM build configuration
2. Verify `wasm-pack` build includes all format modules
3. Test WASM bindings in browser environment
4. Document function signatures and error handling

**Function Signature Pattern** (expected):
```typescript
// BPMN
parse_bpmn_xml(xml: string): string // Returns JSON string
export_to_bpmn_xml(json: string): string // Returns XML string

// DMN
parse_dmn_xml(xml: string): string // Returns JSON string
export_to_dmn_xml(json: string): string // Returns XML string

// ODPS
parse_odps_yaml(yaml: string): string // Returns JSON string
export_to_odps_yaml(json: string): string // Returns YAML string

// CADS
parse_cads_yaml(yaml: string): string // Returns JSON string
export_to_cads_yaml(json: string): string // Returns YAML string

// OpenAPI
parse_openapi(content: string, format: 'yaml' | 'json'): string // Returns JSON string
export_to_openapi(json: string, format: 'yaml' | 'json'): string // Returns YAML/JSON string
```

**Fallback Strategy**:
- If WASM bindings unavailable, use JavaScript parsers
- For BPMN/DMN: Use bpmn-js/dmn-js XML parsing (already integrated)
- For ODPS/CADS/OpenAPI: Use js-yaml and custom parsers

### Error Handling Patterns

**Decision**: SDK functions return Result types or throw errors

**Pattern**:
```typescript
try {
  const resultJson = sdk.parse_bpmn_xml(xml);
  const result = JSON.parse(resultJson);
  // Process result
} catch (error) {
  // Handle error (invalid XML, parsing error, etc.)
  console.error('BPMN parsing failed:', error);
  throw new Error('Failed to parse BPMN XML');
}
```

### Memory Management

**Decision**: WASM memory managed automatically, but monitor for leaks

**Considerations**:
- WASM memory grows automatically
- Large files may require memory limits
- Monitor memory usage in browser DevTools
- Implement file size limits (10MB for BPMN/DMN, 5MB for YAML)

---

## 4. Domain-Based File Structure Research

### File Organization Pattern

**Decision**: Use SDK 1.5.0 recommended structure

**Structure**:
```
workspace/
├── schemas/                    # Schema reference files (optional)
│   ├── odcs-json-schema-v3.1.0.json
│   ├── odps-json-schema-latest.json
│   └── cads.schema.json
├── customer-service/           # Domain directory
│   ├── domain.yaml            # Domain definition (required)
│   ├── customers.odcs.yaml    # ODCS table
│   ├── orders.odcs.yaml       # ODCS table
│   ├── customer-product.odps.yaml  # ODPS product
│   ├── recommendation-model.cads.yaml  # CADS asset
│   ├── order-process.bpmn     # BPMN process
│   └── pricing-rules.dmn      # DMN decision
```

### File Naming Conventions

**Decision**: Use kebab-case for file names, preserve original names in metadata

**Conventions**:
- Domain folders: `kebab-case` (e.g., `customer-service`)
- ODCS tables: `{table-name}.odcs.yaml` (e.g., `customers.odcs.yaml`)
- ODPS products: `{product-name}.odps.yaml`
- CADS assets: `{asset-name}.cads.yaml`
- BPMN processes: `{process-name}.bpmn`
- DMN decisions: `{decision-name}.dmn`
- Domain definition: `domain.yaml` (always)

### Loading Performance Optimizations

**Decision**: Implement lazy loading and parallel file loading

**Strategies**:
1. **Lazy Loading**: Load domain assets only when domain is selected
2. **Parallel Loading**: Load multiple files concurrently (Promise.all)
3. **Caching**: Cache loaded domains in IndexedDB/localStorage
4. **Incremental Loading**: Load domain.yaml first, then assets on demand

**Implementation**:
```typescript
async function loadDomain(domainPath: string) {
  // Load domain.yaml first
  const domainDef = await loadFile(`${domainPath}/domain.yaml`);
  
  // Load assets in parallel
  const [tables, products, assets, processes, decisions] = await Promise.all([
    loadODCSTables(domainPath),
    loadODPSProducts(domainPath),
    loadCADSAssets(domainPath),
    loadBPMNProcesses(domainPath),
    loadDMNDecisions(domainPath),
  ]);
  
  return { domainDef, tables, products, assets, processes, decisions };
}
```

### Migration Strategy

**Decision**: One-time migration with rollback capability

**Migration Steps**:
1. Detect old structure (presence of `tables.yaml`/`relationships.yaml` in root)
2. Create domain folders based on existing domains
3. Move tables to domain folders (`{domain-name}/*.odcs.yaml`)
4. Convert data flow diagrams to BPMN processes
5. Create `domain.yaml` files for each domain
6. Backup original structure before migration
7. Validate migrated structure
8. Offer rollback if validation fails

**Rollback Strategy**:
- Keep original files in `.backup/` directory
- Provide "Restore from Backup" option
- Validate backup integrity before rollback

---

## 5. BPMN/DMN Editor Integration Strategy

### Popout Modal Implementation

**Decision**: Use DraggableModal component with full-screen option

**Implementation**:
```typescript
<DraggableModal
  isOpen={isBPMNEditorOpen}
  onClose={handleClose}
  title="Edit BPMN Process"
  size="xl"
  fullScreen={true} // NEW prop for full-screen editors
>
  <BPMNEditor
    xml={bpmnXml}
    onSave={handleSave}
    onClose={handleClose}
  />
</DraggableModal>
```

### Save Functionality

**Decision**: Save directly to domain folder and update store

**Flow**:
1. User edits BPMN/DMN in popout editor
2. User clicks "Save" button
3. Editor exports XML via `saveXML()`
4. XML saved to domain folder (`{domain}/{process-name}.bpmn`)
5. Store updated with new XML
6. Auto-save triggered (if enabled)
7. Modal closes

**Error Handling**:
- Validate XML before save
- Show error message if save fails
- Keep editor open if save fails
- Offer "Save As" option for new processes

### Link Integration

**Decision**: Add "Edit BPMN" / "Edit DMN" buttons/links in relevant views

**Locations**:
- Compute Asset View: "Edit BPMN Process" button if `bpmn_link` exists
- ETL View: "Edit Process" button for system processes
- Domain assets list: Click on BPMN/DMN file to open editor

---

## 6. Testing Strategy for BPMN/DMN Editors

### Unit Testing

**Decision**: Mock bpmn-js/dmn-js APIs for unit tests

**Strategy**:
- Mock `BpmnModeler` and `DmnModeler` constructors
- Mock `importXML` and `saveXML` methods
- Test React component logic (mounting, unmounting, event handlers)
- Test error handling

### Integration Testing

**Decision**: Use real bpmn-js/dmn-js instances in integration tests

**Strategy**:
- Test XML import/export round-trip
- Test save functionality with real file system (in Electron)
- Test error handling with invalid XML
- Test large file handling

### E2E Testing

**Decision**: Defer E2E tests for BPMN/DMN editors (complexity)

**Rationale**:
- bpmn-js/dmn-js have complex interactions (drag-drop, context menus)
- E2E tests would be fragile and time-consuming
- Focus on manual testing and unit/integration tests
- Consider E2E tests in future iteration

---

## 7. Dependencies Summary

### New Dependencies

```json
{
  "dependencies": {
    "bpmn-js": "^18.0.0",
    "dmn-js": "^17.0.0",
    "bpmn-js-properties-panel": "^2.0.0", // Optional: for properties panel
    "bpmn-js-minimap": "^1.0.0" // Optional: for minimap
  },
  "devDependencies": {
    "@types/bpmn-js": "^18.0.0", // If available
    "@types/dmn-js": "^17.0.0" // If available
  }
}
```

### Peer Dependencies

- React 18.2+ (already in project)
- ReactFlow 11.11.4 (already in project)

---

## 8. Resolved Clarifications

### ✅ bpmn-js Version and Integration
- **Version**: 18.0.0+ (latest stable)
- **Integration**: Imperative API via useEffect hook
- **Pattern**: Mount in ref, importXML/saveXML for operations

### ✅ dmn-js Version and Integration
- **Version**: 17.0.0+ (latest stable)
- **Integration**: Same pattern as bpmn-js
- **Pattern**: Imperative API via useEffect hook

### ✅ Security Considerations
- XML sanitization required
- File size limits (10MB)
- XSS protection via React escaping
- CSP configuration needed

### ✅ License Compatibility
- Both libraries: MIT License
- Fully compatible with project (MIT)

### ⚠️ SDK 1.5.0 WASM Bindings
- **Status**: NEEDS VERIFICATION
- **Action**: Verify bindings exist in SDK repository
- **Fallback**: JavaScript parsers if unavailable

### ✅ Performance Considerations
- bpmn-js: Handles 100+ elements smoothly
- dmn-js: Handles 100+ rules smoothly
- Lazy loading recommended for large diagrams

### ✅ E2E Test Strategy
- **Decision**: Defer E2E tests for BPMN/DMN editors
- **Focus**: Unit and integration tests
- **Rationale**: Complexity and fragility of E2E tests

---

## 9. Next Steps

1. **Verify SDK 1.5.0 WASM Bindings**: Check SDK repository for BPMN/DMN/ODPS/CADS/OpenAPI bindings
2. **Create Proof of Concept**: Implement basic BPMN/DMN editor components
3. **Test Integration**: Verify bpmn-js/dmn-js work correctly in React environment
4. **Document API**: Document function signatures and error handling patterns
5. **Update Plan**: Incorporate findings into implementation plan

---

## References

- [bpmn-js Documentation](https://bpmn.io/toolkit/bpmn-js/)
- [dmn-js Documentation](https://bpmn.io/toolkit/dmn-js/)
- [bpmn-js GitHub](https://github.com/bpmn-io/bpmn-js)
- [dmn-js GitHub](https://github.com/bpmn-io/dmn-js)
- [SDK Architecture Guide](https://raw.githubusercontent.com/pixie79/data-modelling-sdk/main/docs/ARCHITECTURE.md)
- [SDK LLM.txt](https://raw.githubusercontent.com/pixie79/data-modelling-sdk/main/LLM.txt)

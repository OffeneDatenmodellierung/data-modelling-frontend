# Quickstart Guide: SDK 1.5.0 Domain-Centric Migration

**Date**: 2025-01-27  
**Feature**: SDK 1.5.0 Domain-Centric Migration  
**Phase**: 1 - Design & Contracts

## Overview

This guide provides setup instructions and development workflow for implementing the SDK 1.5.0 domain-centric migration with BPMN/DMN editor integration.

---

## Prerequisites

- Node.js 20+ installed
- npm or yarn package manager
- Git for version control
- Rust toolchain (for SDK WASM build) - optional, can use pre-built WASM
- wasm-pack (for building SDK WASM) - optional

---

## Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Install New Dependencies

```bash
npm install bpmn-js@^18.0.0 dmn-js@^17.0.0
npm install --save-dev @types/bpmn-js @types/dmn-js  # If type definitions available
```

### 3. Update SDK Version

Update `package.json` or SDK reference to use SDK 1.5.0+:

```json
{
  "dependencies": {
    "data-modelling-sdk": "^1.5.0"
  }
}
```

### 4. Build WASM SDK (Optional)

If building SDK WASM locally:

```bash
# In SDK repository
wasm-pack build --target web --out-dir pkg

# Copy to frontend
cp -r pkg/* frontend/public/wasm/
```

Or use pre-built WASM from SDK releases.

---

## Development Workflow

### 1. Start Development Server

```bash
npm run dev
```

### 2. Development Mode

- Hot module replacement enabled
- TypeScript type checking
- ESLint running in watch mode

### 3. Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run component tests
npm run test:components

# Run integration tests
npm run test:integration
```

### 4. Building

```bash
# Build for production
npm run build

# Build for Electron
npm run build:electron
```

---

## Project Structure

### Key Directories

- `src/components/views/` - New view components (Systems, ETL, Data Levels, Products, Compute Assets)
- `src/components/editors/` - BPMN/DMN editor components
- `src/services/sdk/` - SDK integration services (ODPS, CADS, BPMN, DMN, OpenAPI)
- `src/stores/domainStore.ts` - New domain store
- `src/types/` - Type definitions (domain.ts, bpmn.ts, dmn.ts, odps.ts, cads.ts)

### File Organization

Follow domain-based file structure:
```
workspace/
├── {domain-name}/
│   ├── domain.yaml
│   ├── *.odcs.yaml
│   ├── *.odps.yaml
│   ├── *.cads.yaml
│   ├── *.bpmn
│   └── *.dmn
```

---

## BPMN/DMN Editor Integration

### Basic BPMN Editor Component

```typescript
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { useEffect, useRef } from 'react';

function BPMNEditor({ xml, onSave }: { xml: string; onSave: (xml: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const modeler = new BpmnModeler({
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
    if (!modelerRef.current) return;
    const { xml } = await modelerRef.current.saveXML({ format: true });
    onSave(xml);
  };

  return (
    <div>
      <div ref={containerRef} style={{ height: '600px' }} />
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

### DMN Editor Component

Similar pattern to BPMN editor, using `DmnModeler` from `dmn-js/lib/Modeler`.

---

## SDK Integration

### Loading SDK WASM

```typescript
import { sdkLoader } from '@/services/sdk/sdkLoader';

// Load SDK
await sdkLoader.load();
const sdk = sdkLoader.getModule();

// Parse BPMN XML
const resultJson = sdk.parse_bpmn_xml(bpmnXml);
const result = JSON.parse(resultJson);

// Export to BPMN XML
const bpmnXml = sdk.export_to_bpmn_xml(JSON.stringify(result));
```

### Format Services

Each format has its own service:
- `odpsService.ts` - ODPS product import/export
- `cadsService.ts` - CADS asset import/export
- `bpmnService.ts` - BPMN process import/export
- `dmnService.ts` - DMN decision import/export
- `openapiService.ts` - OpenAPI spec import/export

---

## Domain Loading

### Load Domain from Folder

```typescript
async function loadDomain(domainPath: string) {
  // Load domain.yaml
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

---

## Testing Strategy

### Unit Tests

Test individual services and utilities:

```typescript
import { describe, it, expect } from 'vitest';
import { odpsService } from '@/services/sdk/odpsService';

describe('ODPS Service', () => {
  it('should parse ODPS YAML', async () => {
    const yaml = `...`;
    const product = await odpsService.parseYAML(yaml);
    expect(product.name).toBe('Test Product');
  });
});
```

### Component Tests

Test React components with Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import { BPMNEditor } from '@/components/editors/BPMNEditor';

describe('BPMNEditor', () => {
  it('should render editor', () => {
    render(<BPMNEditor xml="" onSave={jest.fn()} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });
});
```

### Integration Tests

Test domain loading/saving workflows:

```typescript
describe('Domain Loading', () => {
  it('should load domain with all asset types', async () => {
    const domain = await loadDomain('test-domain');
    expect(domain.tables).toHaveLength(5);
    expect(domain.processes).toHaveLength(2);
  });
});
```

---

## Migration Guidance

### For Existing Workspaces

1. **Detect Legacy Structure**: Check for old `tables.yaml`/`relationships.yaml` in root
2. **Notify User**: Display migration notice explaining manual reorganization required
3. **Provide Guidance**: Step-by-step wizard to help reorganize tables into business domains
4. **Validate**: Ensure all tables assigned to domains before allowing save

### Migration Script

```typescript
// scripts/migrate-to-domain-structure.ts
export async function detectLegacyStructure(workspacePath: string): Promise<boolean> {
  // Check for old structure
  const hasOldStructure = await fileExists(`${workspacePath}/tables.yaml`);
  return hasOldStructure;
}

export async function provideMigrationGuidance(workspacePath: string): Promise<void> {
  // Load old structure
  // Guide user through reorganization
  // Validate new structure
}
```

---

## Common Patterns

### View Mode Switching

```typescript
const { currentView, setCurrentView } = useModelStore();

// Switch view mode
setCurrentView('systems'); // or 'etl', 'operational', 'analytical', 'products'
```

### Cross-Domain Table Display

```typescript
const tables = useModelStore((state) => state.tables);
const currentDomainId = useModelStore((state) => state.selectedDomainId);

const visibleTables = tables.filter(table => 
  table.primary_domain_id === currentDomainId || 
  table.visible_domains.includes(currentDomainId)
);

const ownedTables = visibleTables.filter(t => t.primary_domain_id === currentDomainId);
const crossDomainTables = visibleTables.filter(t => t.primary_domain_id !== currentDomainId);
```

### BPMN Editor Modal

```typescript
<DraggableModal
  isOpen={isBPMNEditorOpen}
  onClose={handleClose}
  title="Edit BPMN Process"
  size="xl"
  fullScreen={true}
>
  <BPMNEditor
    xml={bpmnXml}
    onSave={async (xml) => {
      await saveBPMNProcess(domainId, processId, xml);
      handleClose();
    }}
  />
</DraggableModal>
```

---

## Troubleshooting

### WASM SDK Not Loading

1. Check `public/wasm/` directory exists
2. Verify WASM files are present
3. Check browser console for MIME type errors
4. Ensure Content-Security-Policy allows WASM

### BPMN/DMN Editor Not Rendering

1. Check bpmn-js/dmn-js installed correctly
2. Verify container element has height set
3. Check for CSS conflicts
4. Verify XML is valid BPMN 2.0 / DMN 1.3

### Domain Loading Fails

1. Check file structure matches expected format
2. Verify `domain.yaml` exists and is valid
3. Check file permissions (Electron)
4. Validate YAML/XML syntax

---

## Next Steps

1. Implement type definitions (`types/domain.ts`, `types/bpmn.ts`, etc.)
2. Create domain store (`stores/domainStore.ts`)
3. Update file services for domain-based loading
4. Implement view components
5. Integrate BPMN/DMN editors
6. Update main editor page

---

## References

- [SDK Architecture Guide](https://raw.githubusercontent.com/pixie79/data-modelling-sdk/main/docs/ARCHITECTURE.md)
- [bpmn-js Documentation](https://bpmn.io/toolkit/bpmn-js/)
- [dmn-js Documentation](https://bpmn.io/toolkit/dmn-js/)
- [Research Document](./research.md)
- [Data Model](./data-model.md)

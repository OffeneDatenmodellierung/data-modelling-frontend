# Implementation Plan: SDK 1.5.0 Domain-Centric Migration with BPMN/DMN Editors

**Branch**: `001-sdk-1.5.0-domain-migration` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-data-modelling-app/spec.md`

## Summary

Migrate the data modelling application from a split Data Model/Data Flow architecture to a unified **Domain-Centric Architecture** aligned with SDK 1.5.0. The migration includes:

1. **Domain-Centric Structure**: All assets (ODCS tables, ODPS products, CADS assets, BPMN processes, DMN decisions) organized under business domains
2. **Multiple View Modes**: Systems View, ETL View, Operational/Analytical Levels, Data Product View, Compute Asset View
3. **BPMN/DMN Editors**: Integrated bpmn-js and dmn-js editors in popout modals, primarily for CADS (compute asset) nodes
4. **Cross-Domain Viewing**: View tables from other domains as read-only with visual indicators
5. **Data Level Management**: Operational, Bronze, Silver, Gold levels with filtering and status changes
6. **Legacy Migration**: Deprecate old model-type domains and data flow diagrams, require manual reorganization

**Target**: Offline Web and Electron App modes only (API support will be added later)

## Technical Context

**Language/Version**: TypeScript 5.9+, React 18.2+, Node.js 20+  
**Primary Dependencies**: 
- ReactFlow 11.11.4 (infinite canvas)
- bpmn-js 18.0.0+ (BPMN 2.0 editor/viewer)
- dmn-js 17.0.0+ (DMN 1.3 editor/viewer)
- Zustand 5.0.9 (state management)
- TanStack Query 5.90.16 (server state)
- Vite 7.3.0 (build tool)
- TailwindCSS 3.4.0 (styling)
- data-modelling-sdk 1.5.0+ (WASM bindings)

**Storage**: 
- Offline Web: Browser File API, IndexedDB, localStorage
- Electron: Native file system (via Electron APIs)
- File format: Domain-based YAML structure (ODCS, ODPS, CADS, BPMN XML, DMN XML)

**Testing**: 
- Vitest 4.0.16 (unit/integration tests)
- Testing Library React 16.3.1 (component tests)
- Playwright 1.57.0 (E2E tests - deferred)
- Target: 95% coverage (lines, branches, functions, statements)

**Target Platform**: 
- Web browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)
- Electron (macOS initially, Windows/Linux later)
- Offline-first architecture

**Project Type**: Web application (frontend-only for this phase)

**Performance Goals**: 
- Canvas rendering: 60fps with 100+ nodes
- File loading: <2s for workspace with 10 domains
- BPMN/DMN editor initialization: <1s
- Smooth zoom/pan interactions

**Constraints**: 
- Must work offline (no API dependency)
- Must support large models (1000+ tables)
- Must preserve all ODCS/ODCL fields during import/export
- Must maintain backward compatibility with existing workspaces (via migration guidance, manual reorganization)

**Scale/Scope**: 
- 5 new view types (Systems, ETL, Operational/Analytical, Products, Compute Assets)
- 10+ new component types
- 5 new format services (ODPS, CADS, BPMN, DMN, OpenAPI)
- Migration guidance for legacy workspaces
- Integration of bpmn-js and dmn-js editors

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Code Quality & Compilation**: 
- ✅ TypeScript provides compile-time type checking
- ✅ ESLint configured for React/TypeScript
- ✅ Prettier for code formatting
- ✅ Vite build validates compilation
- ✅ Pre-commit hooks enforce formatting/linting

**Dependency Management**: 
- ✅ All dependencies use latest stable versions
- ✅ Package.json tracks exact versions for reproducibility
- ✅ npm audit integrated for security scanning
- ✅ SDK 1.5.0+ required (latest stable)
- ✅ bpmn-js: 18.0.0+ (latest stable, MIT license)
- ✅ dmn-js: 17.0.0+ (latest stable, MIT license)

**Security-First Design**: 
- ✅ Input validation for all file imports (YAML, XML, JSON)
- ✅ XSS protection: React escapes by default, sanitize BPMN/DMN XML
- ✅ File size limits to prevent DoS (10MB for BPMN/DMN, 5MB for YAML)
- ✅ No eval() or dangerous code execution
- ✅ Electron security: Context isolation, node integration disabled
- ✅ bpmn-js/dmn-js: XML sanitization, validation, CSP configuration required

**Security Auditing**: 
- ✅ npm audit in CI/CD pipeline
- ✅ Dependency scanning before merge
- ✅ Manual review for file parsing logic
- ✅ bpmn-js/dmn-js: Regular security audits, monitor npm audit for vulnerabilities

**Linting Discipline**: 
- ✅ ESLint configured with React/TypeScript rules
- ✅ Pre-commit hooks run linting
- ✅ CI/CD pipeline enforces linting
- ✅ Zero linting errors required

**Complete Implementation & Testing**: 
- ✅ All code fully implemented (no TODOs without user authorization)
- ✅ 95% test coverage target (lines, branches, functions, statements)
- ✅ Unit tests for all services and utilities
- ✅ Component tests for all UI components
- ✅ Integration tests for domain loading/saving
- ✅ BPMN/DMN editors: Unit and integration tests (E2E tests deferred due to complexity)

## Project Structure

### Documentation (this feature)

```text
specs/001-data-modelling-app/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── canvas/              # Infinite canvas components
│   │   │   ├── DomainCanvas.tsx  # Unified canvas (NEW)
│   │   │   ├── CanvasNode.tsx    # Updated for multiple node types
│   │   │   ├── CanvasEdge.tsx    # Updated for multiple edge types
│   │   │   └── CanvasControls.tsx
│   │   ├── views/               # View-specific components (NEW)
│   │   │   ├── SystemsView.tsx
│   │   │   ├── ETLView.tsx
│   │   │   ├── DataLevelsView.tsx
│   │   │   ├── DataProductView.tsx
│   │   │   └── ComputeAssetView.tsx
│   │   ├── editors/              # BPMN/DMN editors (NEW)
│   │   │   ├── BPMNEditor.tsx    # bpmn-js integration
│   │   │   ├── DMNEditor.tsx     # dmn-js integration
│   │   │   └── EditorModal.tsx   # Popout modal wrapper
│   │   ├── table/               # Table editor components
│   │   ├── domain/               # Domain management
│   │   │   ├── DomainTabs.tsx     # Updated
│   │   │   ├── ViewSelector.tsx   # NEW
│   │   │   └── DomainSelector.tsx # Updated
│   │   ├── workspace/           # Workspace management
│   │   └── common/              # Shared UI components
│   ├── pages/
│   │   ├── ModelEditor.tsx       # Main editor (refactored)
│   │   └── Home.tsx              # Updated for domain structure
│   ├── services/
│   │   ├── sdk/                  # SDK/WASM integration
│   │   │   ├── sdkLoader.ts      # Updated for SDK 1.5.0
│   │   │   ├── odcsService.ts    # Updated
│   │   │   ├── odpsService.ts    # NEW
│   │   │   ├── cadsService.ts    # NEW
│   │   │   ├── bpmnService.ts    # NEW
│   │   │   ├── dmnService.ts      # NEW
│   │   │   └── openapiService.ts # NEW
│   │   ├── storage/              # Local storage services
│   │   │   ├── localFileService.ts  # Updated for domain structure
│   │   │   └── electronFileService.ts # Updated
│   │   └── api/                 # API client services (for future)
│   ├── stores/                   # State management (Zustand)
│   │   ├── modelStore.ts         # Refactored
│   │   ├── domainStore.ts        # NEW
│   │   └── workspaceStore.ts     # Updated
│   ├── types/                    # TypeScript definitions
│   │   ├── domain.ts             # NEW
│   │   ├── bpmn.ts               # NEW
│   │   ├── dmn.ts                # NEW
│   │   ├── odps.ts               # NEW
│   │   ├── cads.ts               # NEW
│   │   ├── workspace.ts          # Updated
│   │   └── table.ts              # Updated
│   └── utils/                    # Utilities
│       └── migration.ts          # Migration script (NEW)
├── tests/
│   ├── unit/                      # Unit tests
│   ├── integration/              # Integration tests
│   └── components/               # Component tests
└── scripts/
    └── migrate-to-domain-structure.ts # Migration guidance script (NEW)
```

**Structure Decision**: Web application structure with frontend-only focus. The structure follows existing patterns but adds new directories for views, editors, and format-specific services. BPMN/DMN editors are isolated in `components/editors/` for maintainability.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| External libraries (bpmn-js, dmn-js) | BPMN/DMN editing requires specialized XML editors with validation, visual modeling, and standard compliance | Building custom editors would require implementing BPMN 2.0 and DMN 1.3 specifications, XML parsing, validation, and visual rendering - significantly more complex and error-prone |
| Multiple view types (5 views) | Different user personas need different abstractions (systems view for architects, ETL view for engineers, product view for end users) | Single view would be too complex and confusing for different user types. Separate views provide focused experiences |
| Domain-based file structure | SDK 1.5.0 requires domain-based organization for scalability and governance | Flat file structure doesn't scale to large workspaces and doesn't align with SDK architecture |
| Manual migration (no auto-conversion) | Old model-type domains fundamentally incompatible with business domain structure; automatic conversion would lose business context | Automatic conversion would create meaningless "Default" domains without proper business organization, defeating the purpose of domain-centric architecture |

## Phase 0: Research & Clarification

**Status**: ✅ Complete

Research document (`research.md`) has been generated with all technical decisions:
- bpmn-js integration (v18.0.0+, React imperative API pattern)
- dmn-js integration (v17.0.0+, same pattern)
- Security considerations (XML sanitization, file size limits)
- Performance characteristics
- Domain-based file structure patterns
- Migration strategy

**Output**: `research.md` ✅

## Phase 1: Design & Contracts

**Prerequisites**: ✅ `research.md` complete

### 1.1 Data Model Design

**Status**: ✅ Complete

**Output**: `data-model.md` ✅

Defines all entities:
- Workspace, Domain, Table, Column, CompoundKey, Relationship
- DataProduct (ODPS), ComputeAsset (CADS), BPMNProcess, DMNDecision
- Supporting types (Owner, SLA, ODPS ports, CADS references)
- View modes (not entities, but presentation filters)
- Identity/uniqueness rules, lifecycle, validation rules
- File structure and migration considerations

### 1.2 API Contracts

**Status**: ✅ Complete (Deferred)

**Output**: `contracts/README.md` ✅

API contracts deferred - this phase focuses on offline web/Electron modes. API support will be added later. Contracts directory created with README documenting future API endpoints.

### 1.3 Quickstart Guide

**Status**: ✅ Complete

**Output**: `quickstart.md` ✅

Includes:
- Setup instructions (dependencies, SDK WASM build)
- Development workflow (dev server, testing, building)
- BPMN/DMN editor integration examples
- SDK integration patterns
- Domain loading examples
- Testing strategy
- Migration guidance
- Common patterns and troubleshooting

### 1.4 Agent Context Update

**Status**: ✅ Complete

**Action**: ✅ Run `.specify/scripts/bash/update-agent-context.sh cursor-agent`

Agent context updated with TypeScript 5.9+, React 18.2+, Node.js 20+ technologies.

## Phase 2: Implementation Planning

*Note: Phase 2 (tasks.md) is created by `/speckit.tasks` command, not `/speckit.plan`*

The implementation will be broken down into tasks covering:
1. SDK 1.5.0 integration and type definitions
2. Store refactoring for domain-centric structure
3. Storage service updates for domain-based file loading
4. View component implementation (5 views)
5. BPMN/DMN editor integration
6. Canvas updates for unified domain canvas
7. Domain management UI updates
8. Main editor page refactoring
9. Testing and migration guidance

## Success Criteria

1. ✅ All workspaces migrate successfully to domain-based structure (with manual reorganization)
2. ✅ All 5 view types functional with proper data loading
3. ✅ BPMN and DMN editors open in popout modals and save correctly
4. ✅ Cross-domain table viewing works with visual indicators
5. ✅ Data level filtering (Operational/Bronze/Silver/Gold) works correctly
6. ✅ All file formats (ODCS, ODPS, CADS, BPMN, DMN, OpenAPI) import/export correctly
7. ✅ 95% test coverage achieved
8. ✅ No linting errors
9. ✅ All security considerations addressed
10. ✅ Performance goals met (60fps canvas, <2s file loading)

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| SDK 1.5.0 WASM bindings incomplete | High | Low | Verify bindings in Phase 0 research, fallback to JavaScript parsers if needed |
| bpmn-js/dmn-js integration complexity | Medium | Medium | Research integration patterns thoroughly, create proof-of-concept early |
| Manual migration burden on users | High | High | Provide comprehensive migration guidance, step-by-step wizard, validation tools |
| Performance degradation with large models | Medium | Medium | Implement virtual scrolling, lazy loading, canvas optimization |
| BPMN/DMN XML security vulnerabilities | High | Low | Sanitize XML input, use library's built-in validation, security audit |

## Dependencies

### External Libraries
- bpmn-js 18.0.0+ (MIT)
- dmn-js 17.0.0+ (MIT)
- data-modelling-sdk 1.5.0+ (WASM)

### Internal Dependencies
- Existing canvas infrastructure (ReactFlow)
- Existing state management (Zustand)
- Existing file services (localFileService, electronFileService)
- Existing SDK loader (sdkLoader)

## Timeline Estimate

- **Phase 0 (Research)**: ✅ Complete (2-3 days)
- **Phase 1 (Design)**: 3-4 days
- **Phase 2 (Tasks)**: 1 day
- **Implementation**: 4-6 weeks (4 sprints)
- **Testing & Migration**: 1-2 weeks
- **Total**: 6-8 weeks

## Next Steps

1. ✅ Phase 0 research complete
2. Generate Phase 1 artifacts: data-model.md, contracts/, quickstart.md
3. Update agent context with new technologies
4. Proceed to Phase 2 task breakdown

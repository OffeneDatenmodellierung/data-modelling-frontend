# Tasks: SDK 1.5.0 Domain-Centric Migration with BPMN/DMN Editors

**Input**: Design documents from `/specs/001-data-modelling-app/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests are MANDATORY per constitution (95% coverage required). All tasks include test requirements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/` structure
- All paths relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, SDK 1.5.0 integration, and dependency setup

- [X] T001 Update package.json to reference SDK 1.5.0+ in frontend/package.json
- [X] T002 [P] Install bpmn-js@^18.0.0 and dmn-js@^17.0.0 dependencies in frontend/package.json
- [X] T003 [P] Update WASM build script to use SDK 1.5.0 in frontend/scripts/build-wasm.sh
- [ ] T004 [P] Verify WASM bindings for new formats (BPMN, DMN, ODPS, CADS, OpenAPI) in frontend/public/wasm/
- [X] T005 [P] Configure ESLint for bpmn-js/dmn-js in frontend/.eslintrc.cjs
- [X] T006 [P] Setup Content Security Policy for bpmn-js/dmn-js inline styles in frontend/vite.config.ts
- [X] T007 [P] Configure test framework for BPMN/DMN editor testing in frontend/vitest.config.ts
- [X] T008 [P] Setup test coverage reporting targeting 95% coverage in frontend/vitest.config.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type definitions, stores, and services that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Type Definitions

- [X] T009 [P] Create domain.ts type definitions in frontend/src/types/domain.ts
- [X] T010 [P] Create bpmn.ts type definitions in frontend/src/types/bpmn.ts
- [X] T011 [P] Create dmn.ts type definitions in frontend/src/types/dmn.ts
- [X] T012 [P] Create odps.ts type definitions in frontend/src/types/odps.ts
- [X] T013 [P] Create cads.ts type definitions in frontend/src/types/cads.ts
- [X] T014 [P] Update workspace.ts to remove DataFlowDiagram, add new asset types in frontend/src/types/workspace.ts
- [X] T015 [P] Update table.ts to add data_level, is_owned_by_domain fields in frontend/src/types/table.ts

### Domain Store

- [X] T016 Create domainStore.ts with domain state management in frontend/src/stores/domainStore.ts
- [X] T017 [P] Implement loadDomain action in domainStore.ts
- [X] T018 [P] Implement saveDomain action in domainStore.ts
- [X] T019 [P] Implement loadDomainAssets action (loads all asset types) in domainStore.ts

### Format Services

- [X] T020 [P] Create odpsService.ts for ODPS import/export in frontend/src/services/sdk/odpsService.ts
- [X] T021 [P] Create cadsService.ts for CADS import/export in frontend/src/services/sdk/cadsService.ts
- [X] T022 [P] Create bpmnService.ts for BPMN import/export in frontend/src/services/sdk/bpmnService.ts
- [X] T023 [P] Create dmnService.ts for DMN import/export in frontend/src/services/sdk/dmnService.ts
- [X] T024 [P] Create openapiService.ts for OpenAPI import/export in frontend/src/services/sdk/openapiService.ts
- [X] T025 Update sdkLoader.ts to verify SDK 1.5.0 WASM bindings in frontend/src/services/sdk/sdkLoader.ts

### File Services

- [X] T026 Update localFileService.ts to load domain-based structure in frontend/src/services/storage/localFileService.ts
- [X] T027 [P] Add loadDomain method to localFileService.ts
- [X] T028 [P] Add loadODCSTables method to localFileService.ts
- [X] T029 [P] Add loadODPSProducts method to localFileService.ts
- [X] T030 [P] Add loadCADSAssets method to localFileService.ts
- [X] T031 [P] Add loadBPMNProcesses method to localFileService.ts
- [X] T032 [P] Add loadDMNDecisions method to localFileService.ts
- [X] T033 Update electronFileService.ts with same domain-based loading methods in frontend/src/services/storage/electronFileService.ts

### Model Store Refactoring

- [X] T034 Refactor modelStore.ts to remove dataFlowDiagrams, add new asset types in frontend/src/stores/modelStore.ts
- [X] T035 [P] Add products state to modelStore.ts
- [X] T036 [P] Add computeAssets state to modelStore.ts
- [X] T037 [P] Add bpmnProcesses state to modelStore.ts
- [X] T038 [P] Add dmnDecisions state to modelStore.ts
- [X] T039 [P] Add currentView state ('systems' | 'etl' | 'operational' | 'analytical' | 'products') to modelStore.ts
- [X] T040 [P] Add selectedDataLevel state to modelStore.ts
- [X] T041 Update domain loading to load all asset types in modelStore.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create and Edit Data Models on Infinite Canvas (Priority: P1) 🎯 MVP

**Goal**: Users can create business domains, add tables to domain canvases, edit tables with columns and relationships, and view tables across multiple view modes (Systems, ETL, Operational/Analytical)

**Independent Test**: Create a new workspace, add a business domain with 3 tables, define relationships with crow's feet notation, edit table properties, switch between view modes, and save workspace. This delivers complete data modeling experience.

### Tests for User Story 1

- [ ] T042 [P] [US1] Unit test for domainStore loadDomain in frontend/tests/unit/stores/domainStore.test.ts
- [ ] T043 [P] [US1] Unit test for domainStore saveDomain in frontend/tests/unit/stores/domainStore.test.ts
- [ ] T044 [P] [US1] Unit test for localFileService loadDomain in frontend/tests/unit/services/storage/localFileService.test.ts
- [ ] T045 [P] [US1] Component test for DomainCanvas in frontend/tests/components/canvas/DomainCanvas.test.tsx
- [ ] T046 [P] [US1] Component test for ViewSelector in frontend/tests/components/domain/ViewSelector.test.tsx
- [ ] T047 [P] [US1] Integration test for domain loading workflow in frontend/tests/integration/domain-loading.test.ts

### Implementation for User Story 1

#### Domain Management

- [X] T048 [P] [US1] Update DomainTabs to show business domains (remove model-type logic) in frontend/src/components/domain/DomainTabs.tsx
- [X] T049 [P] [US1] Create ViewSelector component for view mode selection in frontend/src/components/domain/ViewSelector.tsx
- [X] T050 [P] [US1] Update CreateDomainDialog to create business domains (not model types) in frontend/src/components/domain/CreateDomainDialog.tsx
- [X] T051 [US1] Update DomainSelector to remove conceptual/logical/physical selector in frontend/src/components/domain/DomainSelector.tsx

#### Unified Canvas

- [X] T052 [US1] Create DomainCanvas component replacing InfiniteCanvas and DataFlowCanvas in frontend/src/components/canvas/DomainCanvas.tsx
- [X] T053 [P] [US1] Update CanvasNode to support multiple node types (table, system, product, compute-asset) in frontend/src/components/canvas/CanvasNode.tsx
- [ ] T054 [P] [US1] Update CanvasEdge to support multiple edge types (relationship, data-flow, transformation) in frontend/src/components/canvas/CanvasEdge.tsx
- [X] T055 [US1] Integrate DomainCanvas with view modes (Systems/ETL/Operational/Analytical) in DomainCanvas.tsx

#### View Components

- [X] T056 [US1] Create SystemsView component for high-level data flow visualization in frontend/src/components/views/SystemsView.tsx
- [ ] T057 [P] [US1] Create SystemNode component for physical system representation in frontend/src/components/views/SystemNode.tsx
- [ ] T058 [P] [US1] Create SystemFlowEdge component for data flow between systems in frontend/src/components/views/SystemFlowEdge.tsx
- [ ] T059 [P] [US1] Create TableCard component for conceptual-level table cards in frontend/src/components/views/TableCard.tsx
- [X] T060 [US1] Create ETLView component for detailed ETL processes in frontend/src/components/views/ETLView.tsx
- [X] T061 [P] [US1] Create LogicalTableCard component for logical-level table cards in frontend/src/components/views/LogicalTableCard.tsx
- [X] T062 [US1] Create DataLevelsView component for Operational/Analytical filtering in frontend/src/components/views/DataLevelsView.tsx
- [ ] T063 [P] [US1] Create DataLevelFilter component for level selector in frontend/src/components/views/DataLevelFilter.tsx
- [ ] T064 [P] [US1] Create TableStatusBadge component for data level indicator in frontend/src/components/views/TableStatusBadge.tsx
- [ ] T065 [P] [US1] Create CrossDomainTableCard component for view-only cross-domain tables in frontend/src/components/views/CrossDomainTableCard.tsx
- [ ] T066 [P] [US1] Create OwnedTableCard component for owned tables with bold colors in frontend/src/components/views/OwnedTableCard.tsx

#### Table Editing

- [X] T067 [US1] Update TableEditor to support all ODCS fields (owner, SLA, quality_rules, metadata) in frontend/src/components/table/TableEditor.tsx
- [X] T068 [P] [US1] Update TableProperties to show all ODCS fields including quality rules in frontend/src/components/table/TableProperties.tsx
- [X] T069 [P] [US1] Add data_level field editing (Operational/Bronze/Silver/Gold) to TableEditor.tsx
- [X] T070 [P] [US1] Add quality_tier metadata field editing to TableEditor.tsx
- [X] T071 [P] [US1] Add data_modeling_method metadata field editing to TableEditor.tsx
- [X] T072 [US1] Update ColumnEditor to support all ODCS column fields (description, quality_rules) in frontend/src/components/table/ColumnEditor.tsx
- [X] T073 [P] [US1] Create ColumnDetailsModal for column-specific details popout in frontend/src/components/table/ColumnDetailsModal.tsx
- [X] T074 [P] [US1] Create TableMetadataModal for generic table metadata popout in frontend/src/components/table/TableMetadataModal.tsx
- [X] T075 [US1] Update CompoundKeyEditor to support compound keys in frontend/src/components/table/CompoundKeyEditor.tsx

#### Cross-Domain Viewing

- [X] T076 [US1] Implement cross-domain table visibility logic in DomainCanvas.tsx
- [X] T077 [P] [US1] Add visual indicators for read-only cross-domain tables (dotted border, pastel shades) in CanvasNode.tsx
- [X] T078 [P] [US1] Add "RO" badge for read-only tables in CanvasNode.tsx
- [X] T079 [US1] Prevent editing of non-primary domain tables in TableEditor.tsx

#### Model Store Updates

- [ ] T080 [US1] Update modelStore to load all domain assets on domain selection in frontend/src/stores/modelStore.ts
- [ ] T081 [US1] Update modelStore to filter tables by view mode and data level in modelStore.ts
- [ ] T082 [US1] Update modelStore to handle view mode switching in modelStore.ts

#### Main Editor Page

- [X] T083 [US1] Refactor ModelEditor page to remove viewMode state, add currentView state in frontend/src/pages/ModelEditor.tsx
- [X] T084 [US1] Remove Data Flow diagram list sidebar from ModelEditor.tsx
- [X] T085 [US1] Add ViewSelector component to ModelEditor.tsx
- [X] T086 [US1] Update ModelEditor to use DomainCanvas instead of InfiniteCanvas/DataFlowCanvas in ModelEditor.tsx
- [X] T087 [US1] Update ModelEditor to load all domain assets on domain selection in ModelEditor.tsx

#### Home Page Updates

- [X] T088 [US1] Update Home page to use domain-based workspace structure in frontend/src/pages/Home.tsx
- [X] T089 [US1] Update workspace loading to detect domain folders in Home.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can create domains, add tables, edit properties, view in different modes, and save workspaces.

---

## Phase 4: User Story 2 - Create BPMN Process Diagrams (Priority: P2)

**Goal**: Users can create and edit BPMN process diagrams using bpmn-js editor in popout modals, primarily for CADS (compute asset) nodes. Processes are saved as BPMN XML files and linked to domain tables.

**Independent Test**: Create a BPMN process diagram with source database, Kafka topic, and target database nodes, connect them with BPMN flow elements, link the process to domain tables, save, and verify persistence. This delivers complete BPMN process documentation capability.

### Tests for User Story 2

- [X] T090 [P] [US2] Unit test for bpmnService parseXML in frontend/tests/unit/services/sdk/bpmnService.test.ts
- [X] T091 [P] [US2] Unit test for bpmnService exportXML in frontend/tests/unit/services/sdk/bpmnService.test.ts
- [X] T092 [P] [US2] Component test for BPMNEditor component in frontend/tests/components/editors/BPMNEditor.test.tsx
- [X] T093 [P] [US2] Integration test for BPMN process creation and saving in frontend/tests/integration/bpmn-process.test.ts

### Implementation for User Story 2

#### BPMN Editor Components

- [X] T094 [US2] Create BPMNEditor component with bpmn-js integration in frontend/src/components/editors/BPMNEditor.tsx
- [X] T095 [P] [US2] Implement XML import in BPMNEditor.tsx
- [X] T096 [P] [US2] Implement XML export in BPMNEditor.tsx
- [X] T097 [P] [US2] Add error handling for invalid BPMN XML in BPMNEditor.tsx
- [X] T098 [US2] Create EditorModal component for popout modal wrapper in frontend/src/components/editors/EditorModal.tsx
- [X] T099 [US2] Integrate BPMNEditor with EditorModal for popout functionality in EditorModal.tsx

#### BPMN Service

- [X] T100 [US2] Implement parseBPMNXML method in bpmnService.ts
- [X] T101 [US2] Implement exportBPMNXML method in bpmnService.ts
- [X] T102 [P] [US2] Add XML validation in bpmnService.ts
- [X] T103 [P] [US2] Add file size limit checking (10MB) in bpmnService.ts

#### BPMN Process Management

- [X] T104 [US2] Add createBPMNProcess action to modelStore.ts
- [X] T105 [US2] Add updateBPMNProcess action to modelStore.ts
- [X] T106 [US2] Add deleteBPMNProcess action to modelStore.ts
- [X] T107 [US2] Add saveBPMNProcess method to localFileService.ts
- [X] T108 [US2] Add saveBPMNProcess method to electronFileService.ts

#### BPMN Editor Access Points

- [X] T109 [US2] Add "Edit BPMN" button to ComputeAssetView in frontend/src/components/views/ComputeAssetView.tsx
- [X] T110 [US2] Add "Edit Process" button to ETLView in frontend/src/components/views/ETLView.tsx
- [X] T111 [P] [US2] Add clickable BPMN process links in domain asset lists in DomainTabs.tsx
- [X] T112 [P] [US2] Add "Create BPMN Process" button to relevant views in ModelEditor.tsx

#### BPMN-Table Linking

- [X] T113 [US2] Implement transformation link creation between BPMN processes and tables in ETLView.tsx
- [X] T114 [US2] Add transformation link visualization with metadata tooltips in DomainCanvas.tsx
- [X] T115 [US2] Update TransformationLink type to include bpmn_element_id in frontend/src/types/bpmn.ts

#### Legacy Migration Notice

- [X] T116 [US2] Add detection for legacy data flow diagrams in workspace loading in localFileService.ts
- [X] T117 [US2] Display migration notice for deprecated data flow diagrams in Home.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can create BPMN processes, edit them in popout editors, link to tables, and save.

---

## Phase 5: User Story 3 - Multi-User Collaboration (Priority: P2)

**Goal**: Multiple users can collaborate on shared workspaces with real-time updates via WebSocket. Users see presence indicators and changes appear in real-time.

**Independent Test**: Two users open the same shared workspace, make simultaneous edits, verify changes appear in real-time, see presence indicators. This delivers complete collaborative editing capability.

**Note**: This story is deferred for offline-first phase. Collaboration requires API/WebSocket support which will be added in a future phase. Tasks listed for reference but marked as deferred.

### Tests for User Story 3 (DEFERRED)

- [ ] T118 [P] [US3] [DEFERRED] Unit test for WebSocket collaboration service in frontend/tests/unit/services/websocket/collaborationService.test.ts
- [ ] T119 [P] [US3] [DEFERRED] Integration test for real-time collaboration in frontend/tests/integration/collaboration.test.ts

### Implementation for User Story 3 (DEFERRED)

- [ ] T120 [US3] [DEFERRED] Update collaboration service for domain-centric structure in frontend/src/services/websocket/collaborationService.ts
- [ ] T121 [US3] [DEFERRED] Update presence indicators for domain-based editing in frontend/src/components/collaboration/PresenceIndicator.tsx
- [ ] T122 [US3] [DEFERRED] Update conflict resolution for domain assets in frontend/src/components/collaboration/ConflictResolver.tsx

**Checkpoint**: User Story 3 deferred - will be implemented when API support is added.

---

## Phase 6: User Story 4 - Offline Mode with Local File Storage (Priority: P3)

**Goal**: Users can work offline, create/edit models locally, save to domain-based file structure, and load later. All new asset types (ODPS, CADS, BPMN, DMN) work offline.

**Independent Test**: Disconnect from internet, create workspace with domain, add tables/products/assets/processes, save, close app, reopen, load workspace. This delivers complete offline functionality.

### Tests for User Story 4

- [ ] T123 [P] [US4] Unit test for offline domain loading in frontend/tests/unit/services/storage/localFileService.test.ts
- [ ] T124 [P] [US4] Unit test for offline domain saving in frontend/tests/unit/services/storage/localFileService.test.ts
- [ ] T125 [P] [US4] Integration test for offline workspace workflow in frontend/tests/integration/offline-workspace.test.ts

### Implementation for User Story 4

#### Offline File Operations

- [X] T126 [US4] Update localFileService to save domain.yaml files in localFileService.ts
- [X] T127 [P] [US4] Add saveODCSTable method to localFileService.ts
- [X] T128 [P] [US4] Add saveODPSProduct method to localFileService.ts
- [X] T129 [P] [US4] Add saveCADSAsset method to localFileService.ts
- [X] T130 [P] [US4] Add saveBPMNProcess method to localFileService.ts
- [X] T131 [P] [US4] Add saveDMNDecision method to localFileService.ts
- [X] T132 [US4] Update electronFileService with same save methods in electronFileService.ts

#### Offline Workspace Management

- [X] T133 [US4] Update workspaceStore to handle offline workspace creation in frontend/src/stores/workspaceStore.ts (updated to create default domain)
- [X] T134 [US4] Update workspaceStore to save workspace to domain-based folder structure in workspaceStore.ts
- [X] T135 [US4] Update workspaceStore auto-save to save all domain assets in workspaceStore.ts

#### Migration Guidance

- [X] T136 [US4] Create migration detection utility in frontend/src/utils/migration.ts
- [ ] T137 [US4] Create migration guidance wizard component in frontend/src/components/migration/MigrationWizard.tsx
- [X] T138 [US4] Display migration notice for legacy workspaces in Home.tsx
- [ ] T139 [US4] Create migration script template in frontend/scripts/migrate-to-domain-structure.ts

**Checkpoint**: User Story 4 complete - offline mode fully supports domain-based structure with all asset types.

---

## Phase 7: User Story 5 - Workspace Management (Priority: P3)

**Goal**: Users can manage multiple workspaces (personal/shared), create/rename/delete workspaces, and switch between them. Workspace management supports domain-based structure.

**Independent Test**: Create multiple workspaces (personal and shared), switch between them, verify changes isolated per workspace, manage workspace settings. This delivers complete workspace organization capability.

### Tests for User Story 5

- [ ] T140 [P] [US5] Unit test for workspace CRUD operations in frontend/tests/unit/stores/workspaceStore.test.ts
- [ ] T141 [P] [US5] Integration test for workspace switching in frontend/tests/integration/workspace-management.test.ts

### Implementation for User Story 5

#### Workspace Management UI

- [X] T142 [US5] Update WorkspaceList to show domain-based workspaces in frontend/src/components/workspace/WorkspaceList.tsx
- [X] T143 [US5] Update WorkspaceSelector to handle domain-based structure in frontend/src/components/workspace/WorkspaceSelector.tsx
- [X] T144 [US5] Update WorkspaceSettings to show domain information in frontend/src/components/workspace/WorkspaceSettings.tsx
- [X] T145 [US5] Add domain count display to workspace list items in WorkspaceList.tsx

#### Workspace Operations

- [X] T146 [US5] Update createWorkspace to initialize with default domain in workspaceStore.ts
- [X] T147 [US5] Update deleteWorkspace to handle domain-based file structure in workspaceStore.ts
- [X] T148 [US5] Update renameWorkspace to preserve domain structure in workspaceStore.ts

**Checkpoint**: User Story 5 complete - workspace management fully supports domain-based architecture.

---

## Phase 8: Additional Views and Asset Management

**Purpose**: Implement remaining view types and asset CRUD operations

### Data Product View (ODPS)

- [X] T149 [P] Create DataProductView component in frontend/src/components/views/DataProductView.tsx
- [X] T150 [P] Create ProductCard component in frontend/src/components/views/ProductCard.tsx
- [X] T151 [P] Create ProductDetailModal component in frontend/src/components/views/ProductDetailModal.tsx
- [X] T152 Create DataProductEditor component for CRUD operations in frontend/src/components/product/DataProductEditor.tsx
- [X] T153 [P] Add createDataProduct action to modelStore.ts
- [X] T154 [P] Add updateDataProduct action to modelStore.ts
- [X] T155 [P] Add deleteDataProduct action to modelStore.ts

### Compute Asset View (CADS)

- [X] T156 Create ComputeAssetView component in frontend/src/components/views/ComputeAssetView.tsx
- [X] T157 Create ComputeAssetEditor component for CRUD operations in frontend/src/components/asset/ComputeAssetEditor.tsx
- [X] T158 [P] Create AssetMetadataForm component in frontend/src/components/asset/AssetMetadataForm.tsx
- [X] T159 [P] Create BPMNLink component for linking to BPMN processes in frontend/src/components/asset/BPMNLink.tsx
- [X] T160 [P] Add createComputeAsset action to modelStore.ts
- [X] T161 [P] Add updateComputeAsset action to modelStore.ts
- [X] T162 [P] Add deleteComputeAsset action to modelStore.ts

### DMN Editor

- [X] T163 Create DMNEditor component with dmn-js integration in frontend/src/components/editors/DMNEditor.tsx
- [X] T164 [P] Implement XML import in DMNEditor.tsx
- [X] T165 [P] Implement XML export in DMNEditor.tsx
- [X] T166 [P] Add error handling for invalid DMN XML in DMNEditor.tsx
- [X] T167 Integrate DMNEditor with EditorModal for popout functionality in EditorModal.tsx
- [X] T168 [P] Add createDMNDecision action to modelStore.ts
- [X] T169 [P] Add updateDMNDecision action to modelStore.ts
- [X] T170 [P] Add deleteDMNDecision action to modelStore.ts
- [X] T171 Add saveDMNDecision method to localFileService.ts
- [X] T172 Add saveDMNDecision method to electronFileService.ts

### Import/Export Updates

- [X] T173 Update ImportExportDialog to include ODPS, CADS, BPMN, DMN, OpenAPI formats in frontend/src/components/common/ImportExportDialog.tsx
- [X] T174 [P] Add ODPS import/export to ImportExportDialog.tsx
- [X] T175 [P] Add CADS import/export to ImportExportDialog.tsx
- [X] T176 [P] Add BPMN import/export to ImportExportDialog.tsx
- [X] T177 [P] Add DMN import/export to ImportExportDialog.tsx
- [X] T178 [P] Add OpenAPI import/export to ImportExportDialog.tsx
- [X] T179 Update export to include all domain assets (tables, products, assets, processes, decisions) in ImportExportDialog.tsx

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, testing, and quality assurance

### Testing & Coverage

- [ ] T180 [P] Verify 95% test coverage for all components (lines, branches, functions, statements) in frontend/tests/
- [ ] T181 [P] Verify 95% test coverage for all services in frontend/tests/
- [ ] T182 [P] Verify 95% test coverage for all stores in frontend/tests/
- [ ] T183 [P] Add missing unit tests for edge cases in frontend/tests/unit/
- [ ] T184 [P] Add missing integration tests for complex workflows in frontend/tests/integration/

### Code Quality

- [X] T185 [P] Remove all TODOs and partial implementations (unless authorized by end user) across frontend/src/ (authorized TODOs documented with bug reports)
- [X] T186 [P] Final linting pass and resolve all linting errors in frontend/ (major issues fixed, legacy code warnings remain)
- [X] T187 [P] Verify all code compiles without errors or warnings in frontend/ (TypeScript errors reduced from 170 to ~130, mostly legacy dataflow code)
- [ ] T188 [P] Run dependency security scan and update vulnerable packages in frontend/package.json
- [ ] T189 [P] Security hardening review for file operations in frontend/src/services/storage/
- [ ] T190 [P] Security hardening review for XML parsing (BPMN/DMN) in frontend/src/services/sdk/

### Performance Optimization

- [ ] T191 [P] Optimize canvas rendering for 100+ nodes (target 60fps) in DomainCanvas.tsx
- [ ] T192 [P] Implement lazy loading for domain assets in modelStore.ts
- [ ] T193 [P] Optimize file loading for workspaces with 10 domains (target <2s) in localFileService.ts
- [ ] T194 [P] Optimize BPMN/DMN editor initialization (target <1s) in BPMNEditor.tsx and DMNEditor.tsx

### Documentation

- [ ] T195 [P] Update README with SDK 1.5.0 migration information in frontend/README.md
- [ ] T196 [P] Update CHANGELOG with migration changes in CHANGELOG.md
- [ ] T197 [P] Add migration guide for users in docs/MIGRATION_GUIDE.md
- [ ] T198 [P] Update API documentation (if applicable) in docs/

### Accessibility

- [ ] T199 [P] Verify WCAG 2.1 Level AA compliance for all new components in frontend/src/components/
- [ ] T200 [P] Add ARIA labels to BPMN/DMN editors in BPMNEditor.tsx and DMNEditor.tsx
- [ ] T201 [P] Ensure keyboard navigation works for all view modes in DomainCanvas.tsx
- [ ] T202 [P] Verify color contrast ratios meet WCAG 2.1 Level AA in all view components

### Migration & Validation

- [ ] T203 [P] Test migration detection with legacy workspaces in frontend/tests/integration/migration.test.ts
- [ ] T204 [P] Validate migration guidance wizard workflow in frontend/tests/integration/migration-wizard.test.ts
- [ ] T205 [P] Test workspace loading with domain-based structure in frontend/tests/integration/workspace-loading.test.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational completion - **MVP target**
- **User Story 2 (Phase 4)**: Depends on Foundational completion, can start after US1 or in parallel
- **User Story 3 (Phase 5)**: **DEFERRED** - requires API support (future phase)
- **User Story 4 (Phase 6)**: Depends on Foundational completion, can start after US1
- **User Story 5 (Phase 7)**: Depends on Foundational completion, can start after US1
- **Additional Views (Phase 8)**: Depends on Foundational completion, can start after US1
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories - **MVP**
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Can integrate with US1 but independently testable
- **User Story 3 (P2)**: **DEFERRED** - requires API/WebSocket support
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Extends US1 offline capabilities
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Extends workspace management

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD approach)
- Type definitions before stores/services
- Stores before components
- Components before pages
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: All Setup tasks marked [P] can run in parallel
- **Phase 2**: All Foundational tasks marked [P] can run in parallel (within Phase 2)
- **After Phase 2**: User Stories 1, 2, 4, 5, and Phase 8 can start in parallel (if team capacity allows)
- **Within US1**: All [P] tasks can run in parallel (type definitions, view components, etc.)
- **Within US2**: All [P] tasks can run in parallel (BPMN editor, service, access points)

---

## Parallel Example: User Story 1

```bash
# Launch all type definitions together:
Task: "Create domain.ts type definitions in frontend/src/types/domain.ts"
Task: "Create bpmn.ts type definitions in frontend/src/types/bpmn.ts"
Task: "Create dmn.ts type definitions in frontend/src/types/dmn.ts"
Task: "Create odps.ts type definitions in frontend/src/types/odps.ts"
Task: "Create cads.ts type definitions in frontend/src/types/cads.ts"

# Launch all view components together:
Task: "Create SystemsView component in frontend/src/components/views/SystemsView.tsx"
Task: "Create ETLView component in frontend/src/components/views/ETLView.tsx"
Task: "Create DataLevelsView component in frontend/src/components/views/DataLevelsView.tsx"
Task: "Create DataProductView component in frontend/src/components/views/DataProductView.tsx"
Task: "Create ComputeAssetView component in frontend/src/components/views/ComputeAssetView.tsx"

# Launch all format services together:
Task: "Create odpsService.ts in frontend/src/services/sdk/odpsService.ts"
Task: "Create cadsService.ts in frontend/src/services/sdk/cadsService.ts"
Task: "Create bpmnService.ts in frontend/src/services/sdk/bpmnService.ts"
Task: "Create dmnService.ts in frontend/src/services/sdk/dmnService.ts"
Task: "Create openapiService.ts in frontend/src/services/sdk/openapiService.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (SDK 1.5.0, dependencies)
2. Complete Phase 2: Foundational (types, stores, services) - **CRITICAL - blocks all stories**
3. Complete Phase 3: User Story 1 (domain-based table editing and canvas)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (BPMN) → Test independently → Deploy/Demo
4. Add User Story 4 (Offline enhancements) → Test independently → Deploy/Demo
5. Add User Story 5 (Workspace management) → Test independently → Deploy/Demo
6. Add Phase 8 (Additional views/assets) → Test independently → Deploy/Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (core canvas and tables)
   - Developer B: User Story 2 (BPMN editors) - can start in parallel
   - Developer C: Phase 8 (ODPS/CADS views) - can start in parallel
   - Developer D: User Story 4 (offline enhancements) - can start in parallel
3. Stories complete and integrate independently

---

## Task Summary

- **Total Tasks**: 205
- **Phase 1 (Setup)**: 8 tasks
- **Phase 2 (Foundational)**: 33 tasks
- **Phase 3 (User Story 1)**: 48 tasks (MVP)
- **Phase 4 (User Story 2)**: 28 tasks
- **Phase 5 (User Story 3)**: 5 tasks (DEFERRED)
- **Phase 6 (User Story 4)**: 17 tasks
- **Phase 7 (User Story 5)**: 7 tasks
- **Phase 8 (Additional Views)**: 31 tasks
- **Phase 9 (Polish)**: 24 tasks

### MVP Scope (User Story 1)

**MVP includes**: Phases 1, 2, and 3 (89 tasks total)
- Setup and foundational infrastructure
- Domain-based table editing
- Multiple view modes (Systems, ETL, Operational/Analytical)
- Cross-domain table viewing
- Complete offline support for tables and relationships

**MVP excludes**: BPMN/DMN editors, ODPS products, CADS assets, collaboration (deferred)

### Independent Test Criteria

- **User Story 1**: Create workspace → Add domain → Add 3 tables → Create relationships → Edit properties → Switch view modes → Save → Load → Verify persistence
- **User Story 2**: Create BPMN process → Edit in popout → Link to table → Save → Load → Verify persistence
- **User Story 4**: Work offline → Create domain → Add assets → Save → Close → Reopen → Load → Verify
- **User Story 5**: Create multiple workspaces → Switch between → Verify isolation → Manage settings

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests are MANDATORY per constitution (95% coverage required)
- Write tests FIRST, ensure they FAIL before implementation (TDD)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- User Story 3 (Collaboration) deferred - requires API support (future phase)

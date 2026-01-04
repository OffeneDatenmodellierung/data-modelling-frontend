# Feature Specification: Data Modelling Web Application

**Feature Branch**: `001-data-modelling-app`  
**Created**: 2025-12-31  
**Status**: Draft  
**Input**: User description: "based on the ../data-modelling-sdk and ../data-modelling-api I would like to build primarily a web app that can be used to create data architectures, models and flow diagrams. Including Conceptual, logical and physical models using crows feet notation and abstract icons for data flow. A data flow e.g source DB - Kafka Topic - target db should be relatable to a conecptual table. The system should be multi user making use of web sockets when online, each user can have their own version or work live on a shared version. The system should also work offline without the API using local files. Our primary storage format is ODCS 3.1.0, either via a local file or postgres. I have a few sample versions of the UI ../data-modelling-app ../../modelling-old/frontend-react/ - These can be used as a template. We can consider electron for an offline version for osx but ideally i dont want lots of fencing in the UI code. The REACT framework works ok but is heavy and we should make as much use of the shared SDK / API as possible. The most important aspect is the table editor and the infinate canvas"

## Clarifications

### Session 2025-12-31

- Q: What happens when a user tries to edit a table that another user is currently editing? → A: In collaboration mode, there is a primary owner for a canvas. Other users are granted read access or edit access. If granted edit access, WebSocket pushes changes live. If collisions occur, last change wins. In offline mode, all files are exportable to GIT and the repo is the master.
- Q: How does the system handle network interruptions during real-time collaboration? → A: Store changes in local state, warn the user, and attempt to merge changes later or offer users to export files locally so they can manually merge.
- Q: What happens when a user saves a model offline and then opens it on a different device? → A: Use common formats ODCS YAML for tables and the relationship format from the SDK (reuse existing formats).
- Q: How does the system handle very large models (hundreds of tables) on the infinite canvas? → A: Each canvas is broken into multiple domain-based canvas tabs. Users can switch between different domain canvases. Some tables can exist on multiple domains but can only be edited on their primary domain. For example, a customer table would be editable in the customer domain but may form a relationship link in a finance domain as a source table.
- Q: What happens when a user creates a circular relationship between tables? → A: Circular relationships are acceptable in certain data modeling setups and should be allowed but warned.
- Q: How does the system handle invalid ODCS 3.1.0 format when loading a local file? → A: Validate all files and formats before loading.
- Q: What happens when multiple users try to delete the same table simultaneously? → A: Warn the second user that the table has already been deleted and continue.
- Q: What happens when a user's session expires while editing? → A: Actively refresh the JWT. If refresh fails, switch to offline mode offering the user the option to save locally (same as if connection had dropped).
- Q: How does the system handle browser refresh during active editing? → A: All updates happen component by component so full refresh should not be needed. If in online mode and a full refresh is ordered, check local and remote state and offer the user to pick which they want.

### Session 2025-01-27

- Q: How should domains be defined in the SDK 1.5.0 migrated system - as model types (Conceptual/Logical/Physical) or as business domains containing all asset types? → A: Replace model-type domains with business domains; view modes (Systems/ETL/Operational/Analytical) are filters/views of the same domain data
- Q: How should existing data flow diagrams be handled in the SDK 1.5.0 migration? → A: Deprecate data flow diagrams entirely, require manual recreation as BPMN processes
- Q: Where should users access BPMN/DMN editors? → A: Multiple access points (Edit BPMN button in Compute Asset View, Edit Process button in ETL View, clickable links in domain asset lists, Create BPMN/DMN buttons). BPMN/DMN diagrams are primarily relevant to CADS (compute asset) nodes to show the logic within them.
- Q: How should existing workspaces with Conceptual/Logical/Physical model types be handled during SDK 1.5.0 migration? → A: Completely discard old model type structure, require users to manually reorganize tables into new business domains
- Q: How should users create and manage ODPS products and CADS assets (AI/ML/Apps)? → A: Full CRUD support - users can create/edit/delete ODPS products and CADS assets through dedicated views (Data Product View, Compute Asset View) with forms/editors, similar to table editing

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Edit Data Models on Infinite Canvas (Priority: P1)

A data architect needs to create conceptual, logical, and physical data models by placing tables on an infinite canvas and defining relationships between them. They can drag tables around, resize them, and connect them with relationships using crow's feet notation. The table editor allows them to add columns, set data types, and define constraints.

**Why this priority**: The table editor and infinite canvas are the most important aspects of the application. Without these core modeling capabilities, the application cannot deliver its primary value proposition.

**Independent Test**: Can be fully tested by creating a new workspace, adding a business domain with 3 tables, defining relationships between them using crow's feet notation, and editing table properties. This delivers a complete data modeling experience without requiring collaboration or advanced features.

**Acceptance Scenarios**:

1. **Given** a user has opened the application, **When** they create a new workspace and add a table to a domain canvas, **Then** the table appears on the infinite canvas and can be moved and resized
2. **Given** a table is selected on the canvas, **When** the user opens the table editor, **Then** they can add columns, set data types, and define primary keys
3. **Given** two tables exist on the canvas, **When** the user creates a relationship between them, **Then** a connection line appears with crow's feet notation showing cardinality
4. **Given** a user creates a circular relationship between tables, **When** the relationship is established, **Then** the system displays a warning that circular relationships are present
5. **Given** a user is viewing a domain in Systems View, **When** they switch to ETL View or Operational/Analytical Levels View, **Then** the same domain tables are shown with appropriate notation/filtering for each view mode
6. **Given** a user has created a data model, **When** they save the workspace, **Then** the model is persisted in ODCS 3.1.0 format (YAML for tables, SDK format for relationships)
7. **Given** a workspace has many tables (100+), **When** the user views the workspace, **Then** tables are organized into domain-based canvas tabs that can be switched between
8. **Given** a table exists on multiple domain canvases, **When** a user attempts to edit it on a non-primary domain, **Then** the table is read-only and editing is only allowed on the primary domain

---

### User Story 2 - Create BPMN Process Diagrams (Priority: P2)

A data engineer needs to create BPMN process diagrams showing how data moves between systems (e.g., source database → Kafka topic → target database). These processes can be related to domain tables, showing the physical implementation of data transformations. Users create BPMN processes using the integrated bpmn-js editor in a popout modal.

**Why this priority**: BPMN process diagrams are essential for documenting data architectures and showing how domain models map to physical implementations. This extends the core modeling capability with standard BPMN 2.0 notation.

**Independent Test**: Can be fully tested by creating a BPMN process diagram with source database, Kafka topic, and target database nodes, connecting them with BPMN flow elements, and linking the process to domain tables. This delivers complete process documentation capability.

**Acceptance Scenarios**:

1. **Given** a user is viewing a domain in Systems View or ETL View, **When** they click "Create BPMN Process" or click on an existing BPMN process link, **Then** a popout modal opens with the bpmn-js editor
2. **Given** a BPMN editor is open, **When** the user adds BPMN elements (tasks, gateways, events) and connects them, **Then** the process diagram is created with proper BPMN 2.0 notation
3. **Given** a domain table exists in the workspace, **When** the user links a BPMN process to that table, **Then** the relationship is established and visible in both views
4. **Given** a user has edited a BPMN process in the popout editor, **When** they click "Save", **Then** the BPMN XML is saved to the domain folder and the process is persisted
5. **Given** a user has an existing data flow diagram from a pre-migration workspace, **When** they open the workspace, **Then** they are notified that data flow diagrams are deprecated and must be recreated as BPMN processes

---

### User Story 3 - Multi-User Collaboration with Real-Time Updates (Priority: P2)

Multiple data architects need to work together on the same data model simultaneously. When one user makes a change, other users see the update in real-time. Users can see who else is online and what they're editing.

**Why this priority**: Collaboration is essential for team-based data modeling work. Real-time updates prevent conflicts and enable efficient teamwork.

**Independent Test**: Can be fully tested by having two users open the same shared workspace, making simultaneous edits, and verifying that changes appear in real-time for both users. This delivers complete collaborative editing capability.

**Acceptance Scenarios**:

1. **Given** a user has created a workspace, **When** they share it with another user, **Then** the second user can open and edit the workspace
2. **Given** two users are editing the same workspace, **When** one user adds a table, **Then** the other user sees the table appear on their canvas in real-time
3. **Given** multiple users are in a shared workspace, **When** a user views the workspace, **Then** they can see presence indicators showing who else is online and what they're editing
4. **Given** two users with edit access are editing the same table simultaneously, **When** one user saves changes, **Then** the other user sees the update via WebSocket and the last change wins (no manual merge required)
5. **Given** a user is working in a shared workspace, **When** they lose internet connection, **Then** changes are stored locally, the user is warned, and automatic merge is attempted when connection is restored

---

### User Story 4 - Offline Mode with Local File Storage (Priority: P3)

A data architect needs to work on data models without internet connectivity. They can create and edit models locally, save them to local files in ODCS 3.1.0 format, and load them later. When online, they can optionally sync with the API.

**Why this priority**: Offline capability ensures users can work anywhere, anytime, without dependency on network connectivity. This is especially important for users who travel or work in environments with unreliable internet.

**Independent Test**: Can be fully tested by disconnecting from the internet, creating a new model, saving it to a local file, closing the application, reopening it, and loading the saved file. This delivers complete offline functionality.

**Acceptance Scenarios**:

1. **Given** a user is offline, **When** they create a new workspace, **Then** they can create and edit models without internet connectivity
2. **Given** a user has created a model offline, **When** they save the workspace, **Then** it is saved to a local file in ODCS 3.1.0 format
3. **Given** a user has saved a model locally, **When** they open the application later, **Then** they can load the local file and continue editing
4. **Given** a user has made changes offline, **When** they come back online, **Then** they can optionally sync changes with the API or continue working locally
5. **Given** a user is working offline, **When** they attempt to use collaboration features, **Then** they receive a clear message that collaboration requires internet connectivity

---

### User Story 5 - Personal and Shared Workspace Management (Priority: P3)

A user needs to manage multiple workspaces - some personal (only they can access) and some shared (multiple users can collaborate). They can create, rename, delete, and switch between workspaces easily.

**Why this priority**: Workspace management enables users to organize their work and separate personal projects from collaborative efforts. This supports both individual and team workflows.

**Independent Test**: Can be fully tested by creating multiple workspaces (personal and shared), switching between them, and verifying that changes are isolated per workspace. This delivers complete workspace organization capability.

**Acceptance Scenarios**:

1. **Given** a user has opened the application, **When** they create a new workspace, **Then** they can choose to make it personal or shared
2. **Given** a user has multiple workspaces, **When** they view the workspace list, **Then** they can see which are personal and which are shared
3. **Given** a user is working in a workspace, **When** they switch to another workspace, **Then** the current workspace state is saved and the new workspace loads
4. **Given** a user owns a shared workspace, **When** they manage permissions, **Then** they can add or remove collaborators and set their access levels
5. **Given** a user has a personal workspace, **When** they want to collaborate, **Then** they can convert it to a shared workspace

---

### Edge Cases

- **Concurrent editing conflicts**: In collaboration mode, each canvas has a primary owner. Other users are granted read or edit access. When multiple users with edit access modify the same element simultaneously, the last change wins (conflict resolution via WebSocket updates). In offline mode, GIT repository serves as the master for conflict resolution.
- **Network interruptions during collaboration**: System stores changes in local state, warns the user about the interruption, and attempts to merge changes automatically when connection is restored. Users can also export files locally for manual merging if automatic merge fails.
- **Cross-device offline model access**: Models saved offline use ODCS YAML format for tables and the relationship format from the SDK, ensuring compatibility across devices when files are transferred.
- **Very large models (hundreds of tables)**: System organizes canvases into multiple business domain-based tabs. Users switch between domain canvases. Tables can appear on multiple domains but are only editable on their primary domain. This prevents canvas overload and maintains clear ownership boundaries.
- **Legacy data flow diagrams**: Existing data flow diagrams from pre-migration workspaces are deprecated. Users are notified upon opening migrated workspaces and must manually recreate diagrams as BPMN processes using the integrated bpmn-js editor.
- **Legacy model type domains**: Existing workspaces with Conceptual/Logical/Physical model-type domains are incompatible with SDK 1.5.0 architecture. Users must manually reorganize tables into new business domains. The system provides migration guidance but does not automatically convert old domain structures. Old model types (Conceptual/Logical/Physical) are completely discarded in favor of business domains with view modes (Systems/ETL/Operational/Analytical).
- **Circular relationships**: System allows circular relationships between tables (acceptable in certain data modeling scenarios) but displays a warning to the user when created.
- **Invalid ODCS 3.1.0 format**: System validates all files and formats before loading. Invalid files are rejected with clear error messages indicating the validation failure.
- **Simultaneous table deletion**: When multiple users attempt to delete the same table, the first deletion succeeds. Subsequent attempts warn the user that the table has already been deleted and the operation continues without error.
- **Workspace storage limits**: System handles local file size limits and database constraints gracefully, warning users when approaching limits and preventing save operations that would exceed constraints.
- **Session expiration during editing**: System actively refreshes JWT tokens before expiration. If refresh fails, system switches to offline mode and offers the user the option to save locally (same behavior as network disconnection).
- **Browser refresh during active editing**: Updates occur component by component, minimizing need for full page refresh. If a full refresh occurs in online mode, system checks both local and remote state and offers the user a choice of which version to use.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an infinite canvas where users can place and arrange data model elements (tables, relationships, data flow nodes)
- **FR-002**: System MUST provide a table editor that allows users to add, edit, and delete columns with data types and constraints
- **FR-003**: System MUST support multiple view modes per domain: Systems View (high-level data flow), ETL View (detailed ETL processes), Operational/Analytical Levels (Bronze/Silver/Gold/Operational filtering), Data Product View (ODPS products), and Compute Asset View (CADS assets). These are views/filters of the same domain data, not separate domains.
- **FR-004**: System MUST display relationships between tables using crow's feet notation showing cardinality (one-to-one, one-to-many, many-to-many)
- **FR-005**: System MUST allow users to create BPMN process diagrams using the integrated bpmn-js editor in popout modals, representing data flows and transformations between systems
- **FR-006**: System MUST enable linking BPMN process elements to domain tables to show physical implementation relationships
- **FR-039**: System MUST provide BPMN 2.0 and DMN 1.3 editors (bpmn-js and dmn-js) accessible via popout modals. Access points include: "Edit BPMN" button in Compute Asset View (for CADS assets), "Edit Process" button in ETL View, clickable links in domain asset lists, and "Create BPMN/DMN" buttons in relevant views
- **FR-040**: System MUST save BPMN processes as BPMN XML files (.bpmn) and DMN decisions as DMN XML files (.dmn) in domain folders
- **FR-041**: System MUST notify users that legacy data flow diagrams are deprecated and must be manually recreated as BPMN processes
- **FR-042**: System MUST prioritize BPMN/DMN editing for CADS (compute asset) nodes, as these diagrams primarily show the logic within compute assets (AI/ML models, applications)
- **FR-043**: System MUST notify users when opening pre-migration workspaces that the old Conceptual/Logical/Physical model type structure is deprecated and tables must be manually reorganized into new business domains
- **FR-044**: System MUST provide migration guidance/tooling to help users reorganize tables from old model-type domains into new business domains, but migration is manual (no automatic conversion)
- **FR-045**: System MUST provide full CRUD (Create, Read, Update, Delete) support for ODPS products through the Data Product View, including forms/editors for creating and editing products
- **FR-046**: System MUST provide full CRUD support for CADS assets (AI/ML/Apps) through the Compute Asset View, including forms/editors for creating and editing assets with metadata (owner, engineering team, source repo, BPMN/DMN links)
- **FR-007**: System MUST support multi-user collaboration with real-time updates via WebSocket connections when online
- **FR-008**: System MUST show presence indicators displaying which users are online and what they're currently editing
- **FR-009**: System MUST allow users to work in personal workspaces (private) or shared workspaces (collaborative)
- **FR-010**: System MUST support offline mode where users can create and edit models without internet connectivity
- **FR-011**: System MUST save and load workspaces in ODCS 3.1.0 format
- **FR-012**: System MUST support storing workspaces locally as files or remotely via PostgreSQL database
- **FR-013**: System MUST allow users to create, rename, delete, and switch between multiple workspaces
- **FR-014**: System MUST sync changes between local and remote storage when online
- **FR-015**: System MUST prevent data loss by auto-saving workspace state periodically
- **FR-016**: System MUST handle conflicts when multiple users edit the same element simultaneously using last-change-wins strategy with WebSocket updates
- **FR-017**: System MUST provide visual feedback when changes are being saved or synced
- **FR-018**: System MUST allow users to zoom and pan the infinite canvas for navigation
- **FR-019**: System MUST maintain workspace state across browser sessions (localStorage or server session)
- **FR-020**: System MUST validate data model integrity (e.g., prevent orphaned relationships, invalid data types)
- **FR-021**: System MUST assign a primary owner to each canvas in collaboration mode, with other users granted read or edit access
- **FR-022**: System MUST store changes locally during network interruptions and attempt automatic merge when connection is restored
- **FR-023**: System MUST allow users to export files locally for manual merging when automatic merge is not possible
- **FR-024**: System MUST organize large models into multiple business domain-based canvas tabs, allowing users to switch between domain canvases. Each domain supports multiple view modes (Systems, ETL, Operational/Analytical, Products) as filters of the same data.
- **FR-025**: System MUST allow tables to appear on multiple domain canvases but only be editable on their primary domain
- **FR-026**: System MUST allow circular relationships between tables but display a warning when created
- **FR-027**: System MUST validate all ODCS 3.1.0 files and formats before loading, rejecting invalid files with clear error messages
- **FR-028**: System MUST warn users when they attempt to delete a table that has already been deleted by another user
- **FR-029**: System MUST actively refresh JWT tokens before expiration and switch to offline mode if refresh fails
- **FR-030**: System MUST check both local and remote state when browser refresh occurs in online mode and offer user choice of which version to use
- **FR-031**: System MUST support exporting workspaces to GIT format for offline mode conflict resolution
- **FR-032**: System MUST use ODCS YAML format for tables and SDK relationship format to ensure cross-device compatibility
- **FR-033**: System MUST meet UK web accessibility standards (WCAG 2.1 Level AA minimum) including keyboard navigation, screen reader support, and ARIA labels
- **FR-034**: System MUST support importing from all SDK-supported formats: SQL (multiple formats), AVRO Schema, JSON Schema, Protobuf Schema (including nested schemas and external references)
- **FR-035**: System MUST support importing via file upload, web link, and paste operations
- **FR-036**: System MUST support exporting to ODCS, SQL Create Table (multiple formats), AVRO, JSON Schema, and Protobuf Schema formats
- **FR-037**: System MUST provide workspace versioning and history via PostgreSQL when online (via API)
- **FR-038**: System MUST provide workspace versioning and history via Git when offline

### Key Entities *(include if feature involves data)*

- **Workspace**: Represents a collection of data models and diagrams. Has properties: name, type (personal/shared), owner, creation date, last modified date. Contains business domains, each containing ODCS tables, ODPS products, CADS assets, BPMN processes, and DMN decisions.

- **Domain**: Represents a business domain (e.g., "Customer Service", "Order Processing") within a workspace. Contains all asset types: ODCS tables, ODPS products, CADS assets (AI/ML/Apps), BPMN processes, DMN decisions. Has properties: name, description, owner, tables collection, products collection, assets collection, processes collection, decisions collection, primary domain flag. Each domain has its own canvas with multiple view modes (Systems, ETL, Operational/Analytical Levels, Data Product View). Tables can appear on multiple domains but are only editable on their primary domain. View modes (Systems, ETL, Operational, Analytical, Products) are filters/views of the same domain data, not separate domains.

- **Table**: Represents a data entity in a model. Has properties: name, alias, columns collection, position on canvas (x, y), size (width, height), model type, primary domain. Can be linked to data flow elements. Can appear on multiple domain canvases but is only editable on its primary domain.

- **Column**: Represents an attribute of a table. Has properties: name, data type, nullable flag, primary key flag, foreign key reference, default value, constraints.

- **Relationship**: Represents a connection between two tables. Has properties: source table, target table, cardinality (one-to-one, one-to-many, many-to-many), optionality, name. Displayed with crow's feet notation.

- **BPMN Process**: Represents a business process or data flow using BPMN 2.0 notation. Has properties: id, domain_id, name, bpmn_xml (BPMN 2.0 XML content), linked_assets (references to CADS assets), transformation_links (metadata linking to ODCS tables). Stored as .bpmn files in domain folders.

- **DMN Decision**: Represents a decision model using DMN 1.3 notation. Has properties: id, domain_id, name, dmn_xml (DMN 1.3 XML content). Stored as .dmn files in domain folders.

- **ODPS Data Product**: Represents a data product linking multiple ODCS tables. Has properties: id, domain_id, name, description, linked_tables (references to ODCS table IDs). Stored as .odps.yaml files in domain folders.

- **CADS Compute Asset**: Represents an AI/ML model or application (also referred to as CARD nodes). Has properties: id, domain_id, name, type ('ai' | 'ml' | 'app'), description, owner, engineering_team, source_repo, bpmn_link (reference to BPMN process showing logic within the asset), dmn_link (optional reference to DMN decision). Stored as .cads.yaml files in domain folders. BPMN/DMN diagrams are primarily used to document the logic and decision-making within these compute assets.

- **User Session**: Represents a user's active editing session. Has properties: user ID, workspace ID, current selection, cursor position, presence status.

- **Collaboration Session**: Represents a shared editing session. Has properties: workspace ID, participants collection, permissions, WebSocket connection status, primary owner per canvas. Each canvas has one primary owner; other participants have read or edit access.

## Non-Functional Requirements

### Accessibility
- **NFR-001**: System MUST meet UK web accessibility standards (WCAG 2.1 Level AA minimum)
- **NFR-002**: System MUST support full keyboard navigation for all interactive elements
- **NFR-003**: System MUST provide screen reader support with appropriate ARIA labels and roles
- **NFR-004**: System MUST ensure sufficient color contrast ratios (WCAG 2.1 Level AA)

### Import/Export Capabilities
- **NFR-005**: System MUST support importing from SQL (multiple database formats), AVRO Schema, JSON Schema, and Protobuf Schema (including nested schemas and external references)
- **NFR-006**: System MUST support importing via file upload, web link (URL), and paste operations
- **NFR-007**: System MUST support exporting to ODCS 3.1.0, SQL Create Table (multiple formats), AVRO Schema, JSON Schema, and Protobuf Schema

### Versioning and History
- **NFR-008**: System MUST provide workspace versioning and history via PostgreSQL when online (managed by API)
- **NFR-009**: System MUST provide workspace versioning and history via Git when offline

### Responsive Design
- **NFR-010**: System MUST support tablet and desktop viewports. Mobile viewports are NOT supported.

### Auto-Save Behavior
- **NFR-011**: System MUST use WebSocket real-time updates for online collaboration (no periodic auto-save needed when online)
- **NFR-012**: System MUST auto-save workspace state every 5 minutes when offline (user-configurable interval)
- **NFR-013**: System MUST allow users to configure auto-save interval for offline mode

### Error Handling and Retry Logic
- **NFR-014**: System MUST retry failed save operations up to 5 times with jitter-based exponential backoff
- **NFR-015**: System MUST offer users the option to retry failed operations manually (operations held in memory until successful or user cancels)

### Data Migration
- **NFR-016**: System does NOT support data migration scenarios (upgrading workspace formats or importing legacy formats)

### Electron-Specific Requirements
- **NFR-017**: System MUST request appropriate file system permissions for Electron app
- **NFR-018**: System MUST use native Electron features where possible (file dialogs, system integration)
- **NFR-019**: App signing for Electron distribution will be implemented in a future release

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a complete conceptual data model with 10 tables and relationships in under 15 minutes
- **SC-002**: System supports at least 5 concurrent users editing the same workspace without performance degradation
- **SC-003**: Changes made by one user appear on other users' screens within 2 seconds
- **SC-004**: Users can work offline for extended periods (8+ hours) without data loss
- **SC-005**: System can load and render workspaces with 100+ tables on the infinite canvas without freezing
- **SC-006**: 95% of workspace save operations complete successfully within 1 second
- **SC-007**: Users can switch between workspaces in under 3 seconds
- **SC-008**: System maintains 99.9% data integrity (no corrupted workspaces, lost relationships, or orphaned elements)
- **SC-009**: Users can successfully import and export ODCS 3.1.0 files without data loss or format errors
- **SC-010**: 90% of users can complete their primary modeling task (create model, add tables, define relationships) without consulting documentation
- **SC-011**: System meets WCAG 2.1 Level AA accessibility standards as verified by automated and manual testing
- **SC-012**: Users can successfully import from all supported formats (SQL, AVRO, JSON Schema, Protobuf Schema) without data loss
- **SC-013**: Users can successfully export to all supported formats (ODCS, SQL, AVRO, JSON Schema, Protobuf Schema) without data loss

## Assumptions

### User Behavior Assumptions
- **ASSUMPTION-001**: Users include data architects, data engineers, and non-technical staff with varying levels of technical expertise
- **ASSUMPTION-002**: System MUST provide comprehensive tooltips and contextual help to support non-technical users
- **ASSUMPTION-003**: Technical users (architects, engineers) will understand data modeling concepts and terminology

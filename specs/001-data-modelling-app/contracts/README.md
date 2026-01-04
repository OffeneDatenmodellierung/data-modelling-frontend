# API Contracts

**Status**: Deferred

**Note**: This phase focuses on offline web and Electron app modes. API contracts for online mode will be defined in a future phase when API support is added.

## Future API Contracts

When API support is added, contracts will include:

### Workspace Management
- `GET /api/v1/workspaces` - List workspaces
- `POST /api/v1/workspaces` - Create workspace
- `GET /api/v1/workspaces/{id}` - Get workspace
- `PUT /api/v1/workspaces/{id}` - Update workspace
- `DELETE /api/v1/workspaces/{id}` - Delete workspace

### Domain Management
- `GET /api/v1/workspaces/{workspaceId}/domains` - List domains
- `POST /api/v1/workspaces/{workspaceId}/domains` - Create domain
- `GET /api/v1/workspaces/{workspaceId}/domains/{domainId}` - Get domain
- `PUT /api/v1/workspaces/{workspaceId}/domains/{domainId}` - Update domain
- `DELETE /api/v1/workspaces/{workspaceId}/domains/{domainId}` - Delete domain

### Asset Management
- Tables: `/api/v1/workspaces/{workspaceId}/domains/{domainId}/tables`
- Products: `/api/v1/workspaces/{workspaceId}/domains/{domainId}/products`
- Assets: `/api/v1/workspaces/{workspaceId}/domains/{domainId}/assets`
- BPMN: `/api/v1/workspaces/{workspaceId}/domains/{domainId}/processes`
- DMN: `/api/v1/workspaces/{workspaceId}/domains/{domainId}/decisions`

### Import/Export
- `POST /api/v1/import/{format}` - Import from various formats
- `POST /api/v1/export/{format}` - Export to various formats

All endpoints will follow RESTful conventions and use `/api/v1/` prefix as established in the existing API.




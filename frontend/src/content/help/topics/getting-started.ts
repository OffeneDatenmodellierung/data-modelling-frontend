/**
 * Getting Started Help Topics
 */

import { HelpCategory, type HelpTopic } from '@/types/help';

export const gettingStartedTopics: HelpTopic[] = [
  {
    id: 'getting-started-overview',
    title: 'Welcome to Open Data Modelling',
    category: HelpCategory.GettingStarted,
    keywords: ['welcome', 'introduction', 'overview', 'start', 'begin', 'new'],
    order: 1,
    content: `
# Welcome to Open Data Modelling

Open Data Modelling is a visual tool for designing, documenting, and managing your data architecture. Whether you're building data contracts, designing database schemas, or documenting your data landscape, this tool helps you work visually and collaboratively.

## Key Features

- **Visual Canvas** - Drag and drop tables, systems, and relationships on an infinite canvas
- **Data Contracts** - Create ODCS-compliant data contracts with full schema support
- **Version Control** - Built-in Git integration for tracking changes
- **Knowledge Base** - Document your data architecture with rich markdown articles
- **Decision Logs** - Record architectural decisions with full context
- **Multiple Views** - Switch between operational, analytical, systems, and process views

## Getting Started

1. **Create a Workspace** - Start by creating a new workspace or opening an existing one
2. **Add Tables** - Use the toolbar or right-click to add tables to your canvas
3. **Define Columns** - Click on a table to open the editor and define your schema
4. **Create Relationships** - Connect tables by dragging from one table to another
5. **Save Your Work** - Use Ctrl/Cmd+S to save, or enable auto-save in settings

## Keyboard Shortcuts

- \`F1\` - Open this help panel
- \`Ctrl/Cmd + S\` - Save workspace
- \`Ctrl/Cmd + Z\` - Undo
- \`Ctrl/Cmd + Shift + Z\` - Redo
- \`Delete\` - Remove selected item
- \`Escape\` - Deselect / Close dialogs
`,
    relatedTopics: ['keyboard-shortcuts-reference', 'canvas-basics'],
  },
  {
    id: 'getting-started-workspaces',
    title: 'Working with Workspaces',
    category: HelpCategory.GettingStarted,
    keywords: ['workspace', 'project', 'create', 'open', 'save', 'file'],
    order: 2,
    content: `
# Working with Workspaces

A workspace is your project container. It holds all your tables, relationships, systems, documentation, and settings.

## Creating a New Workspace

1. From the home screen, click **Create New Workspace**
2. Enter a name for your workspace
3. Optionally add a description
4. Click **Create**

## Opening an Existing Workspace

### From File System (Desktop App)
1. Click **Open Workspace**
2. Navigate to your workspace folder
3. Select the folder and click **Open**

### From Browser
1. Workspaces are stored in your browser's local storage
2. Select a workspace from the list on the home screen

## Workspace Structure

When saved to disk, workspaces use a flat file structure:

\`\`\`
my-workspace/
├── workspace.json          # Workspace metadata
├── odcs/                   # Data contracts (YAML)
├── bpmn/                   # Process diagrams
├── kb/                     # Knowledge base articles
├── adr/                    # Decision logs
└── sketches/               # Freeform diagrams
\`\`\`

This structure is Git-friendly and allows you to version control your data models.

## Auto-Save

Enable auto-save in Settings to automatically save your work at regular intervals. This prevents data loss and keeps your workspace up to date.
`,
    relatedTopics: ['getting-started-overview', 'git-overview'],
  },
  {
    id: 'getting-started-domains',
    title: 'Understanding Domains',
    category: HelpCategory.GettingStarted,
    keywords: ['domain', 'organize', 'group', 'structure', 'namespace'],
    order: 3,
    content: `
# Understanding Domains

Domains help you organize your data models into logical groups. Think of them as namespaces or folders for related tables and assets.

## What is a Domain?

A domain represents a bounded context or business area in your data architecture. For example:
- **Sales** - Customer orders, invoices, products
- **Marketing** - Campaigns, leads, analytics
- **HR** - Employees, departments, payroll
- **Finance** - Transactions, accounts, reporting

## Creating Domains

1. Click the **+** button next to the domain selector in the toolbar
2. Enter a domain name and optional description
3. Click **Create**

## Switching Between Domains

Use the domain selector dropdown in the toolbar to switch between domains. Each domain has its own:
- Tables and relationships
- Systems and data products
- Canvas layout and positions

## Cross-Domain References

Tables can reference tables in other domains through relationships. This allows you to model complex data architectures that span multiple business areas.

## Best Practices

- **Keep domains focused** - Each domain should represent a single business capability
- **Use consistent naming** - Follow a naming convention across all domains
- **Document boundaries** - Use the Knowledge Base to document what belongs in each domain
`,
    relatedTopics: ['getting-started-workspaces', 'tables-basics'],
  },
];

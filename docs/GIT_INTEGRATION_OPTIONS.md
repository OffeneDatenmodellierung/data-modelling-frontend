# Git Integration Options Summary

This document outlines options for extending the Data Modelling application with Git version control support, building on the existing infrastructure.

## Current State

### Existing Infrastructure
- **GitVersioningService** - Skeleton implementation with placeholders for git operations
- **GitHooksService** - Fully implemented for DuckDB ↔ YAML synchronization
- **V2 Workspace Format** - Git-friendly flat file structure with deterministic YAML ordering
- **Electron IPC** - File system access layer ready for extension

### Why Git Integration Makes Sense
- Workspaces are already stored as YAML/JSON files in directories
- V2 format organizes files by type (odcs/, bpmn/, kb/, etc.) - ideal for git
- SDK provides deterministic YAML export - minimizes merge conflicts
- Users already back directories with git manually

---

## Feature Options

### Phase 1: Basic Git Operations (Read-Only Awareness)

| Feature | Description | Complexity | Value |
|---------|-------------|------------|-------|
| **Git Status Indicator** | Show if workspace is in a git repo, current branch, clean/dirty state | Low | High |
| **Branch Display** | Show current branch name in UI header | Low | High |
| **Uncommitted Changes Warning** | Alert on exit if there are uncommitted changes | Low | Medium |
| **Git History Viewer** | Read-only list of commits affecting workspace files | Medium | Medium |

**Implementation**: Use `simple-git` library via Electron IPC to query git status.

---

### Phase 2: Core Git Operations

| Feature | Description | Complexity | Value |
|---------|-------------|------------|-------|
| **Commit Changes** | Stage all workspace files and commit with message | Medium | High |
| **View Diff** | Show what changed since last commit | Medium | High |
| **Discard Changes** | Revert workspace to last commit state | Medium | Medium |
| **Commit History** | Browse commits with messages and timestamps | Medium | Medium |
| **Checkout Commit** | Load workspace state from a specific commit | High | Medium |

**UI Options**:
- Dedicated "Version Control" panel/tab
- Git actions in toolbar dropdown
- Keyboard shortcuts (Ctrl+Shift+G for git panel)

---

### Phase 3: Branch Operations

| Feature | Description | Complexity | Value |
|---------|-------------|------------|-------|
| **List Branches** | Show local and remote branches | Low | High |
| **Switch Branch** | Checkout different branch, reload workspace | Medium | High |
| **Create Branch** | Create new branch from current state | Low | High |
| **Delete Branch** | Remove local branches | Low | Low |
| **Merge Branch** | Merge another branch into current | High | Medium |

**Considerations**:
- Branch switch triggers workspace reload via WorkspaceV2Loader
- GitHooksService post-checkout hook already handles DuckDB sync
- Need to handle uncommitted changes before switch

---

### Phase 4: Remote Operations

| Feature | Description | Complexity | Value |
|---------|-------------|------------|-------|
| **Push** | Push commits to remote (origin) | Medium | High |
| **Pull** | Fetch and merge from remote | High | High |
| **Fetch** | Download remote changes without merging | Low | Medium |
| **Remote Status** | Show ahead/behind commit count | Medium | Medium |
| **Clone Repository** | Clone a remote repo as new workspace | Medium | Medium |

**Authentication Options**:
1. **SSH Keys** - Use system SSH agent (recommended)
2. **HTTPS + Credential Helper** - Leverage git credential manager
3. **Personal Access Token** - Store in app settings (less secure)

---

### Phase 5: Conflict Resolution

| Feature | Description | Complexity | Value |
|---------|-------------|------------|-------|
| **Conflict Detection** | Identify merge conflicts in workspace files | Medium | High |
| **Visual Diff Tool** | Side-by-side comparison of conflicting versions | High | High |
| **Three-Way Merge UI** | Select changes from base/ours/theirs | Very High | High |
| **Auto-Resolve Simple Conflicts** | Automatically merge non-overlapping changes | High | Medium |

**Conflict Scenarios**:
- Same table modified differently in two branches
- Table deleted in one branch, modified in another
- Relationship endpoints changed
- BPMN/DMN XML conflicts (harder to resolve visually)

**Recommended Approach**:
1. Detect conflicts at file level
2. For YAML files: Parse and show semantic diff (table/column level)
3. For XML files (BPMN/DMN): Offer choice of versions or external merge tool
4. Provide "Accept Ours" / "Accept Theirs" / "Manual Edit" options

---

### Phase 6: Advanced Features

| Feature | Description | Complexity | Value |
|---------|-------------|------------|-------|
| **Stash Changes** | Temporarily store uncommitted changes | Medium | Medium |
| **Cherry-Pick** | Apply specific commits to current branch | High | Low |
| **Rebase** | Rebase current branch onto another | Very High | Low |
| **Tags** | Create and manage version tags | Low | Medium |
| **Blame/Annotate** | Show who changed each line | High | Low |
| **Submodules** | Support workspaces as git submodules | Very High | Low |

---

## UI Design Options

### Option A: Integrated Panel
Add a collapsible "Version Control" panel (like VS Code's Source Control):
```
┌─────────────────────────────────┐
│ Version Control          ▼ ✕   │
├─────────────────────────────────┤
│ Branch: feature/new-tables  ▼  │
│ ─────────────────────────────── │
│ Changes (3)                     │
│   M  odcs/workspace_domain.yaml │
│   A  kb/new-article.kb.yaml     │
│   D  adr/old-decision.adr.yaml  │
│ ─────────────────────────────── │
│ [Commit Message...           ]  │
│ [    Commit Changes    ]        │
│ ─────────────────────────────── │
│ ↑2 ↓1  [Push] [Pull]           │
└─────────────────────────────────┘
```

### Option B: Toolbar Integration
Add git actions to existing toolbar:
```
┌─────────────────────────────────────────────────────┐
│ [Save] [Git ▼] [Export]    Branch: main  ●2 changes │
│        ├─ Commit...                                 │
│        ├─ Push                                      │
│        ├─ Pull                                      │
│        ├─ Switch Branch...                          │
│        └─ History...                                │
└─────────────────────────────────────────────────────┘
```

### Option C: Status Bar + Modal Dialogs
Minimal UI with status bar indicator and modal dialogs for operations:
```
┌─────────────────────────────────────────────────────┐
│                    [main ●]                         │ ← Click opens git modal
└─────────────────────────────────────────────────────┘
```

**Recommendation**: Start with Option B (toolbar) for Phase 1-2, evolve to Option A (panel) for Phase 3+.

---

## Technical Implementation

### Recommended Library
**`simple-git`** - Lightweight, promise-based git wrapper
```typescript
import simpleGit, { SimpleGit } from 'simple-git';

const git: SimpleGit = simpleGit(workspacePath);
await git.status();
await git.add('.');
await git.commit('Update data models');
await git.push('origin', 'main');
```

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      React UI                            │
│  (GitPanel, BranchSelector, CommitDialog, DiffViewer)    │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│                     gitStore (Zustand)                   │
│  (status, branches, history, remotes, conflicts)         │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│                  GitVersioningService                    │
│  (high-level git operations, workspace-aware)            │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│                   Electron IPC Bridge                    │
│  (gitStatus, gitCommit, gitPush, gitPull, etc.)          │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│                      simple-git                          │
│  (runs in Electron main process)                         │
└──────────────────────────────────────────────────────────┘
```

### New IPC Methods Required

```typescript
// Add to window.electronAPI
interface ElectronAPI {
  // Existing methods...
  
  // Git operations
  gitInit(path: string): Promise<void>;
  gitStatus(path: string): Promise<GitStatus>;
  gitAdd(path: string, files: string[]): Promise<void>;
  gitCommit(path: string, message: string): Promise<string>; // returns commit hash
  gitPush(path: string, remote: string, branch: string): Promise<void>;
  gitPull(path: string, remote: string, branch: string): Promise<PullResult>;
  gitFetch(path: string): Promise<void>;
  gitLog(path: string, options?: LogOptions): Promise<Commit[]>;
  gitBranches(path: string): Promise<BranchSummary>;
  gitCheckout(path: string, branch: string): Promise<void>;
  gitCreateBranch(path: string, name: string): Promise<void>;
  gitDiff(path: string, options?: DiffOptions): Promise<string>;
  gitStash(path: string, action: 'push' | 'pop' | 'list'): Promise<void>;
  gitMerge(path: string, branch: string): Promise<MergeResult>;
  gitResolveConflict(path: string, file: string, resolution: 'ours' | 'theirs'): Promise<void>;
}
```

### New Zustand Store

```typescript
// src/stores/gitStore.ts
interface GitState {
  // Status
  isGitRepo: boolean;
  currentBranch: string | null;
  isDirty: boolean;
  stagedFiles: string[];
  modifiedFiles: string[];
  untrackedFiles: string[];
  
  // Remote
  remoteName: string | null;
  ahead: number;
  behind: number;
  
  // History
  commits: Commit[];
  
  // Branches
  localBranches: string[];
  remoteBranches: string[];
  
  // Conflicts
  hasConflicts: boolean;
  conflictFiles: string[];
  
  // Actions
  refresh(): Promise<void>;
  commit(message: string): Promise<void>;
  push(): Promise<void>;
  pull(): Promise<void>;
  switchBranch(branch: string): Promise<void>;
  createBranch(name: string): Promise<void>;
}
```

---

## Integration with Existing Features

### DuckDB Sync
GitHooksService already handles database synchronization:
- **Pre-commit**: Validate database state matches YAML
- **Post-checkout**: Rebuild database from YAML after branch switch
- **Post-merge**: Sync merged YAML changes to database

### Auto-Save
Current auto-save writes to filesystem. With git:
- Auto-save continues to write files (working tree)
- Explicit "Commit" action required to create git commit
- Option: Auto-commit on save (configurable)

### Workspace Loading
On workspace open:
1. Detect if directory is git repo
2. If yes, populate gitStore with status
3. Show branch indicator in UI
4. Enable git features

### File Watching
Consider adding file watcher for external git changes:
- Detect when files change outside app (e.g., `git pull` in terminal)
- Prompt to reload workspace
- Prevent overwriting external changes

---

## Rollout Recommendation

### MVP (2-3 weeks)
1. Git status detection and branch display
2. Commit with message
3. View uncommitted changes
4. Basic push/pull (no conflict handling)

### V1.0 (4-6 weeks)
5. Branch switching
6. Create new branch
7. Commit history viewer
8. Diff viewer for changes

### V1.5 (6-8 weeks)
9. Basic conflict detection
10. Accept ours/theirs resolution
11. Stash support
12. Tags

### V2.0 (Future)
13. Visual three-way merge
14. Semantic diff for YAML (table/column level)
15. Clone from URL
16. Multiple remotes

---

## Security Considerations

1. **Credentials**: Never store git passwords in app. Use SSH keys or credential helpers.
2. **Sensitive Data**: Warn if committing files that might contain secrets.
3. **Force Push**: Disable or require confirmation for force push.
4. **Large Files**: Warn about committing large binary files (suggest .gitignore or LFS).

---

## Questions to Resolve

1. **Browser Support**: Git features are Electron-only. Show graceful degradation in browser?
2. **Multiple Workspaces**: Support different git repos for different workspaces?
3. **Partial Commits**: Allow staging individual files or always commit all changes?
4. **Commit Hooks**: Respect user's existing git hooks or override?
5. **Git LFS**: Support for large files (e.g., embedded images in sketches)?
6. **Submodules**: Handle workspaces that are git submodules?

---

## Summary

| Phase | Features | Effort | Business Value |
|-------|----------|--------|----------------|
| 1 | Status, branch display, dirty indicator | 1-2 weeks | High |
| 2 | Commit, diff, discard, history | 2-3 weeks | High |
| 3 | Branch operations | 2-3 weeks | High |
| 4 | Push/pull with auth | 2-3 weeks | High |
| 5 | Conflict resolution | 3-4 weeks | Medium |
| 6 | Advanced (stash, tags, etc.) | 2-3 weeks | Low |

**Total estimated effort**: 12-18 weeks for full implementation

**Recommended starting point**: Phase 1 + basic Phase 2 (status + commit) provides immediate value with minimal complexity.

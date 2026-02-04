/**
 * Git & GitHub Help Topics
 */

import { HelpCategory, type HelpTopic } from '@/types/help';

export const gitTopics: HelpTopic[] = [
  {
    id: 'git-overview',
    title: 'Git Integration Overview',
    category: HelpCategory.Git,
    keywords: ['git', 'version control', 'source control', 'vcs', 'overview'],
    order: 1,
    content: `
# Git Integration Overview

Open Data Modelling includes built-in Git integration for version control of your data models. This allows you to track changes, collaborate with team members, and maintain a history of your work.

## Why Use Git?

- **Track Changes** - See what changed, when, and by whom
- **Collaborate** - Work with team members on the same models
- **Branching** - Work on features without affecting the main model
- **History** - Roll back to any previous version
- **Backup** - Push to remote repositories for safe storage

## Git Panel

Access Git features through the **Git Panel** on the right side of the editor. The panel has several tabs:

| Tab | Purpose |
|-----|---------|
| **Changes** | View modified files, stage changes, commit |
| **History** | Browse commit history, view diffs |
| **PRs** | GitHub pull requests (requires GitHub auth) |
| **Sync** | Push, pull, fetch from remote |
| **More** | Advanced operations (stash, rebase, tags) |

## Desktop vs Browser

Git features differ between the desktop app and browser version:

| Feature | Desktop (Electron) | Browser |
|---------|-------------------|---------|
| Local Git operations | ✓ Full support | ✗ Not available |
| GitHub integration | ✓ Full support | ✓ Full support |
| SSH authentication | ✓ Supported | ✗ Not available |
| File system access | ✓ Direct access | ✗ Limited |

For full Git functionality, we recommend using the desktop application.
`,
    relatedTopics: ['git-authentication', 'git-basic-workflow', 'git-browser-electron'],
  },
  {
    id: 'git-authentication',
    title: 'Authentication (PAT & GitHub App)',
    category: HelpCategory.Git,
    keywords: [
      'authentication',
      'auth',
      'login',
      'pat',
      'personal access token',
      'github app',
      'oauth',
      'token',
      'credentials',
    ],
    order: 2,
    content: `
# Git Authentication

To use GitHub features, you need to authenticate. There are two authentication methods available.

## Personal Access Token (PAT)

Best for individual use. A PAT is a token you create in GitHub that grants access to your repositories.

### Creating a PAT

1. Go to [GitHub.com](https://github.com) and sign in
2. Click your profile picture → **Settings**
3. Scroll down to **Developer settings** (left sidebar)
4. Click **Personal access tokens** → **Tokens (classic)**
5. Click **Generate new token** → **Generate new token (classic)**
6. Give it a descriptive name (e.g., "Data Modelling App")
7. Set an expiration (or "No expiration" for convenience)
8. Select the **repo** scope (full control of private repositories)
9. Click **Generate token**
10. **Copy the token immediately** - you won't see it again!

### Using Your PAT

1. Open the Git panel in the application
2. Click **Connect to GitHub** or the GitHub icon
3. Select **Personal Access Token**
4. Paste your token
5. Click **Connect**

### Token Security

- Never share your token
- Store it securely (the app stores it locally)
- Revoke and regenerate if compromised
- Use tokens with minimal required scopes

## GitHub App (OAuth)

Best for organizations. GitHub Apps provide OAuth-based authentication managed by your organization.

### How It Works

1. Your organization admin creates a GitHub App
2. The app is configured in the Data Modelling application
3. Users authenticate via OAuth (browser redirect)
4. No manual token management required

### Setting Up (Administrators)

1. Go to your organization's **Settings** → **Developer settings** → **GitHub Apps**
2. Click **New GitHub App**
3. Configure the app with appropriate permissions:
   - Repository permissions: Contents (Read & Write), Pull requests (Read & Write)
4. Note the **Client ID** and generate a **Client Secret**
5. In the Data Modelling app, go to **Settings** → **GitHub** → **Manage Apps**
6. Add a new app configuration with the Client ID and Secret

### Authenticating (Users)

1. Open the Git panel
2. Click **Connect to GitHub**
3. Select **GitHub App**
4. Choose your organization's app
5. Click **Connect** - you'll be redirected to GitHub
6. Authorize the app
7. You'll be redirected back, now authenticated

## Switching Authentication Methods

1. Go to **Settings** → **GitHub**
2. Click **Sign Out** to disconnect
3. Click **Connect** and choose your preferred method
`,
    relatedTopics: ['git-overview', 'git-browser-electron'],
  },
  {
    id: 'git-basic-workflow',
    title: 'Basic Workflow (Commit, Push, Pull)',
    category: HelpCategory.Git,
    keywords: ['commit', 'push', 'pull', 'save', 'sync', 'workflow', 'stage', 'changes', 'basic'],
    order: 3,
    content: `
# Basic Git Workflow

This guide covers the essential Git operations you'll use daily.

## Viewing Changes

1. Open the **Git Panel** (right side of editor)
2. The **Changes** tab shows all modified files
3. File status indicators:
   - **M** (Modified) - File has been changed
   - **A** (Added) - New file
   - **D** (Deleted) - File was removed
   - **R** (Renamed) - File was renamed
   - **?** (Untracked) - New file not yet tracked

## Staging Files

Before committing, you need to stage the files you want to include.

- **Stage all files**: Click the **+** button next to "Changes"
- **Stage individual files**: Click the **+** next to each file
- **Unstage files**: Click the **-** next to staged files

## Committing Changes

1. Stage the files you want to commit
2. Enter a **commit message** describing your changes
3. Click **Commit**

### Writing Good Commit Messages

- Keep the first line short (50 characters or less)
- Use present tense: "Add customer table" not "Added customer table"
- Be specific: "Fix relationship cardinality for orders" not "Fix bug"

## Pushing to Remote

After committing, push your changes to the remote repository:

1. Go to the **Sync** tab
2. Click **Push**
3. If this is a new branch, you may need to set the upstream

## Pulling from Remote

To get the latest changes from your team:

1. Go to the **Sync** tab
2. Click **Pull**
3. Changes will be merged into your local branch

## Fetch vs Pull

| Operation | What it does |
|-----------|--------------|
| **Fetch** | Downloads changes but doesn't merge them |
| **Pull** | Downloads and merges changes |

Use **Fetch** when you want to see what's changed before merging.

## Discarding Changes

To discard uncommitted changes:

1. In the **Changes** tab, find the file
2. Click the **↩** (discard) icon
3. Confirm the discard

⚠️ **Warning**: Discarded changes cannot be recovered!
`,
    relatedTopics: ['git-overview', 'git-branches'],
  },
  {
    id: 'git-branches',
    title: 'Branch Management',
    category: HelpCategory.Git,
    keywords: ['branch', 'branches', 'checkout', 'switch', 'create', 'delete', 'merge', 'feature'],
    order: 4,
    content: `
# Branch Management

Branches allow you to work on different versions of your data model simultaneously.

## Understanding Branches

- **main** (or master) - The primary branch with stable, reviewed changes
- **Feature branches** - Temporary branches for new work
- **Remote branches** - Branches that exist on the remote repository

## Viewing Branches

1. Click the **branch selector** in the Git panel header
2. You'll see:
   - Current branch (highlighted)
   - Local branches
   - Remote branches (prefixed with origin/)

## Creating a New Branch

1. Click the branch selector
2. Click **+ New Branch**
3. Enter a branch name (e.g., \`feature/add-customer-tables\`)
4. Optionally select a base branch (defaults to current)
5. Click **Create**

### Branch Naming Conventions

Good branch names are descriptive and follow a pattern:

- \`feature/description\` - New features
- \`fix/description\` - Bug fixes
- \`refactor/description\` - Code improvements
- \`docs/description\` - Documentation changes

## Switching Branches

1. Click the branch selector
2. Click on the branch you want to switch to
3. If you have uncommitted changes, you'll be prompted to:
   - **Stash** them (save for later)
   - **Discard** them
   - **Cancel** the switch

## Deleting Branches

1. Click the branch selector
2. Hover over the branch to delete
3. Click the **trash** icon
4. Confirm deletion

⚠️ You cannot delete:
- The branch you're currently on
- Branches with unmerged changes (without force delete)

## Merging Branches

To merge another branch into your current branch:

1. Go to the **More** tab
2. Click **Merge Branch**
3. Select the branch to merge from
4. Click **Merge**

If there are conflicts, see the [Troubleshooting](#git-troubleshooting) guide.
`,
    relatedTopics: ['git-basic-workflow', 'git-pull-requests', 'git-advanced'],
  },
  {
    id: 'git-pull-requests',
    title: 'GitHub Pull Requests',
    category: HelpCategory.Git,
    keywords: [
      'pull request',
      'pr',
      'merge',
      'review',
      'github',
      'collaborate',
      'comment',
      'approve',
    ],
    order: 5,
    content: `
# GitHub Pull Requests

Pull requests (PRs) let you propose changes and get feedback before merging into the main branch.

## Viewing Pull Requests

1. Open the **Git Panel**
2. Go to the **PRs** tab
3. You'll see a list of open pull requests
4. Use the filter dropdown to show:
   - Open PRs
   - Closed PRs
   - All PRs

## Pull Request Details

Click on a PR to see:

- **Conversation** - Comments and discussion
- **Files** - Changed files with diffs
- **Reviews** - Review status and feedback

## Adding Comments

1. Open a PR
2. Go to the **Conversation** tab
3. Type your comment in the text box
4. Click **Comment**

You can also comment on specific lines:
1. Go to the **Files** tab
2. Click the **+** icon next to a line
3. Enter your comment
4. Click **Add Comment**

## Reviewing a PR

1. Open the PR
2. Review the changes in the **Files** tab
3. Click **Review**
4. Choose:
   - **Approve** - Changes look good
   - **Request Changes** - Changes needed before merge
   - **Comment** - General feedback without approval
5. Add an optional summary
6. Click **Submit Review**

## Merging a PR

Once approved, you can merge:

1. Open the PR
2. Scroll to the merge section
3. Choose a merge method:
   - **Merge commit** - Creates a merge commit
   - **Squash and merge** - Combines all commits into one
   - **Rebase and merge** - Replays commits on top of base
4. Click **Merge**

## Creating a PR

To create a PR from the application:

1. Push your branch to the remote
2. Go to GitHub.com
3. You'll see a prompt to create a PR for your branch
4. Fill in the title and description
5. Request reviewers
6. Click **Create Pull Request**

*Note: PR creation from within the app is coming in a future update.*
`,
    relatedTopics: ['git-branches', 'git-basic-workflow'],
  },
  {
    id: 'git-advanced',
    title: 'Advanced Operations',
    category: HelpCategory.Git,
    keywords: ['stash', 'rebase', 'cherry-pick', 'tags', 'tag', 'advanced', 'reset'],
    order: 6,
    content: `
# Advanced Git Operations

These operations are for more complex workflows and should be used with care.

## Stashing Changes

Stash temporarily saves your uncommitted changes so you can switch branches or pull updates.

### Saving to Stash

1. Go to **More** tab → **Stash**
2. Click **Stash Changes**
3. Optionally add a description
4. Options:
   - **Include untracked** - Also stash new files
   - **Keep index** - Keep staged changes staged
5. Click **Stash**

### Applying Stashed Changes

1. View your stashes in the stash list
2. Click **Apply** to restore changes (keeps stash)
3. Or click **Pop** to restore and remove from stash

### Managing Stashes

- **Drop** - Delete a single stash
- **Clear** - Delete all stashes

## Cherry-Picking

Apply a specific commit from another branch to your current branch.

1. Go to the **History** tab
2. Find the commit you want
3. Click the **cherry** icon or right-click → **Cherry-pick**
4. Options:
   - **No commit** - Stage changes without committing
5. Click **Cherry-pick**

If there are conflicts, resolve them and click **Continue**.

## Rebasing

Rebase replays your commits on top of another branch, creating a linear history.

1. Go to **More** tab → **Rebase**
2. Select the target branch (e.g., main)
3. Options:
   - **Autostash** - Automatically stash and restore changes
4. Click **Start Rebase**

### During Rebase

If conflicts occur:
1. Resolve conflicts in the affected files
2. Click **Continue** to proceed
3. Or click **Abort** to cancel the rebase

⚠️ **Warning**: Don't rebase commits that have been pushed and shared with others.

## Tags

Tags mark specific points in history, typically for releases.

### Creating Tags

1. Go to **More** tab → **Tags**
2. Click **Create Tag**
3. Enter a tag name (e.g., \`v1.0.0\`)
4. Optionally add a message (creates annotated tag)
5. Click **Create**

### Managing Tags

- **Push Tag** - Push a single tag to remote
- **Push All Tags** - Push all local tags
- **Delete Tag** - Remove a tag locally
- **Checkout Tag** - View the repository at that tag

## Reverting Commits

To undo a commit by creating a new commit that reverses the changes:

1. Go to the **History** tab
2. Find the commit to revert
3. Click **Revert**
4. A new commit will be created with the inverse changes
`,
    relatedTopics: ['git-branches', 'git-troubleshooting'],
  },
  {
    id: 'git-browser-electron',
    title: 'Browser vs Desktop Differences',
    category: HelpCategory.Git,
    keywords: ['browser', 'electron', 'desktop', 'web', 'differences', 'limitations', 'features'],
    order: 7,
    content: `
# Browser vs Desktop Git Features

The application runs in two modes: as a desktop app (Electron) and in the browser. Git features differ between these modes.

## Feature Comparison

| Feature | Desktop App | Browser |
|---------|-------------|---------|
| **Local Git Operations** | | |
| Initialize repository | ✓ | ✗ |
| Commit changes | ✓ | ✗ |
| Branch operations | ✓ | ✗ |
| View history | ✓ | ✗ |
| Stash | ✓ | ✗ |
| Rebase | ✓ | ✗ |
| Cherry-pick | ✓ | ✗ |
| Tags | ✓ | ✗ |
| Push/Pull | ✓ | ✗ |
| **GitHub API Operations** | | |
| View pull requests | ✓ | ✓ |
| Comment on PRs | ✓ | ✓ |
| Review PRs | ✓ | ✓ |
| Merge PRs | ✓ | ✓ |
| View branches | ✓ | ✓ |
| View commits | ✓ | ✓ |
| File blame | ✓ | ✓ |
| **Authentication** | | |
| Personal Access Token | ✓ | ✓ |
| GitHub App (OAuth) | ✓ | ✓ |
| SSH Keys | ✓ | ✗ |

## Why the Difference?

The browser cannot access your local file system or run Git commands directly. Browser mode relies entirely on the GitHub API for version control features.

## Recommendations

### For Full Git Support
Use the **desktop application**. It provides:
- Full local Git operations
- Work offline with local commits
- SSH key authentication
- Direct file system access

### For Quick Access
Use the **browser version** when:
- Reviewing pull requests
- Commenting on changes
- Viewing repository history
- Quick edits with GitHub API

## Switching Between Modes

Your workspaces are portable:
1. Save your workspace in the desktop app
2. Commit and push to GitHub
3. Access the repository from the browser
4. Changes made via GitHub API are reflected when you pull

## Offline Support

| Mode | Offline Capability |
|------|-------------------|
| Desktop | Full offline support - commit, branch, view history |
| Browser | Limited - can view cached data, no new operations |
`,
    relatedTopics: ['git-overview', 'git-authentication'],
  },
  {
    id: 'git-troubleshooting',
    title: 'Troubleshooting',
    category: HelpCategory.Git,
    keywords: [
      'troubleshoot',
      'error',
      'problem',
      'fix',
      'conflict',
      'merge conflict',
      'authentication',
      'failed',
    ],
    order: 8,
    content: `
# Git Troubleshooting

Common issues and how to resolve them.

## Merge Conflicts

Conflicts occur when the same lines were changed in different branches.

### Identifying Conflicts

After a merge or pull, conflicted files are marked. The conflict markers look like:

\`\`\`
<<<<<<< HEAD
Your changes
=======
Their changes
>>>>>>> branch-name
\`\`\`

### Resolving Conflicts

1. Open the conflicted file
2. Find the conflict markers
3. Decide which changes to keep:
   - Keep your changes
   - Keep their changes
   - Combine both
4. Remove the conflict markers
5. Save the file
6. Stage the resolved file
7. Commit the merge

### Quick Resolution

For simple conflicts, use:
- **Accept Ours** - Keep your version
- **Accept Theirs** - Keep their version

## Authentication Issues

### "Authentication Failed"

1. Check your token hasn't expired
2. Verify the token has the \`repo\` scope
3. Try signing out and back in
4. Generate a new token if needed

### "Permission Denied"

1. Ensure you have access to the repository
2. Check if the repository is private
3. Verify your token has sufficient permissions

## Push Rejected

### "Updates were rejected"

Your local branch is behind the remote:

1. Pull the latest changes first
2. Resolve any conflicts
3. Try pushing again

### "Force Push Required"

⚠️ Force push overwrites remote history. Only use if:
- You're the only one working on the branch
- You understand the consequences

## Branch Issues

### "Cannot delete current branch"

Switch to a different branch before deleting.

### "Branch has unmerged changes"

Either:
1. Merge the branch first
2. Use force delete (careful - changes will be lost)

## Rebase Problems

### "Rebase in progress"

You started a rebase but didn't finish:

1. Resolve any conflicts
2. Click **Continue** to proceed
3. Or click **Abort** to cancel and restore original state

### "Cannot rebase: uncommitted changes"

1. Commit your changes, or
2. Stash your changes, then rebase

## Common Error Messages

| Error | Solution |
|-------|----------|
| "Not a git repository" | Initialize Git or open a different folder |
| "Remote origin already exists" | Remove and re-add the remote |
| "Nothing to commit" | Make some changes first |
| "Detached HEAD" | Checkout a branch |
| "Cannot lock ref" | Close other Git processes |

## Getting More Help

If you're stuck:
1. Check the error message carefully
2. Try the operation again after fixing the issue
3. Search for the specific error message online
4. Ask in your team's communication channel
`,
    relatedTopics: ['git-basic-workflow', 'git-advanced'],
  },
];

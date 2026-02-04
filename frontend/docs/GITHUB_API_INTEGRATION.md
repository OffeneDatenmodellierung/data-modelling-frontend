# GitHub API Integration Design

## Overview

Add GitHub API integration to complement the existing local git support, enabling:

- Browser users to interact with GitHub repositories
- Electron users to have both offline (local git) and online (GitHub API) capabilities
- Cloud-based collaboration features (PRs, issues, etc.)

## Security Principles

**No backend storage of user credentials** - All authentication is client-side only:

- Personal Access Tokens stored in localStorage (browser) or electron-store (desktop)
- No OAuth secrets stored on servers
- Organization-specific GitHub App support for enterprise deployments

## Authentication Methods

### Method 1: Personal Access Token (Default - Phase 1)

- User creates a PAT in GitHub Settings > Developer settings > Personal access tokens
- User pastes token into the app
- Token stored locally only (encrypted)
- **Required scopes**: `repo`, `read:user`
- **Pros**: Zero setup, works immediately, no backend needed
- **Cons**: User manages token lifecycle

### Method 2: GitHub App (Enterprise - Future)

- Organization installs a GitHub App on their repos
- Fine-grained permissions per repository
- Installation tokens managed client-side
- **Pros**: Best security, granular permissions, audit trail
- **Cons**: Requires org admin to set up GitHub App

## Architecture

### Dual-Mode Git Support

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitService                                │
│  (Facade that routes to appropriate provider)                    │
├─────────────────────────────────────────────────────────────────┤
│                              │                                   │
│         ┌────────────────────┴────────────────────┐             │
│         ▼                                         ▼             │
│  ┌──────────────────┐                  ┌──────────────────┐     │
│  │ LocalGitProvider │                  │ GitHubProvider   │     │
│  │ (simple-git)     │                  │ (GitHub API)     │     │
│  │                  │                  │                  │     │
│  │ - Electron only  │                  │ - Browser + Electron   │
│  │ - Full offline   │                  │ - Requires auth  │     │
│  │ - All git ops    │                  │ - Remote repos   │     │
│  └──────────────────┘                  └──────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Features by Provider

### LocalGitProvider (Existing - Electron Only)

- ✅ Status, add, commit, log, diff
- ✅ Branch management (create, checkout, delete, rename)
- ✅ Remote operations (fetch, pull, push)
- ✅ Stash operations
- ✅ Cherry-pick, rebase, reset, revert
- ✅ Works offline
- ✅ Any git remote (GitHub, GitLab, Bitbucket, etc.)

### GitHubProvider (New - Browser + Electron)

- Repository information and status
- Branch listing and creation
- Commit history viewing
- File content viewing/editing (via API)
- Pull request management (create, list, review, merge)
- Issue integration
- GitHub Actions status
- Collaborator management
- **Requires GitHub authentication**
- **Requires internet connection**

## Implementation Plan

### Phase 1: Authentication & Core Infrastructure

#### New Files

| File                                    | Purpose                                  |
| --------------------------------------- | ---------------------------------------- |
| `src/services/github/githubAuth.ts`     | OAuth flow, token management             |
| `src/services/github/githubApi.ts`      | GitHub REST API client wrapper           |
| `src/services/github/githubProvider.ts` | GitProvider interface implementation     |
| `src/stores/githubStore.ts`             | GitHub-specific state (repos, PRs, etc.) |
| `src/types/github.ts`                   | TypeScript types for GitHub entities     |

#### Authentication Flow

1. User clicks "Connect to GitHub"
2. OAuth flow opens GitHub authorization page
3. User authorizes the app
4. App receives OAuth token
5. Token stored securely (localStorage for browser, electron-store for desktop)

#### Modifications

| File                             | Change                                    |
| -------------------------------- | ----------------------------------------- |
| `src/services/git/gitService.ts` | Refactor to use provider pattern          |
| `src/stores/gitStore.ts`         | Add `provider: 'local' \| 'github'` state |

### Phase 2: Repository Connection

#### New Components

| Component                 | Purpose                               |
| ------------------------- | ------------------------------------- |
| `GitHubConnectDialog.tsx` | OAuth login and repo selection        |
| `GitHubRepoSelector.tsx`  | Browse and select repositories        |
| `GitHubAccountMenu.tsx`   | Account info, logout, switch accounts |

#### Features

- List user's repositories
- Search repositories
- Connect workspace to a GitHub repo
- Store repo connection in workspace metadata

### Phase 3: Core Git Operations via API

#### Operations to Implement

| Operation          | GitHub API Endpoint                              |
| ------------------ | ------------------------------------------------ |
| Get status         | `GET /repos/{owner}/{repo}` + branches + commits |
| List branches      | `GET /repos/{owner}/{repo}/branches`             |
| Create branch      | `POST /repos/{owner}/{repo}/git/refs`            |
| Get commits        | `GET /repos/{owner}/{repo}/commits`              |
| Get file content   | `GET /repos/{owner}/{repo}/contents/{path}`      |
| Create/update file | `PUT /repos/{owner}/{repo}/contents/{path}`      |
| Create commit      | `POST /repos/{owner}/{repo}/git/commits`         |

#### UI Updates

- GitPanel shows GitHub-specific status
- Branch selector works with GitHub branches
- History shows GitHub commits
- Diff viewer shows file changes from API

### Phase 4: Pull Request Integration

#### New Components

| Component               | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| `PullRequestList.tsx`   | List open/closed PRs                     |
| `PullRequestDetail.tsx` | View PR details, comments, checks        |
| `PullRequestCreate.tsx` | Create new PR dialog                     |
| `PullRequestReview.tsx` | Review changes, approve, request changes |

#### Features

- List PRs (open, closed, by author)
- Create PR from current branch
- View PR diff and comments
- Add review comments
- Approve/request changes
- Merge PR (merge, squash, rebase)
- Link PRs to workspace changes

### Phase 5: Enhanced Collaboration

#### Features

- GitHub Issues integration
- GitHub Actions status display
- Collaborator/team visibility
- Repository settings quick access
- Notifications for PR reviews, mentions

## API Rate Limiting

GitHub API has rate limits:

- **Unauthenticated**: 60 requests/hour
- **Authenticated**: 5,000 requests/hour

Mitigation strategies:

- Cache responses with ETags
- Use conditional requests
- Batch operations where possible
- Show rate limit status to users

## Security Considerations

1. **Token Storage**
   - Browser: HttpOnly cookies or secure localStorage with encryption
   - Electron: electron-store with encryption

2. **Scopes Required**
   - `repo` - Full repository access
   - `read:user` - Read user profile
   - `read:org` - Read organization membership (optional)

3. **Token Refresh**
   - Implement token refresh flow
   - Handle expired tokens gracefully

## UI/UX Design

### Git Panel Updates

```
┌─────────────────────────────────────┐
│ Version Control          [⚙️] [×]  │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🔗 Connected to GitHub          │ │
│ │ owner/repo-name                 │ │
│ │ [Disconnect]                    │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ [Changes] [History] [PRs] [Sync]   │
├─────────────────────────────────────┤
│                                     │
│  (Tab content)                      │
│                                     │
└─────────────────────────────────────┘
```

### New "PRs" Tab

- Shows open pull requests
- Quick actions (view, merge)
- Create PR button

### Provider Indicator

- Show whether using local git or GitHub API
- Allow switching when both available (Electron)

## File Structure

```
frontend/src/
├── services/
│   ├── git/
│   │   ├── gitService.ts        # MODIFY - Provider facade
│   │   ├── gitProvider.ts       # NEW - Provider interface
│   │   ├── localGitProvider.ts  # NEW - Extract from gitService
│   │   └── index.ts
│   └── github/
│       ├── githubAuth.ts        # NEW
│       ├── githubApi.ts         # NEW
│       ├── githubProvider.ts    # NEW
│       └── index.ts             # NEW
├── stores/
│   ├── gitStore.ts              # MODIFY - Add provider state
│   └── githubStore.ts           # NEW
├── types/
│   └── github.ts                # NEW
└── components/
    └── git/
        ├── GitHubConnect.tsx    # NEW
        ├── GitHubRepoSelector.tsx # NEW
        ├── PullRequestList.tsx  # NEW
        ├── PullRequestDetail.tsx # NEW
        └── PullRequestCreate.tsx # NEW
```

## Environment Configuration

```env
# .env
VITE_GITHUB_CLIENT_ID=your_github_oauth_app_client_id
VITE_GITHUB_REDIRECT_URI=http://localhost:5173/auth/github/callback

# For production
VITE_GITHUB_CLIENT_ID=production_client_id
VITE_GITHUB_REDIRECT_URI=https://app.yourdomain.com/auth/github/callback
```

## Migration Path

1. **No breaking changes** to existing local git functionality
2. GitHub features are **additive**
3. Users can choose to connect GitHub or continue with local-only
4. Workspace metadata stores GitHub connection info (optional)

## Success Metrics

- Users can authenticate with GitHub in browser
- Users can view/create branches via GitHub API
- Users can create and merge pull requests
- Electron users can switch between local and GitHub modes
- Rate limiting handled gracefully

## Open Questions

1. Should we support GitLab/Bitbucket in the future? (Design for extensibility)
2. How to handle conflicts between local changes and GitHub state?
3. Should we implement GitHub webhooks for real-time updates?
4. OAuth app vs GitHub App - which approach?

## References

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Octokit.js](https://github.com/octokit/octokit.js) - Official GitHub API client

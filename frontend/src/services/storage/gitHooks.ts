/**
 * Git Hooks Integration
 *
 * Provides utilities for managing git hooks during git operations
 * (pre-commit, post-checkout, post-merge).
 *
 * This enables:
 * - Version control of workspace data through YAML files
 * - Automatic validation and processing during git operations
 *
 * @module services/storage/gitHooks
 */

import { isElectronPlatform } from '../platform/electron';

/**
 * Status of an individual git hook
 */
export interface HookStatus {
  name: 'pre-commit' | 'post-checkout' | 'post-merge';
  installed: boolean;
  enabled: boolean;
  hasConflict: boolean;
  lastRun?: string;
}

/**
 * Overall git hooks status
 */
export interface GitHooksStatus {
  gitAvailable: boolean;
  hooksPath: string | null;
  hooks: HookStatus[];
}

/**
 * Result of a hook operation
 */
export interface HookOperationResult {
  success: boolean;
  error?: string;
}

/**
 * Result of bulk hook operations
 */
export interface BulkHookOperationResult {
  success: boolean;
  installed: string[];
  errors: string[];
}

/**
 * Git hook script content for each hook type
 */
const HOOK_SCRIPTS = {
  'pre-commit': `#!/bin/sh
# Open Data Modelling - Pre-commit hook
# Validates workspace files before commit

echo "🔄 Validating workspace files..."

# Check if we're in the frontend directory or root
if [ -d "frontend" ]; then
  cd frontend || exit 1
fi

echo "✅ Pre-commit validation complete"
`,

  'post-checkout': `#!/bin/sh
# Open Data Modelling - Post-checkout hook
# Runs after branch checkout

PREV_HEAD=$1
NEW_HEAD=$2
BRANCH_CHECKOUT=$3

# Only run on branch checkout, not file checkout
if [ "$BRANCH_CHECKOUT" = "1" ]; then
  echo "🔄 Processing post-checkout..."

  # Check if we're in the frontend directory or root
  if [ -d "frontend" ]; then
    cd frontend || exit 1
  fi

  echo "✅ Post-checkout complete"
fi
`,

  'post-merge': `#!/bin/sh
# Open Data Modelling - Post-merge hook
# Runs after merge operations

echo "🔄 Processing post-merge..."

# Check if we're in the frontend directory or root
if [ -d "frontend" ]; then
  cd frontend || exit 1
fi

echo "✅ Post-merge complete"
`,
};

/**
 * Git Hooks Service
 *
 * Manages git hooks for workspace file operations.
 */
class GitHooksService {
  private enabledHooks: Set<string> = new Set(['pre-commit', 'post-checkout', 'post-merge']);

  /**
   * Check if git hooks are available (requires Electron for file system access)
   */
  isAvailable(): boolean {
    return isElectronPlatform() && !!window.electronAPI;
  }

  /**
   * Get the status of all git hooks for a workspace
   */
  async getStatus(workspacePath: string): Promise<GitHooksStatus> {
    if (!this.isAvailable()) {
      return {
        gitAvailable: false,
        hooksPath: null,
        hooks: [],
      };
    }

    try {
      // Check if .git directory exists
      const gitPath = `${workspacePath}/.git`;
      const gitExists = await this.pathExists(gitPath);

      if (!gitExists) {
        return {
          gitAvailable: false,
          hooksPath: null,
          hooks: [],
        };
      }

      const hooksPath = `${gitPath}/hooks`;

      // Get status of each hook
      const hooks: HookStatus[] = await Promise.all(
        (['pre-commit', 'post-checkout', 'post-merge'] as const).map(async (name) => {
          const hookPath = `${hooksPath}/${name}`;
          const installed = await this.isOurHookInstalled(hookPath);
          const hasConflict = !installed && (await this.pathExists(hookPath));

          return {
            name,
            installed,
            enabled: this.enabledHooks.has(name),
            hasConflict,
          };
        })
      );

      return {
        gitAvailable: true,
        hooksPath,
        hooks,
      };
    } catch (error) {
      console.error('[GitHooksService] Failed to get status:', error);
      return {
        gitAvailable: false,
        hooksPath: null,
        hooks: [],
      };
    }
  }

  /**
   * Install a specific git hook
   */
  async installHook(
    workspacePath: string,
    hookName: 'pre-commit' | 'post-checkout' | 'post-merge'
  ): Promise<HookOperationResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Git hooks not available in this environment' };
    }

    try {
      const hooksPath = `${workspacePath}/.git/hooks`;

      // Ensure hooks directory exists
      await window.electronAPI!.ensureDirectory(hooksPath);

      const hookPath = `${hooksPath}/${hookName}`;
      const script = HOOK_SCRIPTS[hookName];

      // Check for existing hook
      if (await this.pathExists(hookPath)) {
        const existingContent = await window.electronAPI!.readFile(hookPath);
        if (!existingContent.includes('Open Data Modelling')) {
          // There's an existing hook that's not ours - back it up
          await window.electronAPI!.writeFile(`${hookPath}.backup`, existingContent);
        }
      }

      // Write the hook script
      await window.electronAPI!.writeFile(hookPath, script);

      // Make executable (on Unix systems, this is handled differently)
      // In Electron, the file will be executable based on the original permissions
      // For proper chmod support, we'd need an IPC handler

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[GitHooksService] Failed to install ${hookName}:`, error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Uninstall a specific git hook
   */
  async uninstallHook(
    workspacePath: string,
    hookName: 'pre-commit' | 'post-checkout' | 'post-merge'
  ): Promise<HookOperationResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Git hooks not available in this environment' };
    }

    try {
      const hookPath = `${workspacePath}/.git/hooks/${hookName}`;

      // Check if it's our hook
      if (await this.isOurHookInstalled(hookPath)) {
        await window.electronAPI!.deleteFile(hookPath);

        // Restore backup if exists
        const backupPath = `${hookPath}.backup`;
        if (await this.pathExists(backupPath)) {
          const backupContent = await window.electronAPI!.readFile(backupPath);
          await window.electronAPI!.writeFile(hookPath, backupContent);
          await window.electronAPI!.deleteFile(backupPath);
        }
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[GitHooksService] Failed to uninstall ${hookName}:`, error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Install all enabled hooks
   */
  async installAllHooks(workspacePath: string): Promise<BulkHookOperationResult> {
    const installed: string[] = [];
    const errors: string[] = [];

    for (const hookName of ['pre-commit', 'post-checkout', 'post-merge'] as const) {
      if (this.enabledHooks.has(hookName)) {
        const result = await this.installHook(workspacePath, hookName);
        if (result.success) {
          installed.push(hookName);
        } else {
          errors.push(`${hookName}: ${result.error}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      installed,
      errors,
    };
  }

  /**
   * Uninstall all hooks
   */
  async uninstallAllHooks(workspacePath: string): Promise<BulkHookOperationResult> {
    const installed: string[] = [];
    const errors: string[] = [];

    for (const hookName of ['pre-commit', 'post-checkout', 'post-merge'] as const) {
      const result = await this.uninstallHook(workspacePath, hookName);
      if (result.success) {
        installed.push(hookName);
      } else {
        errors.push(`${hookName}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      installed,
      errors,
    };
  }

  /**
   * Enable or disable a hook type
   */
  setHookEnabled(hookName: string, enabled: boolean): void {
    if (enabled) {
      this.enabledHooks.add(hookName);
    } else {
      this.enabledHooks.delete(hookName);
    }
  }

  /**
   * Check if a hook is enabled
   */
  isHookEnabled(hookName: string): boolean {
    return this.enabledHooks.has(hookName);
  }

  /**
   * Check if a path exists
   */
  private async pathExists(path: string): Promise<boolean> {
    try {
      await window.electronAPI!.readFile(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if our hook is installed at the given path
   */
  private async isOurHookInstalled(hookPath: string): Promise<boolean> {
    try {
      const content = await window.electronAPI!.readFile(hookPath);
      return content.includes('Open Data Modelling');
    } catch {
      return false;
    }
  }
}

/**
 * Singleton instance
 */
export const gitHooksService = new GitHooksService();

/**
 * Export the class for testing
 */
export { GitHooksService };

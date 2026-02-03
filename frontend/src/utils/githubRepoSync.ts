/**
 * GitHub Repository Sync Utilities
 *
 * Provides functions for incrementally syncing individual resources to GitHub repo mode.
 * Instead of regenerating all files on save, these functions write only the changed resource.
 */

import { FileMigration } from '@/utils/fileMigration';
import { knowledgeService } from '@/services/sdk/knowledgeService';
import { decisionService } from '@/services/sdk/decisionService';
import * as yaml from 'js-yaml';
import type { KnowledgeArticle } from '@/types/knowledge';
import type { Decision } from '@/types/decision';
import type { Domain } from '@/types/domain';

/**
 * Check if we're in GitHub repo mode
 */
export async function isGitHubRepoMode(): Promise<boolean> {
  try {
    const { useGitHubRepoStore } = await import('@/stores/githubRepoStore');
    return useGitHubRepoStore.getState().workspace !== null;
  } catch {
    return false;
  }
}

/**
 * Get workspace name for file naming
 */
async function getWorkspaceName(): Promise<string> {
  try {
    const { useWorkspaceStore } = await import('@/stores/workspaceStore');
    const workspace = useWorkspaceStore
      .getState()
      .workspaces.find((w) => w.id === useWorkspaceStore.getState().currentWorkspaceId);
    return FileMigration.sanitizeFileName(workspace?.name || 'workspace');
  } catch {
    return 'workspace';
  }
}

/**
 * Get domain name by ID
 */
async function getDomainName(domainId: string | undefined): Promise<string | null> {
  if (!domainId) return null;
  try {
    const { useModelStore } = await import('@/stores/modelStore');
    const domain = useModelStore.getState().domains.find((d: Domain) => d.id === domainId);
    return domain ? FileMigration.sanitizeFileName(domain.name) : null;
  } catch {
    return null;
  }
}

/**
 * Sync a knowledge article to GitHub repo
 */
export async function syncKnowledgeArticleToGitHub(article: KnowledgeArticle): Promise<void> {
  if (!(await isGitHubRepoMode())) return;

  const { useGitHubRepoStore } = await import('@/stores/githubRepoStore');
  const workspaceName = await getWorkspaceName();
  const domainName = await getDomainName(article.domain_id);

  // Generate filename
  const articleName = FileMigration.sanitizeFileName(article.title || `kb_${article.id}`);
  let fileName: string;

  if (domainName) {
    fileName = FileMigration.generateFileName(
      workspaceName,
      domainName,
      articleName,
      undefined,
      'kb.yaml'
    );
  } else {
    // Global article (no domain)
    fileName = `${workspaceName}_global_${articleName}.kb.yaml`;
  }

  // Generate content
  let content: string;
  try {
    const yamlContent = await knowledgeService.exportKnowledgeToYaml(article);
    content = yamlContent || yaml.dump(article, { lineWidth: -1, noRefs: true });
  } catch {
    content = yaml.dump(article, { lineWidth: -1, noRefs: true });
  }

  // Write to GitHub repo store
  const filePath = `kb/${fileName}`;
  await useGitHubRepoStore.getState().writeFile(filePath, content);

  console.log(`[GitHubRepoSync] Synced knowledge article: ${filePath}`);
}

/**
 * Sync a decision record (ADR) to GitHub repo
 */
export async function syncDecisionRecordToGitHub(decision: Decision): Promise<void> {
  if (!(await isGitHubRepoMode())) return;

  const { useGitHubRepoStore } = await import('@/stores/githubRepoStore');
  const workspaceName = await getWorkspaceName();
  const domainName = await getDomainName(decision.domain_id);

  // Generate filename
  const adrName = FileMigration.sanitizeFileName(decision.title || `adr_${decision.id}`);
  let fileName: string;

  if (domainName) {
    fileName = FileMigration.generateFileName(
      workspaceName,
      domainName,
      adrName,
      undefined,
      'adr.yaml'
    );
  } else {
    // Global ADR (no domain)
    fileName = `${workspaceName}_global_${adrName}.adr.yaml`;
  }

  // Generate content
  let content: string;
  try {
    const yamlContent = await decisionService.exportDecisionToYaml(decision);
    content = yamlContent || yaml.dump(decision, { lineWidth: -1, noRefs: true });
  } catch {
    content = yaml.dump(decision, { lineWidth: -1, noRefs: true });
  }

  // Write to GitHub repo store
  const filePath = `adr/${fileName}`;
  await useGitHubRepoStore.getState().writeFile(filePath, content);

  console.log(`[GitHubRepoSync] Synced decision record: ${filePath}`);
}

/**
 * Delete a knowledge article from GitHub repo
 */
export async function deleteKnowledgeArticleFromGitHub(article: KnowledgeArticle): Promise<void> {
  if (!(await isGitHubRepoMode())) return;

  const { useGitHubRepoStore } = await import('@/stores/githubRepoStore');
  const workspaceName = await getWorkspaceName();
  const domainName = await getDomainName(article.domain_id);

  // Generate filename (same logic as sync)
  const articleName = FileMigration.sanitizeFileName(article.title || `kb_${article.id}`);
  let fileName: string;

  if (domainName) {
    fileName = FileMigration.generateFileName(
      workspaceName,
      domainName,
      articleName,
      undefined,
      'kb.yaml'
    );
  } else {
    fileName = `${workspaceName}_global_${articleName}.kb.yaml`;
  }

  const filePath = `kb/${fileName}`;

  try {
    await useGitHubRepoStore.getState().deleteFile(filePath);
    console.log(`[GitHubRepoSync] Deleted knowledge article: ${filePath}`);
  } catch (error) {
    console.warn(`[GitHubRepoSync] Failed to delete knowledge article: ${filePath}`, error);
  }
}

/**
 * Delete a decision record from GitHub repo
 */
export async function deleteDecisionRecordFromGitHub(decision: Decision): Promise<void> {
  if (!(await isGitHubRepoMode())) return;

  const { useGitHubRepoStore } = await import('@/stores/githubRepoStore');
  const workspaceName = await getWorkspaceName();
  const domainName = await getDomainName(decision.domain_id);

  // Generate filename (same logic as sync)
  const adrName = FileMigration.sanitizeFileName(decision.title || `adr_${decision.id}`);
  let fileName: string;

  if (domainName) {
    fileName = FileMigration.generateFileName(
      workspaceName,
      domainName,
      adrName,
      undefined,
      'adr.yaml'
    );
  } else {
    fileName = `${workspaceName}_global_${adrName}.adr.yaml`;
  }

  const filePath = `adr/${fileName}`;

  try {
    await useGitHubRepoStore.getState().deleteFile(filePath);
    console.log(`[GitHubRepoSync] Deleted decision record: ${filePath}`);
  } catch (error) {
    console.warn(`[GitHubRepoSync] Failed to delete decision record: ${filePath}`, error);
  }
}

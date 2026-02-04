/**
 * Help System Types
 * Type definitions for the extensible help documentation system
 */

import type { ViewMode } from '@/stores/modelStore';

/**
 * Help topic categories
 */
export enum HelpCategory {
  GettingStarted = 'getting-started',
  Git = 'git',
  Canvas = 'canvas',
  Tables = 'tables',
  Relationships = 'relationships',
  Systems = 'systems',
  DataProducts = 'data-products',
  Decisions = 'decisions',
  Knowledge = 'knowledge',
  Sketch = 'sketch',
  KeyboardShortcuts = 'keyboard-shortcuts',
  Advanced = 'advanced',
}

/**
 * Help topic definition
 */
export interface HelpTopic {
  /** Unique identifier (e.g., 'git-authentication') */
  id: string;
  /** Display title */
  title: string;
  /** Category for grouping */
  category: HelpCategory;
  /** Search keywords */
  keywords: string[];
  /** Views where this topic is relevant (empty = all views) */
  contextualViews?: ViewMode[];
  /** Markdown content */
  content: string;
  /** Sort order within category (lower = first) */
  order?: number;
  /** IDs of related topics */
  relatedTopics?: string[];
}

/**
 * Help category metadata
 */
export interface HelpCategoryInfo {
  id: HelpCategory;
  label: string;
  description: string;
  order: number;
}

/**
 * Help search result
 */
export interface HelpSearchResult {
  topic: HelpTopic;
  /** Relevance score 0-1 */
  score: number;
  /** Where the match was found */
  matchedIn: ('title' | 'keywords' | 'content')[];
}

/**
 * Category metadata map
 */
export const HELP_CATEGORIES: Record<HelpCategory, HelpCategoryInfo> = {
  [HelpCategory.GettingStarted]: {
    id: HelpCategory.GettingStarted,
    label: 'Getting Started',
    description: 'Learn the basics of the application',
    order: 1,
  },
  [HelpCategory.Git]: {
    id: HelpCategory.Git,
    label: 'Git & GitHub',
    description: 'Version control and collaboration',
    order: 2,
  },
  [HelpCategory.Canvas]: {
    id: HelpCategory.Canvas,
    label: 'Canvas & Modeling',
    description: 'Working with the visual canvas',
    order: 3,
  },
  [HelpCategory.Tables]: {
    id: HelpCategory.Tables,
    label: 'Tables & Columns',
    description: 'Managing data tables and schemas',
    order: 4,
  },
  [HelpCategory.Relationships]: {
    id: HelpCategory.Relationships,
    label: 'Relationships',
    description: 'Defining table relationships',
    order: 5,
  },
  [HelpCategory.Systems]: {
    id: HelpCategory.Systems,
    label: 'Systems',
    description: 'Managing systems and integrations',
    order: 6,
  },
  [HelpCategory.DataProducts]: {
    id: HelpCategory.DataProducts,
    label: 'Data Products',
    description: 'Creating and managing data products',
    order: 7,
  },
  [HelpCategory.Decisions]: {
    id: HelpCategory.Decisions,
    label: 'Decision Logs',
    description: 'Documenting architectural decisions',
    order: 8,
  },
  [HelpCategory.Knowledge]: {
    id: HelpCategory.Knowledge,
    label: 'Knowledge Base',
    description: 'Documentation and articles',
    order: 9,
  },
  [HelpCategory.Sketch]: {
    id: HelpCategory.Sketch,
    label: 'Sketches',
    description: 'Freeform diagrams and drawings',
    order: 10,
  },
  [HelpCategory.KeyboardShortcuts]: {
    id: HelpCategory.KeyboardShortcuts,
    label: 'Keyboard Shortcuts',
    description: 'Quick reference for keyboard shortcuts',
    order: 11,
  },
  [HelpCategory.Advanced]: {
    id: HelpCategory.Advanced,
    label: 'Advanced',
    description: 'Advanced features and configuration',
    order: 12,
  },
};

/**
 * Get display label for category
 */
export function getCategoryLabel(category: HelpCategory): string {
  return HELP_CATEGORIES[category]?.label ?? category;
}

/**
 * Get sorted categories
 */
export function getSortedCategories(): HelpCategoryInfo[] {
  return Object.values(HELP_CATEGORIES).sort((a, b) => a.order - b.order);
}

/**
 * Search topics with scoring
 */
export function searchTopics(topics: HelpTopic[], query: string): HelpSearchResult[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const results: HelpSearchResult[] = [];

  for (const topic of topics) {
    let score = 0;
    const matchedIn: ('title' | 'keywords' | 'content')[] = [];

    // Title matching
    const titleLower = topic.title.toLowerCase();
    if (titleLower === normalizedQuery) {
      score += 1.0;
      matchedIn.push('title');
    } else if (titleLower.includes(normalizedQuery)) {
      score += 0.8;
      matchedIn.push('title');
    }

    // Keyword matching
    for (const keyword of topic.keywords) {
      const keywordLower = keyword.toLowerCase();
      if (keywordLower === normalizedQuery) {
        score += 0.7;
        if (!matchedIn.includes('keywords')) matchedIn.push('keywords');
        break;
      } else if (keywordLower.includes(normalizedQuery)) {
        score += 0.5;
        if (!matchedIn.includes('keywords')) matchedIn.push('keywords');
        break;
      }
    }

    // Content matching
    if (topic.content.toLowerCase().includes(normalizedQuery)) {
      score += 0.3;
      matchedIn.push('content');
    }

    if (score > 0) {
      results.push({
        topic,
        score: Math.min(score, 1.0),
        matchedIn,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Filter topics by view context
 */
export function filterTopicsByView(topics: HelpTopic[], view: ViewMode | null): HelpTopic[] {
  if (!view) return topics;

  return topics.filter((topic) => {
    // If no contextual views specified, show in all views
    if (!topic.contextualViews || topic.contextualViews.length === 0) {
      return true;
    }
    return topic.contextualViews.includes(view);
  });
}

/**
 * Group topics by category
 */
export function groupTopicsByCategory(topics: HelpTopic[]): Map<HelpCategory, HelpTopic[]> {
  const grouped = new Map<HelpCategory, HelpTopic[]>();

  for (const topic of topics) {
    const existing = grouped.get(topic.category) || [];
    existing.push(topic);
    grouped.set(topic.category, existing);
  }

  // Sort topics within each category by order
  for (const [category, categoryTopics] of grouped) {
    grouped.set(
      category,
      categoryTopics.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    );
  }

  return grouped;
}

/**
 * Help Types and Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import {
  HelpCategory,
  HELP_CATEGORIES,
  getCategoryLabel,
  getSortedCategories,
  searchTopics,
  filterTopicsByView,
  groupTopicsByCategory,
  type HelpTopic,
} from '@/types/help';

// Sample topics for testing
const sampleTopics: HelpTopic[] = [
  {
    id: 'git-overview',
    title: 'Git Integration Overview',
    category: HelpCategory.Git,
    keywords: ['git', 'version control', 'vcs'],
    content: 'Learn about Git integration features.',
    order: 1,
    contextualViews: ['operational', 'analytical'],
  },
  {
    id: 'git-commit',
    title: 'Committing Changes',
    category: HelpCategory.Git,
    keywords: ['commit', 'save', 'changes'],
    content: 'How to commit your changes to the repository.',
    order: 2,
  },
  {
    id: 'canvas-basics',
    title: 'Canvas Basics',
    category: HelpCategory.Canvas,
    keywords: ['canvas', 'diagram', 'visual'],
    content: 'Getting started with the visual canvas.',
    order: 1,
    contextualViews: ['operational', 'analytical', 'systems'],
  },
  {
    id: 'tables-create',
    title: 'Creating Tables',
    category: HelpCategory.Tables,
    keywords: ['table', 'create', 'new', 'schema'],
    content: 'Learn how to create new tables in your model.',
    order: 1,
    contextualViews: ['operational', 'analytical'],
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    category: HelpCategory.KeyboardShortcuts,
    keywords: ['keyboard', 'shortcut', 'hotkey', 'quick'],
    content: 'Quick reference for keyboard shortcuts.',
    order: 1,
  },
];

describe('Help Types', () => {
  describe('HELP_CATEGORIES', () => {
    it('should have all category metadata', () => {
      expect(HELP_CATEGORIES[HelpCategory.Git]).toBeDefined();
      expect(HELP_CATEGORIES[HelpCategory.Git].label).toBe('Git & GitHub');
      expect(HELP_CATEGORIES[HelpCategory.Git].order).toBeDefined();
    });

    it('should have unique order for each category', () => {
      const orders = Object.values(HELP_CATEGORIES).map((c) => c.order);
      const uniqueOrders = new Set(orders);
      expect(uniqueOrders.size).toBe(orders.length);
    });
  });

  describe('getCategoryLabel', () => {
    it('should return the label for a category', () => {
      expect(getCategoryLabel(HelpCategory.Git)).toBe('Git & GitHub');
      expect(getCategoryLabel(HelpCategory.Canvas)).toBe('Canvas & Modeling');
      expect(getCategoryLabel(HelpCategory.Tables)).toBe('Tables & Columns');
    });
  });

  describe('getSortedCategories', () => {
    it('should return categories sorted by order', () => {
      const sorted = getSortedCategories();

      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i]!.order).toBeGreaterThan(sorted[i - 1]!.order);
      }
    });

    it('should include all categories', () => {
      const sorted = getSortedCategories();
      expect(sorted.length).toBe(Object.keys(HelpCategory).length);
    });
  });
});

describe('searchTopics', () => {
  it('should return empty array for empty query', () => {
    expect(searchTopics(sampleTopics, '')).toEqual([]);
    expect(searchTopics(sampleTopics, '   ')).toEqual([]);
  });

  it('should find topics by exact title match', () => {
    const results = searchTopics(sampleTopics, 'Canvas Basics');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.topic.id).toBe('canvas-basics');
    expect(results[0]!.score).toBe(1.0);
    expect(results[0]!.matchedIn).toContain('title');
  });

  it('should find topics by partial title match', () => {
    const results = searchTopics(sampleTopics, 'canvas');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.topic.id).toBe('canvas-basics');
    expect(results[0]!.matchedIn).toContain('title');
  });

  it('should find topics by keyword match', () => {
    const results = searchTopics(sampleTopics, 'vcs');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.topic.id).toBe('git-overview');
    expect(results[0]!.matchedIn).toContain('keywords');
  });

  it('should find topics by content match', () => {
    const results = searchTopics(sampleTopics, 'repository');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.topic.id).toBe('git-commit');
    expect(results[0]!.matchedIn).toContain('content');
  });

  it('should be case insensitive', () => {
    const results1 = searchTopics(sampleTopics, 'GIT');
    const results2 = searchTopics(sampleTopics, 'git');

    expect(results1.length).toBe(results2.length);
  });

  it('should sort results by score descending', () => {
    const results = searchTopics(sampleTopics, 'git');

    for (let i = 1; i < results.length; i++) {
      expect(results[i]!.score).toBeLessThanOrEqual(results[i - 1]!.score);
    }
  });

  it('should cap score at 1.0', () => {
    // A topic matching in multiple places should still have max score of 1.0
    const results = searchTopics(sampleTopics, 'git');

    for (const result of results) {
      expect(result.score).toBeLessThanOrEqual(1.0);
    }
  });

  it('should return multiple matches', () => {
    const results = searchTopics(sampleTopics, 'create');

    // Should match "Creating Tables" title
    expect(results.some((r) => r.topic.id === 'tables-create')).toBe(true);
  });
});

describe('filterTopicsByView', () => {
  it('should return all topics when view is null', () => {
    const filtered = filterTopicsByView(sampleTopics, null);
    expect(filtered.length).toBe(sampleTopics.length);
  });

  it('should filter topics by contextual view', () => {
    const filtered = filterTopicsByView(sampleTopics, 'systems');

    // Only canvas-basics has 'systems' in contextualViews
    // Topics without contextualViews should also be included
    expect(filtered.some((t) => t.id === 'canvas-basics')).toBe(true);
    expect(filtered.some((t) => t.id === 'git-commit')).toBe(true); // No contextualViews = all views
    expect(filtered.some((t) => t.id === 'shortcuts')).toBe(true); // No contextualViews = all views
  });

  it('should include topics with no contextualViews in all views', () => {
    const filtered = filterTopicsByView(sampleTopics, 'decisions');

    // git-commit and shortcuts have no contextualViews, so should be included
    expect(filtered.some((t) => t.id === 'git-commit')).toBe(true);
    expect(filtered.some((t) => t.id === 'shortcuts')).toBe(true);
  });

  it('should exclude topics not relevant to the view', () => {
    const filtered = filterTopicsByView(sampleTopics, 'systems');

    // git-overview only has operational and analytical, not systems
    expect(filtered.some((t) => t.id === 'git-overview')).toBe(false);
  });
});

describe('groupTopicsByCategory', () => {
  it('should group topics by category', () => {
    const grouped = groupTopicsByCategory(sampleTopics);

    expect(grouped.get(HelpCategory.Git)?.length).toBe(2);
    expect(grouped.get(HelpCategory.Canvas)?.length).toBe(1);
    expect(grouped.get(HelpCategory.Tables)?.length).toBe(1);
    expect(grouped.get(HelpCategory.KeyboardShortcuts)?.length).toBe(1);
  });

  it('should sort topics within category by order', () => {
    const grouped = groupTopicsByCategory(sampleTopics);
    const gitTopics = grouped.get(HelpCategory.Git);

    expect(gitTopics).toBeDefined();
    expect(gitTopics![0]!.id).toBe('git-overview'); // order: 1
    expect(gitTopics![1]!.id).toBe('git-commit'); // order: 2
  });

  it('should handle empty topics array', () => {
    const grouped = groupTopicsByCategory([]);
    expect(grouped.size).toBe(0);
  });

  it('should not include categories with no topics', () => {
    const grouped = groupTopicsByCategory(sampleTopics);

    // Decisions category has no topics in our sample
    expect(grouped.has(HelpCategory.Decisions)).toBe(false);
  });
});

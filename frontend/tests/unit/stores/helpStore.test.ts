/**
 * Help Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useHelpStore } from '@/stores/helpStore';
import { HelpCategory } from '@/types/help';

describe('helpStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useHelpStore.getState().reset();
  });

  describe('panel visibility', () => {
    it('should start with panel closed', () => {
      const { isOpen } = useHelpStore.getState();
      expect(isOpen).toBe(false);
    });

    it('should open panel with openHelp()', () => {
      useHelpStore.getState().openHelp();
      expect(useHelpStore.getState().isOpen).toBe(true);
    });

    it('should close panel with closeHelp()', () => {
      useHelpStore.getState().openHelp();
      useHelpStore.getState().closeHelp();
      expect(useHelpStore.getState().isOpen).toBe(false);
    });

    it('should toggle panel with toggleHelp()', () => {
      const { toggleHelp } = useHelpStore.getState();

      toggleHelp();
      expect(useHelpStore.getState().isOpen).toBe(true);

      toggleHelp();
      expect(useHelpStore.getState().isOpen).toBe(false);
    });

    it('should open to specific topic with openHelp(topicId)', () => {
      useHelpStore.getState().openHelp('git-overview');

      const state = useHelpStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.selectedTopicId).toBe('git-overview');
    });
  });

  describe('topic selection', () => {
    it('should select a topic', () => {
      useHelpStore.getState().selectTopic('git-authentication');
      expect(useHelpStore.getState().selectedTopicId).toBe('git-authentication');
    });

    it('should add topic to history when selecting', () => {
      const { selectTopic } = useHelpStore.getState();

      selectTopic('topic-1');
      selectTopic('topic-2');
      selectTopic('topic-3');

      const state = useHelpStore.getState();
      expect(state.history).toEqual(['topic-1', 'topic-2', 'topic-3']);
      expect(state.historyIndex).toBe(2);
    });

    it('should not duplicate topic in history if same topic selected', () => {
      const { selectTopic } = useHelpStore.getState();

      selectTopic('topic-1');
      selectTopic('topic-1');

      expect(useHelpStore.getState().history).toEqual(['topic-1']);
    });

    it('should clear search when selecting a topic', () => {
      const store = useHelpStore.getState();
      store.setSearchQuery('test query');
      store.setSearchResults([
        {
          topic: {
            id: 'test',
            title: 'Test',
            category: HelpCategory.Git,
            keywords: [],
            content: '',
          },
          score: 1,
          matchedIn: ['title'],
        },
      ]);

      store.selectTopic('new-topic');

      const state = useHelpStore.getState();
      expect(state.searchQuery).toBe('');
      expect(state.searchResults).toEqual([]);
    });
  });

  describe('navigation history', () => {
    beforeEach(() => {
      const { selectTopic } = useHelpStore.getState();
      selectTopic('topic-1');
      selectTopic('topic-2');
      selectTopic('topic-3');
    });

    it('should go back in history', () => {
      useHelpStore.getState().goBack();

      const state = useHelpStore.getState();
      expect(state.selectedTopicId).toBe('topic-2');
      expect(state.historyIndex).toBe(1);
    });

    it('should go forward in history', () => {
      const store = useHelpStore.getState();
      store.goBack();
      store.goBack();
      store.goForward();

      const state = useHelpStore.getState();
      expect(state.selectedTopicId).toBe('topic-2');
      expect(state.historyIndex).toBe(1);
    });

    it('should report canGoBack correctly', () => {
      expect(useHelpStore.getState().canGoBack()).toBe(true);

      useHelpStore.getState().goBack();
      useHelpStore.getState().goBack();

      expect(useHelpStore.getState().canGoBack()).toBe(false);
    });

    it('should report canGoForward correctly', () => {
      expect(useHelpStore.getState().canGoForward()).toBe(false);

      useHelpStore.getState().goBack();

      expect(useHelpStore.getState().canGoForward()).toBe(true);
    });

    it('should truncate forward history when selecting new topic after going back', () => {
      const store = useHelpStore.getState();
      store.goBack(); // Now at topic-2
      store.selectTopic('topic-4'); // Should remove topic-3 from history

      const state = useHelpStore.getState();
      expect(state.history).toEqual(['topic-1', 'topic-2', 'topic-4']);
      expect(state.canGoForward()).toBe(false);
    });
  });

  describe('category management', () => {
    it('should toggle category expansion', () => {
      const { toggleCategory, expandedCategories } = useHelpStore.getState();

      toggleCategory(HelpCategory.Git);
      expect(useHelpStore.getState().expandedCategories.has(HelpCategory.Git)).toBe(true);

      toggleCategory(HelpCategory.Git);
      expect(useHelpStore.getState().expandedCategories.has(HelpCategory.Git)).toBe(false);
    });

    it('should expand category', () => {
      useHelpStore.getState().expandCategory(HelpCategory.Canvas);
      expect(useHelpStore.getState().expandedCategories.has(HelpCategory.Canvas)).toBe(true);
    });

    it('should select category', () => {
      useHelpStore.getState().selectCategory(HelpCategory.Tables);
      expect(useHelpStore.getState().selectedCategory).toBe(HelpCategory.Tables);
    });
  });

  describe('search', () => {
    it('should set search query', () => {
      useHelpStore.getState().setSearchQuery('git commit');
      expect(useHelpStore.getState().searchQuery).toBe('git commit');
    });

    it('should set search results', () => {
      const results = [
        {
          topic: {
            id: 'git-1',
            title: 'Git Basics',
            category: HelpCategory.Git,
            keywords: ['git'],
            content: '',
          },
          score: 0.9,
          matchedIn: ['title' as const],
        },
        {
          topic: {
            id: 'git-2',
            title: 'Git Advanced',
            category: HelpCategory.Git,
            keywords: ['git'],
            content: '',
          },
          score: 0.7,
          matchedIn: ['keywords' as const],
        },
      ];

      useHelpStore.getState().setSearchResults(results);
      expect(useHelpStore.getState().searchResults).toEqual(results);
    });

    it('should clear search', () => {
      const store = useHelpStore.getState();
      store.setSearchQuery('test');
      store.setSearchResults([
        {
          topic: {
            id: 'test',
            title: 'Test',
            category: HelpCategory.Git,
            keywords: [],
            content: '',
          },
          score: 1,
          matchedIn: ['title'],
        },
      ]);

      store.clearSearch();

      const state = useHelpStore.getState();
      expect(state.searchQuery).toBe('');
      expect(state.searchResults).toEqual([]);
    });
  });

  describe('contextual help', () => {
    it('should set contextual view', () => {
      useHelpStore.getState().setContextualView('decisions');
      expect(useHelpStore.getState().contextualView).toBe('decisions');
    });

    it('should toggle contextual only filter', () => {
      const { toggleContextualOnly } = useHelpStore.getState();

      expect(useHelpStore.getState().showContextualOnly).toBe(false);

      toggleContextualOnly();
      expect(useHelpStore.getState().showContextualOnly).toBe(true);

      toggleContextualOnly();
      expect(useHelpStore.getState().showContextualOnly).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      const store = useHelpStore.getState();

      // Set up some state
      store.openHelp('topic-1');
      store.selectTopic('topic-2');
      store.setSearchQuery('test');
      store.expandCategory(HelpCategory.Git);
      store.setContextualView('knowledge');

      // Reset
      store.reset();

      const state = useHelpStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.selectedTopicId).toBe(null);
      expect(state.searchQuery).toBe('');
      expect(state.history).toEqual([]);
      expect(state.expandedCategories.size).toBe(0);
    });
  });
});

/**
 * Help Store
 * Manages help panel state using Zustand
 */

import { create } from 'zustand';
import type { HelpCategory, HelpSearchResult } from '@/types/help';
import type { ViewMode } from '@/stores/modelStore';

interface HelpState {
  // Panel visibility
  isOpen: boolean;

  // Navigation
  selectedTopicId: string | null;
  selectedCategory: HelpCategory | null;
  expandedCategories: Set<HelpCategory>;

  // Search
  searchQuery: string;
  searchResults: HelpSearchResult[];

  // Contextual help
  contextualView: ViewMode | null;
  showContextualOnly: boolean;

  // History for back navigation
  history: string[];
  historyIndex: number;

  // Actions
  openHelp: (topicId?: string) => void;
  closeHelp: () => void;
  toggleHelp: () => void;

  selectTopic: (topicId: string) => void;
  selectCategory: (category: HelpCategory | null) => void;
  toggleCategory: (category: HelpCategory) => void;
  expandCategory: (category: HelpCategory) => void;

  setSearchQuery: (query: string) => void;
  setSearchResults: (results: HelpSearchResult[]) => void;
  clearSearch: () => void;

  setContextualView: (view: ViewMode | null) => void;
  toggleContextualOnly: () => void;

  goBack: () => void;
  goForward: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;

  reset: () => void;
}

const initialState = {
  isOpen: false,
  selectedTopicId: null,
  selectedCategory: null,
  expandedCategories: new Set<HelpCategory>(),
  searchQuery: '',
  searchResults: [],
  contextualView: null,
  showContextualOnly: false,
  history: [],
  historyIndex: -1,
};

export const useHelpStore = create<HelpState>((set, get) => ({
  ...initialState,

  openHelp: (topicId?: string) => {
    set((state) => {
      const newState: Partial<HelpState> = { isOpen: true };

      if (topicId) {
        newState.selectedTopicId = topicId;
        // Add to history
        const newHistory = [...state.history.slice(0, state.historyIndex + 1), topicId];
        newState.history = newHistory;
        newState.historyIndex = newHistory.length - 1;
      }

      return newState;
    });
  },

  closeHelp: () => {
    set({ isOpen: false });
  },

  toggleHelp: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },

  selectTopic: (topicId: string) => {
    set((state) => {
      // Only add to history if it's a new topic
      if (state.selectedTopicId !== topicId) {
        const newHistory = [...state.history.slice(0, state.historyIndex + 1), topicId];
        return {
          selectedTopicId: topicId,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          // Clear search when selecting a topic
          searchQuery: '',
          searchResults: [],
        };
      }
      return { selectedTopicId: topicId };
    });
  },

  selectCategory: (category: HelpCategory | null) => {
    set({ selectedCategory: category });
  },

  toggleCategory: (category: HelpCategory) => {
    set((state) => {
      const newExpanded = new Set(state.expandedCategories);
      if (newExpanded.has(category)) {
        newExpanded.delete(category);
      } else {
        newExpanded.add(category);
      }
      return { expandedCategories: newExpanded };
    });
  },

  expandCategory: (category: HelpCategory) => {
    set((state) => {
      const newExpanded = new Set(state.expandedCategories);
      newExpanded.add(category);
      return { expandedCategories: newExpanded };
    });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSearchResults: (results: HelpSearchResult[]) => {
    set({ searchResults: results });
  },

  clearSearch: () => {
    set({ searchQuery: '', searchResults: [] });
  },

  setContextualView: (view: ViewMode | null) => {
    set({ contextualView: view });
  },

  toggleContextualOnly: () => {
    set((state) => ({ showContextualOnly: !state.showContextualOnly }));
  },

  goBack: () => {
    set((state) => {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return {
          historyIndex: newIndex,
          selectedTopicId: state.history[newIndex] ?? null,
        };
      }
      return state;
    });
  },

  goForward: () => {
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return {
          historyIndex: newIndex,
          selectedTopicId: state.history[newIndex] ?? null,
        };
      }
      return state;
    });
  },

  canGoBack: () => {
    const state = get();
    return state.historyIndex > 0;
  },

  canGoForward: () => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },

  reset: () => {
    set({
      ...initialState,
      expandedCategories: new Set<HelpCategory>(),
    });
  },
}));

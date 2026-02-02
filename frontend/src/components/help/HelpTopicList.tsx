/**
 * Help Topic List Component
 * Sidebar navigation with collapsible categories
 */

import React, { useMemo } from 'react';
import { useHelpStore } from '@/stores/helpStore';
import {
  HelpCategory,
  getSortedCategories,
  groupTopicsByCategory,
  filterTopicsByView,
  type HelpTopic,
} from '@/types/help';

interface HelpTopicListProps {
  topics: HelpTopic[];
  className?: string;
}

export const HelpTopicList: React.FC<HelpTopicListProps> = ({ topics, className = '' }) => {
  const {
    selectedTopicId,
    expandedCategories,
    contextualView,
    showContextualOnly,
    selectTopic,
    toggleCategory,
    expandCategory,
    toggleContextualOnly,
  } = useHelpStore();

  // Filter and group topics
  const filteredTopics = useMemo(() => {
    if (showContextualOnly) {
      return filterTopicsByView(topics, contextualView);
    }
    return topics;
  }, [topics, contextualView, showContextualOnly]);

  const groupedTopics = useMemo(() => {
    return groupTopicsByCategory(filteredTopics);
  }, [filteredTopics]);

  const sortedCategories = useMemo(() => {
    return getSortedCategories().filter((cat) => groupedTopics.has(cat.id));
  }, [groupedTopics]);

  const handleTopicClick = (topicId: string, category: HelpCategory) => {
    selectTopic(topicId);
    // Ensure category is expanded when selecting a topic
    if (!expandedCategories.has(category)) {
      expandCategory(category);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Contextual Filter Toggle */}
      {contextualView && (
        <div className="px-3 py-2 border-b border-gray-200">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showContextualOnly}
              onChange={() => toggleContextualOnly()}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Show relevant topics only</span>
          </label>
        </div>
      )}

      {/* Topic List */}
      <div className="flex-1 overflow-y-auto">
        {sortedCategories.map((categoryInfo) => {
          const categoryTopics = groupedTopics.get(categoryInfo.id) || [];
          const isExpanded = expandedCategories.has(categoryInfo.id);

          return (
            <div key={categoryInfo.id} className="border-b border-gray-100 last:border-b-0">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(categoryInfo.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
              >
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700">{categoryInfo.label}</span>
                <span className="ml-auto text-xs text-gray-400">{categoryTopics.length}</span>
              </button>

              {/* Topics in Category */}
              {isExpanded && (
                <div className="pb-1">
                  {categoryTopics.map((topic) => {
                    const isSelected = selectedTopicId === topic.id;
                    return (
                      <button
                        key={topic.id}
                        onClick={() => handleTopicClick(topic.id, categoryInfo.id)}
                        className={`w-full flex items-center gap-2 pl-9 pr-3 py-1.5 text-left text-sm transition-colors ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute left-3 w-1.5 h-1.5 rounded-full bg-blue-600" />
                        )}
                        <span className="truncate">{topic.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {sortedCategories.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500">No topics available</div>
        )}
      </div>
    </div>
  );
};

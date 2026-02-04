/**
 * Help Topic Viewer Component
 * Displays the content of a selected help topic
 */

import React, { useMemo } from 'react';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { HelpCategoryBadge } from './HelpCategoryBadge';
import { useHelpStore } from '@/stores/helpStore';
import type { HelpTopic } from '@/types/help';

interface HelpTopicViewerProps {
  topic: HelpTopic;
  allTopics: HelpTopic[];
  className?: string;
}

export const HelpTopicViewer: React.FC<HelpTopicViewerProps> = ({
  topic,
  allTopics,
  className = '',
}) => {
  const { selectTopic, goBack, goForward, canGoBack, canGoForward, expandCategory } =
    useHelpStore();

  // Get related topics
  const relatedTopics = useMemo(() => {
    if (!topic.relatedTopics || topic.relatedTopics.length === 0) {
      return [];
    }
    return topic.relatedTopics
      .map((id) => allTopics.find((t) => t.id === id))
      .filter((t): t is HelpTopic => t !== undefined);
  }, [topic.relatedTopics, allTopics]);

  const handleRelatedClick = (relatedTopic: HelpTopic) => {
    expandCategory(relatedTopic.category);
    selectTopic(relatedTopic.id);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Navigation */}
      <div className="flex items-center gap-2 pb-3 border-b border-gray-200 mb-4">
        <button
          onClick={() => goBack()}
          disabled={!canGoBack()}
          className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Go back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <button
          onClick={() => goForward()}
          disabled={!canGoForward()}
          className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Go forward"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="flex-1" />
        <HelpCategoryBadge category={topic.category} size="md" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pr-2">
        <MarkdownRenderer content={topic.content} />

        {/* Related Topics */}
        {relatedTopics.length > 0 && (
          <div className="mt-8 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Related Topics</h4>
            <div className="flex flex-wrap gap-2">
              {relatedTopics.map((related) => (
                <button
                  key={related.id}
                  onClick={() => handleRelatedClick(related)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  {related.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Welcome view when no topic is selected
 */
export const HelpWelcome: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-16 h-16 mb-4 rounded-full bg-blue-100 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Help</h3>
      <p className="text-sm text-gray-600 mb-4 max-w-sm">
        Select a topic from the left sidebar to get started, or use the search to find what you
        need.
      </p>
      <div className="text-xs text-gray-400 space-y-1">
        <p>
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300 font-mono">
            F1
          </kbd>{' '}
          to toggle help
        </p>
        <p>
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300 font-mono">
            Esc
          </kbd>{' '}
          to close
        </p>
      </div>
    </div>
  );
};

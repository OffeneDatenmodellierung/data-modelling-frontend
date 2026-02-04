/**
 * Help Search Component
 * Search input with results for help topics
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHelpStore } from '@/stores/helpStore';
import { searchTopics, type HelpSearchResult, type HelpTopic } from '@/types/help';
import { HelpCategoryBadge } from './HelpCategoryBadge';

interface HelpSearchProps {
  topics: HelpTopic[];
  className?: string;
}

export const HelpSearch: React.FC<HelpSearchProps> = ({ topics, className = '' }) => {
  const { searchQuery, searchResults, setSearchQuery, setSearchResults, selectTopic, clearSearch } =
    useHelpStore();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        if (query.trim()) {
          const results = searchTopics(topics, query);
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      }, 150);
    },
    [topics, setSearchQuery, setSearchResults]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSelectResult = useCallback(
    (result: HelpSearchResult) => {
      selectTopic(result.topic.id);
      clearSearch();
      inputRef.current?.blur();
    },
    [selectTopic, clearSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSearch();
        inputRef.current?.blur();
      } else if (e.key === 'Enter' && searchResults.length > 0) {
        const firstResult = searchResults[0];
        if (firstResult) {
          handleSelectResult(firstResult);
        }
      }
    },
    [searchResults, handleSelectResult, clearSearch]
  );

  const showResults = isFocused && searchQuery.trim() && searchResults.length > 0;

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay blur to allow click on results
            setTimeout(() => setIsFocused(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search help..."
          className="w-full px-3 py-2 pl-9 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {searchQuery && (
          <button
            onClick={() => {
              clearSearch();
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
          {searchResults.map((result) => (
            <button
              key={result.topic.id}
              onClick={() => handleSelectResult(result)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {result.topic.title}
                </span>
                <HelpCategoryBadge category={result.topic.category} size="sm" />
              </div>
              {result.matchedIn.includes('content') && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">Found in content...</p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {isFocused && searchQuery.trim() && searchResults.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3">
          <p className="text-sm text-gray-500 text-center">No topics found</p>
        </div>
      )}
    </div>
  );
};

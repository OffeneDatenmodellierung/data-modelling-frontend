/**
 * Sketch List Component
 * Displays a list of sketches with thumbnails and filtering
 */

import React, { useState, useMemo } from 'react';
import { useSketchStore } from '@/stores/sketchStore';
import type { Sketch } from '@/types/sketch';

export interface SketchListProps {
  domainId?: string;
  onSelectSketch?: (sketch: Sketch) => void;
  onCreateSketch?: () => void;
  className?: string;
}

type SortField = 'name' | 'last_modified_at';
type SortOrder = 'asc' | 'desc';

export const SketchList: React.FC<SketchListProps> = ({
  domainId,
  onSelectSketch,
  onCreateSketch,
  className = '',
}) => {
  const {
    filteredSketches,
    selectedSketch,
    filter,
    isLoading,
    error,
    setFilter,
    setSelectedSketch,
  } = useSketchStore();

  const [searchInput, setSearchInput] = useState(filter.search || '');
  const [sortField, setSortField] = useState<SortField>('last_modified_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Set domain filter on mount if provided
  React.useEffect(() => {
    if (domainId) {
      setFilter({ ...filter, domain_id: domainId });
    }
  }, [domainId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFilter((prev) => ({ ...prev, search: searchInput || undefined }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setFilter]);

  // Sort sketches
  const sortedSketches = useMemo(() => {
    const sorted = [...filteredSketches];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = (a.title || a.name || '').localeCompare(b.title || b.name || '');
          break;
        case 'last_modified_at':
          comparison =
            new Date(a.last_modified_at).getTime() - new Date(b.last_modified_at).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredSketches, sortField, sortOrder]);

  const handleSketchClick = (sketch: Sketch) => {
    setSelectedSketch(sketch);
    onSelectSketch?.(sketch);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setFilter({ domain_id: domainId });
  };

  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading sketches...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => setFilter({ domain_id: domainId })}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Sketches</h2>
        {onCreateSketch && (
          <button
            onClick={onCreateSketch}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Sketch
          </button>
        )}
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search sketches..."
            className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
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
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
        <span>Sort by:</span>
        {(['name', 'last_modified_at'] as SortField[]).map((field) => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            className={`px-2 py-1 rounded ${
              sortField === field ? 'bg-gray-200 text-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            {field === 'last_modified_at' ? 'Modified' : 'Name'}
            {sortField === field && <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
          </button>
        ))}
      </div>

      {/* Sketch Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {sortedSketches.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <svg
              className="mx-auto w-12 h-12 text-gray-400 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="font-medium">No sketches found</p>
            <p className="text-sm mt-1">
              {searchInput
                ? 'Try adjusting your search'
                : 'Create your first sketch to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {sortedSketches.map((sketch) => (
              <div
                key={sketch.id}
                onClick={() => handleSketchClick(sketch)}
                className={`group cursor-pointer rounded-lg border-2 transition-all overflow-hidden ${
                  selectedSketch?.id === sketch.id
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-100 relative">
                  {sketch.thumbnail ? (
                    <img
                      src={sketch.thumbnail}
                      alt={sketch.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg
                        className="w-12 h-12 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="font-medium text-gray-900 truncate" title={sketch.name}>
                    {sketch.name}
                  </h3>
                  {sketch.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{sketch.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span>Modified {new Date(sketch.last_modified_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
        {sortedSketches.length} sketch{sortedSketches.length !== 1 ? 'es' : ''}
        {searchInput && ' (filtered)'}
      </div>
    </div>
  );
};

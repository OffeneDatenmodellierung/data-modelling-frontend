/**
 * Sketch Viewer Component
 * Read-only view of a sketch with Excalidraw in view mode
 */

import React, { useEffect, useState, useRef } from 'react';
import { useSketchStore } from '@/stores/sketchStore';
import { useUIStore } from '@/stores/uiStore';
import { sketchService } from '@/services/sdk/sketchService';
import type { Sketch, SketchExportFormat } from '@/types/sketch';
import { generateSketchFilename } from '@/types/sketch';

export interface SketchViewerProps {
  sketch: Sketch;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const SketchViewer: React.FC<SketchViewerProps> = ({
  sketch,
  onEdit,
  onDelete,
  className = '',
}) => {
  const { addToast } = useUIStore();
  const { removeSketch } = useSketchStore();
  const [ExcalidrawComponent, setExcalidrawComponent] = useState<React.ComponentType<any> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const initialDataRef = useRef<any>(null);

  // Parse sketch data
  useEffect(() => {
    if (sketch.excalidraw_data) {
      try {
        initialDataRef.current = JSON.parse(sketch.excalidraw_data);
      } catch (err) {
        console.error('Failed to parse Excalidraw data:', err);
        initialDataRef.current = { elements: [], appState: {}, files: {} };
      }
    }
  }, [sketch.excalidraw_data]);

  // Dynamically import Excalidraw
  useEffect(() => {
    const loadExcalidraw = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const module = await import('@excalidraw/excalidraw');
        setExcalidrawComponent(() => module.Excalidraw);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load Excalidraw:', err);
        setIsLoading(false);
      }
    };

    loadExcalidraw();
  }, []);

  const handleExport = async (format: SketchExportFormat) => {
    setIsExporting(true);
    try {
      const result = await sketchService.export(sketch, { format });
      const filename = generateSketchFilename(sketch.title || sketch.name || 'sketch', format);

      if (result instanceof Blob) {
        sketchService.downloadBlob(result, filename);
      } else {
        sketchService.downloadString(
          result,
          filename,
          format === 'svg' ? 'image/svg+xml' : 'application/json'
        );
      }

      addToast({
        type: 'success',
        message: `Sketch exported as ${format.toUpperCase()}`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        message: `Failed to export: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = () => {
    removeSketch(sketch.id);
    onDelete?.();
    addToast({
      type: 'success',
      message: 'Sketch deleted',
    });
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{sketch.name}</h2>
          {sketch.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{sketch.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          {/* Export Dropdown */}
          <div className="relative group">
            <button
              disabled={isExporting}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isExporting ? (
                <span className="animate-spin">↻</span>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              )}
              Export
            </button>
            <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <div className="py-1">
                <button
                  onClick={() => handleExport('png')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Export as PNG
                </button>
                <button
                  onClick={() => handleExport('svg')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Export as SVG
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Export as JSON
                </button>
              </div>
            </div>
          </div>

          {/* Edit Button */}
          {onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </button>
          )}

          {/* Delete Button */}
          {onDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 px-4 py-2 text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
        <span>Created: {new Date(sketch.created_at).toLocaleDateString()}</span>
        <span>Modified: {new Date(sketch.last_modified_at).toLocaleDateString()}</span>
        {sketch.linked_tables && sketch.linked_tables.length > 0 && (
          <span>{sketch.linked_tables.length} linked table(s)</span>
        )}
        {sketch.linked_systems && sketch.linked_systems.length > 0 && (
          <span>{sketch.linked_systems.length} linked system(s)</span>
        )}
      </div>

      {/* Excalidraw Viewer */}
      <div className="flex-1 min-h-0 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading viewer...</div>
          </div>
        ) : ExcalidrawComponent && initialDataRef.current ? (
          <ExcalidrawComponent
            initialData={initialDataRef.current}
            viewModeEnabled={true}
            zenModeEnabled={false}
            gridModeEnabled={false}
            theme="light"
            langCode="en"
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: false,
                clearCanvas: false,
                export: false,
                loadScene: false,
                saveToActiveFile: false,
                toggleTheme: false,
              },
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Unable to load sketch
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Sketch</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete &quot;{sketch.name}&quot;? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

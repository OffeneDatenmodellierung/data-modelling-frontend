/**
 * Excalidraw Editor Component
 * React wrapper for Excalidraw library
 * Provides freeform diagramming capabilities
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { sketchService } from '@/services/sdk/sketchService';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

export interface ExcalidrawEditorProps {
  data?: string; // JSON string of Excalidraw data
  name?: string;
  onSave?: (data: string, name: string) => void;
  onClose?: () => void;
  readOnly?: boolean;
}

export const ExcalidrawEditor: React.FC<ExcalidrawEditorProps> = ({
  data,
  name: initialName,
  onSave,
  onClose,
  readOnly = false,
}) => {
  const { addToast } = useUIStore();
  const [ExcalidrawComponent, setExcalidrawComponent] = useState<React.ComponentType<any> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sketchName, setSketchName] = useState(initialName || 'Untitled Sketch');
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const initialDataRef = useRef<any>(null);

  // Parse initial data
  useEffect(() => {
    if (data) {
      try {
        initialDataRef.current = JSON.parse(data);
      } catch (err) {
        console.error('Failed to parse Excalidraw data:', err);
        setError('Failed to parse sketch data');
      }
    } else {
      // Empty sketch
      initialDataRef.current = {
        elements: [],
        appState: {
          viewBackgroundColor: '#ffffff',
        },
        files: {},
      };
    }
  }, [data]);

  // Dynamically import Excalidraw to reduce initial bundle size
  useEffect(() => {
    const loadExcalidraw = async () => {
      try {
        // Defer initialization to ensure container is rendered
        await new Promise((resolve) => setTimeout(resolve, 100));

        const module = await import('@excalidraw/excalidraw');
        setExcalidrawComponent(() => module.Excalidraw);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load Excalidraw:', err);
        setError(`Failed to load editor: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };

    loadExcalidraw();
  }, []);

  const handleSave = useCallback(async () => {
    if (!excalidrawAPIRef.current || !onSave) return;

    setIsSaving(true);
    setError(null);

    try {
      const elements = excalidrawAPIRef.current.getSceneElements();
      const appState = excalidrawAPIRef.current.getAppState();
      const files = excalidrawAPIRef.current.getFiles();

      const exportData = {
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize,
        },
        files,
      };

      const jsonData = JSON.stringify(exportData);

      // Validate data
      const validation = await sketchService.validateData(jsonData);
      if (!validation.valid) {
        throw new Error(
          `Invalid sketch data: ${validation.errors?.join(', ') || 'Validation failed'}`
        );
      }

      await onSave(jsonData, sketchName.trim() || 'Untitled Sketch');
      addToast({
        type: 'success',
        message: 'Sketch saved successfully',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save sketch';
      setError(errorMessage);
      addToast({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  }, [onSave, sketchName, addToast]);

  if (error && !ExcalidrawComponent) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <h3 className="text-sm font-semibold text-red-800 mb-2">Error</h3>
          <p className="text-sm text-red-700">{error}</p>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-1">
          <h3 className="text-sm font-semibold text-gray-700">Sketch Editor</h3>
          {isLoading && <span className="text-xs text-gray-500">Loading...</span>}
          {!readOnly && (
            <div className="flex items-center gap-2 ml-4">
              <label htmlFor="sketch-name" className="text-xs text-gray-600 whitespace-nowrap">
                Sketch Name:
              </label>
              <input
                id="sketch-name"
                type="text"
                value={sketchName}
                onChange={(e) => setSketchName(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                placeholder="Enter sketch name..."
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onSave && !readOnly && (
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading || !sketchName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 min-h-0" style={{ height: '100%' }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading Excalidraw...</div>
          </div>
        ) : ExcalidrawComponent ? (
          <ExcalidrawComponent
            excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
              excalidrawAPIRef.current = api;
            }}
            initialData={initialDataRef.current}
            viewModeEnabled={readOnly}
            zenModeEnabled={false}
            gridModeEnabled={false}
            theme="light"
            langCode="en"
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: !readOnly,
                clearCanvas: !readOnly,
                export: { saveFileToDisk: true },
                loadScene: !readOnly,
                saveToActiveFile: false,
                toggleTheme: true,
              },
            }}
          />
        ) : null}
      </div>

      {/* Error display at bottom if needed */}
      {error && ExcalidrawComponent && (
        <div className="p-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
};

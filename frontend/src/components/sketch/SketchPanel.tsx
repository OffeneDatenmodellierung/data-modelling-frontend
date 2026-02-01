/**
 * Sketch Panel Component
 * Main panel for viewing and managing sketches within a domain
 */

import React, { useState, useCallback } from 'react';
import { SketchList } from './SketchList';
import { SketchViewer } from './SketchViewer';
import { ExcalidrawEditor } from '@/components/editors/ExcalidrawEditor';
import { useSketchStore } from '@/stores/sketchStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import type { Sketch } from '@/types/sketch';

export interface SketchPanelProps {
  workspacePath: string;
  domainId: string;
  className?: string;
}

type PanelMode = 'list' | 'view' | 'edit' | 'create';

export const SketchPanel: React.FC<SketchPanelProps> = ({
  workspacePath: _workspacePath,
  domainId,
  className = '',
}) => {
  const { selectedSketch, setSelectedSketch, createSketch, updateSketchData } = useSketchStore();
  const { currentWorkspaceId } = useWorkspaceStore();
  const [mode, setMode] = useState<PanelMode>('list');

  const handleSelectSketch = useCallback(
    (sketch: Sketch) => {
      setSelectedSketch(sketch);
      setMode('view');
    },
    [setSelectedSketch]
  );

  const handleCreateSketch = useCallback(() => {
    setSelectedSketch(null);
    setMode('create');
  }, [setSelectedSketch]);

  const handleEditSketch = useCallback(() => {
    setMode('edit');
  }, []);

  const handleSave = useCallback(
    async (data: string, name: string) => {
      if (mode === 'create') {
        // Create new sketch
        const newSketch = createSketch({
          title: name,
          name,
          domain_id: domainId,
          workspace_id: currentWorkspaceId || undefined,
        });
        // Update with the actual data
        await updateSketchData(newSketch.id, data);
        setMode('view');
      } else if (selectedSketch) {
        // Update existing sketch
        await updateSketchData(selectedSketch.id, data);
        // Update name if changed
        if (name !== selectedSketch.name) {
          useSketchStore.getState().updateSketch(selectedSketch.id, { name });
        }
        setMode('view');
      }
    },
    [mode, selectedSketch, domainId, currentWorkspaceId, createSketch, updateSketchData]
  );

  const handleCancel = useCallback(() => {
    if (selectedSketch) {
      setMode('view');
    } else {
      setMode('list');
    }
  }, [selectedSketch]);

  const handleDeleteComplete = useCallback(() => {
    setSelectedSketch(null);
    setMode('list');
  }, [setSelectedSketch]);

  return (
    <div className={`flex h-full bg-white ${className}`}>
      {/* Left Panel - List */}
      <div className="w-80 border-r border-gray-200 flex-shrink-0 flex flex-col">
        <SketchList
          domainId={domainId}
          onSelectSketch={handleSelectSketch}
          onCreateSketch={handleCreateSketch}
        />
      </div>

      {/* Right Panel - Viewer/Editor */}
      <div className="flex-1 overflow-hidden">
        {mode === 'list' && !selectedSketch && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg
              className="w-16 h-16 text-gray-300 mb-4"
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
            <p className="text-lg font-medium">No sketch selected</p>
            <p className="text-sm mt-1">Select a sketch from the list or create a new one</p>
            <button
              onClick={handleCreateSketch}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Sketch
            </button>
          </div>
        )}

        {mode === 'view' && selectedSketch && (
          <SketchViewer
            sketch={selectedSketch}
            onEdit={handleEditSketch}
            onDelete={handleDeleteComplete}
          />
        )}

        {mode === 'edit' && selectedSketch && (
          <ExcalidrawEditor
            data={selectedSketch.excalidraw_data}
            name={selectedSketch.name}
            onSave={handleSave}
            onClose={handleCancel}
          />
        )}

        {mode === 'create' && (
          <ExcalidrawEditor name="Untitled Sketch" onSave={handleSave} onClose={handleCancel} />
        )}
      </div>
    </div>
  );
};

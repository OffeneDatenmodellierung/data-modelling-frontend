/**
 * DMN Editor Component
 * React wrapper for dmn-js Modeler
 * Provides DMN 1.3 decision table editing capabilities
 */

import React, { useEffect, useRef, useState } from 'react';
import DmnModeler from 'dmn-js/lib/Modeler';
import 'dmn-js/dist/assets/diagram-js.css';
import 'dmn-js/dist/assets/dmn-font/css/dmn.css';
import { dmnService } from '@/services/sdk/dmnService';
import { useUIStore } from '@/stores/uiStore';

export interface DMNEditorProps {
  xml?: string;
  name?: string;
  onSave?: (xml: string, name: string) => void;
  onClose?: () => void;
  readOnly?: boolean;
}

export const DMNEditor: React.FC<DMNEditorProps> = ({
  xml,
  name: initialName,
  onSave,
  onClose,
  readOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<DmnModeler | null>(null);
  const { addToast } = useUIStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisionName, setDecisionName] = useState(initialName || 'Untitled Decision');

  // Initialize dmn-js modeler
  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    try {
      const modeler = new DmnModeler({
        container: containerRef.current,
        // keyboard.bindTo is deprecated - keyboard binding is now implicit
      });

      modelerRef.current = modeler;

      // Import XML if provided
      if (xml) {
        modeler
          .importXML(xml)
          .then(() => {
            setIsLoading(false);
            setError(null);
          })
          .catch((err) => {
            console.error('Failed to import DMN XML:', err);
            setError(`Failed to load DMN diagram: ${err.message || 'Unknown error'}`);
            setIsLoading(false);
          });
      } else {
        // Create empty decision table - import proper empty DMN XML with decision table
        const emptyDMN = `<?xml version="1.0" encoding="UTF-8"?>
<dmn:definitions xmlns:dmn="http://www.omg.org/spec/DMN/20191111/MODEL/" 
                 xmlns:dmndi="http://www.omg.org/spec/DMN/20191111/DMNDI/" 
                 xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" 
                 id="empty-definitions" 
                 name="Empty Decision" 
                 namespace="http://camunda.org/schema/1.0/dmn">
  <dmn:decision id="decision-1" name="Decision 1">
    <dmn:decisionTable id="decision-table-1">
      <dmn:input id="input-1" label="Input">
        <dmn:inputExpression id="input-expression-1" typeRef="string" />
      </dmn:input>
      <dmn:output id="output-1" label="Output" typeRef="string" />
    </dmn:decisionTable>
  </dmn:decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram id="diagram-1" name="DMN Diagram">
      <dmndi:DMNShape id="shape-decision-1" dmnElementRef="decision-1">
        <dc:Bounds x="100" y="100" width="200" height="100" />
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</dmn:definitions>`;
        modeler
          .importXML(emptyDMN)
          .then(() => {
            setIsLoading(false);
          })
          .catch((err: any) => {
            // eslint-disable-next-line no-console
            console.error('Failed to create empty diagram:', err);
            setError(`Failed to initialize editor: ${err.message || 'Unknown error'}`);
            setIsLoading(false);
          });
      }

      // Cleanup on unmount
      return () => {
        if (modelerRef.current) {
          modelerRef.current.destroy();
          modelerRef.current = null;
        }
      };
    } catch (err) {
      console.error('Failed to initialize DMN modeler:', err);
      setError(`Failed to initialize editor: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
      return undefined;
    }
  }, []); // Only run once on mount

  // Re-import XML when it changes externally
  useEffect(() => {
    if (!modelerRef.current || !xml) return;

    modelerRef.current
      .importXML(xml)
      .catch((err) => {
        console.error('Failed to re-import DMN XML:', err);
        setError(`Failed to load DMN diagram: ${err.message || 'Unknown error'}`);
      });
  }, [xml]);

  const handleSave = async () => {
    if (!modelerRef.current || !onSave) return;

    setIsSaving(true);
    setError(null);

    try {
      const { xml: exportedXml } = await modelerRef.current.saveXML({ format: true });

      // Validate XML before saving
      const validation = await dmnService.validateXML(exportedXml);
      if (!validation.valid) {
        throw new Error(`Invalid DMN XML: ${validation.errors?.join(', ') || 'Validation failed'}`);
      }

      await onSave(exportedXml, decisionName.trim() || 'Untitled Decision');
      addToast({
        type: 'success',
        message: 'DMN diagram saved successfully',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save DMN diagram';
      setError(errorMessage);
      addToast({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
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
          <h3 className="text-sm font-semibold text-gray-700">DMN Decision Editor</h3>
          {isLoading && (
            <span className="text-xs text-gray-500">Loading...</span>
          )}
          {!readOnly && (
            <div className="flex items-center gap-2 ml-4">
              <label htmlFor="dmn-decision-name" className="text-xs text-gray-600 whitespace-nowrap">
                Decision Name:
              </label>
              <input
                id="dmn-decision-name"
                type="text"
                value={decisionName}
                onChange={(e) => setDecisionName(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                placeholder="Enter decision name..."
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onSave && (
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading || readOnly || !decisionName.trim()}
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
      <div ref={containerRef} className="flex-1 min-h-0" style={{ height: '100%' }} />
    </div>
  );
};


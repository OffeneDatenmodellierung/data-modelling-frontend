/**
 * Editor Modal Component
 * Popout modal wrapper for BPMN/DMN/Excalidraw editors
 * Provides draggable, resizable modal functionality
 */

import React from 'react';
import { DraggableModal } from '@/components/common/DraggableModal';
import { BPMNEditor, type BPMNEditorProps } from './BPMNEditor';
import { DMNEditor, type DMNEditorProps } from './DMNEditor';
import { ExcalidrawEditor, type ExcalidrawEditorProps } from './ExcalidrawEditor';

export type EditorType = 'bpmn' | 'dmn' | 'excalidraw';

export interface EditorModalProps {
  type: EditorType;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  bpmnProps?: Omit<BPMNEditorProps, 'onClose'>;
  dmnProps?: Omit<DMNEditorProps, 'onClose'>;
  excalidrawProps?: Omit<ExcalidrawEditorProps, 'onClose'>;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const EditorModal: React.FC<EditorModalProps> = ({
  type,
  isOpen,
  onClose,
  title,
  bpmnProps,
  dmnProps,
  excalidrawProps,
  size = 'xl',
}) => {
  const handleSave = async (data: string, name: string) => {
    if (type === 'bpmn' && bpmnProps?.onSave) {
      await bpmnProps.onSave(data, name);
    } else if (type === 'dmn' && dmnProps?.onSave) {
      await dmnProps.onSave(data, name);
    } else if (type === 'excalidraw' && excalidrawProps?.onSave) {
      await excalidrawProps.onSave(data, name);
    }
  };

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size === 'full' ? 'xxl' : size}
      noPadding={true}
      resizable={true}
    >
      {type === 'bpmn' && <BPMNEditor {...bpmnProps} onSave={handleSave} onClose={onClose} />}
      {type === 'dmn' && <DMNEditor {...dmnProps} onSave={handleSave} onClose={onClose} />}
      {type === 'excalidraw' && (
        <ExcalidrawEditor {...excalidrawProps} onSave={handleSave} onClose={onClose} />
      )}
    </DraggableModal>
  );
};

/**
 * Help Panel Component
 * Main help modal with search, navigation, and content display
 */

import React, { useMemo } from 'react';
import { DraggableModal } from '@/components/common/DraggableModal';
import { useHelpStore } from '@/stores/helpStore';
import { HelpSearch } from './HelpSearch';
import { HelpTopicList } from './HelpTopicList';
import { HelpTopicViewer, HelpWelcome } from './HelpTopicViewer';
import { helpTopics } from '@/content/help';

export const HelpPanel: React.FC = () => {
  const { isOpen, closeHelp, selectedTopicId } = useHelpStore();

  // Find selected topic
  const selectedTopic = useMemo(() => {
    if (!selectedTopicId) return null;
    return helpTopics.find((t) => t.id === selectedTopicId) || null;
  }, [selectedTopicId]);

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={closeHelp}
      title="Help"
      size="xl"
      resizable
      initialPosition={{ x: 100, y: 60 }}
      noPadding
    >
      <div className="flex h-[600px]">
        {/* Left Sidebar */}
        <div className="w-72 border-r border-gray-200 flex flex-col bg-gray-50">
          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <HelpSearch topics={helpTopics} />
          </div>

          {/* Topic List */}
          <HelpTopicList topics={helpTopics} className="flex-1" />
        </div>

        {/* Right Content */}
        <div className="flex-1 p-6 overflow-hidden">
          {selectedTopic ? (
            <HelpTopicViewer topic={selectedTopic} allTopics={helpTopics} />
          ) : (
            <HelpWelcome />
          )}
        </div>
      </div>
    </DraggableModal>
  );
};

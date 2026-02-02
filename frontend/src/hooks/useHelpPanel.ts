/**
 * Help Panel Hook
 * Manages keyboard shortcuts and contextual state for the help panel
 */

import { useEffect, useCallback } from 'react';
import { useHelpStore } from '@/stores/helpStore';
import { useModelStore } from '@/stores/modelStore';

/**
 * Hook to manage help panel keyboard shortcuts and contextual state
 */
export function useHelpPanel() {
  const { isOpen, openHelp, closeHelp, toggleHelp, setContextualView } = useHelpStore();
  const currentView = useModelStore((state) => state.currentView);

  // Sync contextual view when it changes
  useEffect(() => {
    setContextualView(currentView);
  }, [currentView, setContextualView]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Only allow Escape to close help when in input
        if (e.key === 'Escape' && isOpen) {
          e.preventDefault();
          closeHelp();
        }
        return;
      }

      // F1 - Toggle help
      if (e.key === 'F1') {
        e.preventDefault();
        toggleHelp();
        return;
      }

      // Cmd+? or Ctrl+? - Toggle help (Shift+/ = ?)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '/') {
        e.preventDefault();
        toggleHelp();
        return;
      }

      // Escape - Close help if open
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        closeHelp();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleHelp, closeHelp]);

  // Open help with optional topic
  const openHelpTopic = useCallback(
    (topicId?: string) => {
      openHelp(topicId);
    },
    [openHelp]
  );

  return {
    isOpen,
    openHelp: openHelpTopic,
    closeHelp,
    toggleHelp,
    currentView,
  };
}

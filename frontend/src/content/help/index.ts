/**
 * Help Topics Registry
 * Combines all help topics from different categories
 */

import type { HelpTopic } from '@/types/help';
import { gettingStartedTopics } from './topics/getting-started';
import { gitTopics } from './topics/git';
import { keyboardShortcutsTopics } from './topics/keyboard-shortcuts';

/**
 * All help topics combined and sorted
 */
export const helpTopics: HelpTopic[] = [
  ...gettingStartedTopics,
  ...gitTopics,
  ...keyboardShortcutsTopics,
];

/**
 * Get a topic by ID
 */
export function getTopicById(id: string): HelpTopic | undefined {
  return helpTopics.find((topic) => topic.id === id);
}

/**
 * Get topics by category
 */
export function getTopicsByCategory(category: string): HelpTopic[] {
  return helpTopics.filter((topic) => topic.category === category);
}

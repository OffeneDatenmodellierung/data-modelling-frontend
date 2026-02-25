/**
 * Custom Properties Helpers
 *
 * Centralises access to reserved customProperties keys (e.g., source_topic)
 * stored in the ODCS-compliant Array<{property, value}> format.
 */

import type { CustomProperty } from '@/types/table';

/** Reserved customProperties key for source topic grouping */
export const SOURCE_TOPIC_KEY = 'source_topic';

/**
 * Extract source_topic value from a customProperties array.
 */
export function getSourceTopic(customProps: CustomProperty[] | undefined): string | undefined {
  if (!customProps || !Array.isArray(customProps)) return undefined;
  const prop = customProps.find((p) => p.property === SOURCE_TOPIC_KEY);
  return typeof prop?.value === 'string' && prop.value.trim() ? prop.value : undefined;
}

/**
 * Return a new customProperties array with source_topic set or removed.
 * Preserves all other existing properties.
 */
export function setSourceTopic(
  customProps: CustomProperty[] | undefined,
  value: string
): CustomProperty[] {
  const filtered = (customProps || []).filter((p) => p.property !== SOURCE_TOPIC_KEY);
  if (value.trim()) {
    filtered.push({ property: SOURCE_TOPIC_KEY, value: value.trim() });
  }
  return filtered;
}

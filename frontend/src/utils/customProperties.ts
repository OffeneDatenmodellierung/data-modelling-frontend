/**
 * Custom Properties Helpers
 *
 * Centralises access to reserved customProperties keys (e.g., source_topic)
 * stored in the ODCS-compliant Array<{property, value}> format.
 */

import type { CustomProperty } from '@/types/table';

/** Reserved customProperties key for source topic grouping */
export const SOURCE_TOPIC_KEY = 'source_topic';

/** Reserved customProperties key for database catalog */
export const CATALOG_KEY = 'catalog';

/** Reserved customProperties key for database schema */
export const SCHEMA_KEY = 'schema';

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

/**
 * Extract catalog value from a customProperties array.
 */
export function getCatalog(customProps: CustomProperty[] | undefined): string | undefined {
  if (!customProps || !Array.isArray(customProps)) return undefined;
  const prop = customProps.find((p) => p.property === CATALOG_KEY);
  return typeof prop?.value === 'string' && prop.value.trim() ? prop.value : undefined;
}

/**
 * Extract schema value from a customProperties array.
 */
export function getSchema(customProps: CustomProperty[] | undefined): string | undefined {
  if (!customProps || !Array.isArray(customProps)) return undefined;
  const prop = customProps.find((p) => p.property === SCHEMA_KEY);
  return typeof prop?.value === 'string' && prop.value.trim() ? prop.value : undefined;
}

/**
 * Format "catalog.schema" string from customProperties.
 * Returns undefined if neither catalog nor schema is set.
 */
export function getCatalogSchema(customProps: CustomProperty[] | undefined): string | undefined {
  const catalog = getCatalog(customProps);
  const schema = getSchema(customProps);
  if (!catalog && !schema) return undefined;
  if (catalog && schema) return `${catalog}.${schema}`;
  return catalog || schema;
}

/** Reserved customProperties key for resource type */
export const RESOURCE_TYPE_KEY = 'resource_type';

/** Valid resource type values */
export type ResourceType = 'table' | 'view' | 'materialized_view';

const VALID_RESOURCE_TYPES: ResourceType[] = ['table', 'view', 'materialized_view'];

/**
 * Extract resource_type value from a customProperties array.
 * Returns undefined when not set or set to 'table' (default).
 */
export function getResourceType(
  customProps: CustomProperty[] | undefined
): ResourceType | undefined {
  if (!customProps || !Array.isArray(customProps)) return undefined;
  const prop = customProps.find((p) => p.property === RESOURCE_TYPE_KEY);
  if (typeof prop?.value !== 'string') return undefined;
  const val = prop.value.trim() as ResourceType;
  if (!VALID_RESOURCE_TYPES.includes(val)) return undefined;
  return val === 'table' ? undefined : val;
}

import { describe, it, expect } from 'vitest';
import {
  SOURCE_TOPIC_KEY,
  getSourceTopic,
  setSourceTopic,
  CATALOG_KEY,
  SCHEMA_KEY,
  getCatalog,
  getSchema,
  getCatalogSchema,
  RESOURCE_TYPE_KEY,
  getResourceType,
} from '@/utils/customProperties';

describe('customProperties helpers', () => {
  describe('SOURCE_TOPIC_KEY', () => {
    it('should equal "source_topic"', () => {
      expect(SOURCE_TOPIC_KEY).toBe('source_topic');
    });
  });

  describe('getSourceTopic', () => {
    it('returns undefined for undefined input', () => {
      expect(getSourceTopic(undefined)).toBeUndefined();
    });

    it('returns undefined for empty array', () => {
      expect(getSourceTopic([])).toBeUndefined();
    });

    it('returns undefined when source_topic key is absent', () => {
      expect(getSourceTopic([{ property: 'status', value: 'active' }])).toBeUndefined();
    });

    it('returns the value when source_topic key exists', () => {
      expect(
        getSourceTopic([
          { property: 'status', value: 'active' },
          { property: 'source_topic', value: 'order-events' },
        ])
      ).toBe('order-events');
    });

    it('returns undefined when value is not a string', () => {
      expect(getSourceTopic([{ property: 'source_topic', value: 123 }])).toBeUndefined();
    });

    it('returns undefined when value is empty or whitespace', () => {
      expect(getSourceTopic([{ property: 'source_topic', value: '  ' }])).toBeUndefined();
    });
  });

  describe('setSourceTopic', () => {
    it('adds source_topic to an empty array', () => {
      const result = setSourceTopic([], 'my-topic');
      expect(result).toEqual([{ property: 'source_topic', value: 'my-topic' }]);
    });

    it('adds source_topic to undefined input', () => {
      const result = setSourceTopic(undefined, 'my-topic');
      expect(result).toEqual([{ property: 'source_topic', value: 'my-topic' }]);
    });

    it('replaces an existing source_topic', () => {
      const result = setSourceTopic(
        [
          { property: 'status', value: 'active' },
          { property: 'source_topic', value: 'old-topic' },
        ],
        'new-topic'
      );
      expect(result).toEqual([
        { property: 'status', value: 'active' },
        { property: 'source_topic', value: 'new-topic' },
      ]);
    });

    it('preserves other properties', () => {
      const result = setSourceTopic(
        [
          { property: 'status', value: 'active' },
          { property: 'owner', value: 'team-a' },
        ],
        'my-topic'
      );
      expect(result).toHaveLength(3);
      expect(result.find((p) => p.property === 'status')?.value).toBe('active');
      expect(result.find((p) => p.property === 'owner')?.value).toBe('team-a');
      expect(result.find((p) => p.property === 'source_topic')?.value).toBe('my-topic');
    });

    it('removes source_topic when value is empty', () => {
      const result = setSourceTopic(
        [
          { property: 'source_topic', value: 'old-topic' },
          { property: 'status', value: 'active' },
        ],
        ''
      );
      expect(result).toEqual([{ property: 'status', value: 'active' }]);
    });

    it('removes source_topic when value is whitespace', () => {
      const result = setSourceTopic([{ property: 'source_topic', value: 'old-topic' }], '   ');
      expect(result).toEqual([]);
    });

    it('trims whitespace from value', () => {
      const result = setSourceTopic([], '  my-topic  ');
      expect(result).toEqual([{ property: 'source_topic', value: 'my-topic' }]);
    });
  });

  describe('CATALOG_KEY / SCHEMA_KEY', () => {
    it('should equal expected string values', () => {
      expect(CATALOG_KEY).toBe('catalog');
      expect(SCHEMA_KEY).toBe('schema');
    });
  });

  describe('getCatalog', () => {
    it('returns undefined for undefined input', () => {
      expect(getCatalog(undefined)).toBeUndefined();
    });

    it('returns undefined for empty array', () => {
      expect(getCatalog([])).toBeUndefined();
    });

    it('returns undefined when catalog key is absent', () => {
      expect(getCatalog([{ property: 'status', value: 'active' }])).toBeUndefined();
    });

    it('returns the value when catalog key exists', () => {
      expect(getCatalog([{ property: 'catalog', value: 'raw' }])).toBe('raw');
    });

    it('returns undefined when value is not a string', () => {
      expect(getCatalog([{ property: 'catalog', value: 42 }])).toBeUndefined();
    });

    it('returns undefined when value is empty or whitespace', () => {
      expect(getCatalog([{ property: 'catalog', value: '  ' }])).toBeUndefined();
    });
  });

  describe('getSchema', () => {
    it('returns undefined for undefined input', () => {
      expect(getSchema(undefined)).toBeUndefined();
    });

    it('returns undefined for empty array', () => {
      expect(getSchema([])).toBeUndefined();
    });

    it('returns the value when schema key exists', () => {
      expect(getSchema([{ property: 'schema', value: 'sales' }])).toBe('sales');
    });

    it('returns undefined when value is not a string', () => {
      expect(getSchema([{ property: 'schema', value: true }])).toBeUndefined();
    });

    it('returns undefined when value is empty or whitespace', () => {
      expect(getSchema([{ property: 'schema', value: '' }])).toBeUndefined();
    });
  });

  describe('getCatalogSchema', () => {
    it('returns undefined when neither catalog nor schema is set', () => {
      expect(getCatalogSchema(undefined)).toBeUndefined();
      expect(getCatalogSchema([])).toBeUndefined();
      expect(getCatalogSchema([{ property: 'status', value: 'active' }])).toBeUndefined();
    });

    it('returns "catalog.schema" when both are set', () => {
      expect(
        getCatalogSchema([
          { property: 'catalog', value: 'raw' },
          { property: 'schema', value: 'sales' },
        ])
      ).toBe('raw.sales');
    });

    it('returns catalog only when schema is not set', () => {
      expect(getCatalogSchema([{ property: 'catalog', value: 'raw' }])).toBe('raw');
    });

    it('returns schema only when catalog is not set', () => {
      expect(getCatalogSchema([{ property: 'schema', value: 'sales' }])).toBe('sales');
    });

    it('ignores empty/whitespace values', () => {
      expect(
        getCatalogSchema([
          { property: 'catalog', value: '  ' },
          { property: 'schema', value: 'sales' },
        ])
      ).toBe('sales');
    });
  });

  describe('RESOURCE_TYPE_KEY', () => {
    it('should equal "resource_type"', () => {
      expect(RESOURCE_TYPE_KEY).toBe('resource_type');
    });
  });

  describe('getResourceType', () => {
    it('returns undefined for undefined input', () => {
      expect(getResourceType(undefined)).toBeUndefined();
    });

    it('returns undefined for empty array', () => {
      expect(getResourceType([])).toBeUndefined();
    });

    it('returns undefined when key is absent (default = table)', () => {
      expect(getResourceType([{ property: 'status', value: 'active' }])).toBeUndefined();
    });

    it('returns undefined when value is "table" (default)', () => {
      expect(getResourceType([{ property: 'resource_type', value: 'table' }])).toBeUndefined();
    });

    it('returns "view" when set', () => {
      expect(getResourceType([{ property: 'resource_type', value: 'view' }])).toBe('view');
    });

    it('returns "materialized_view" when set', () => {
      expect(getResourceType([{ property: 'resource_type', value: 'materialized_view' }])).toBe(
        'materialized_view'
      );
    });

    it('returns undefined for invalid values', () => {
      expect(getResourceType([{ property: 'resource_type', value: 'invalid' }])).toBeUndefined();
      expect(getResourceType([{ property: 'resource_type', value: 42 }])).toBeUndefined();
      expect(getResourceType([{ property: 'resource_type', value: '' }])).toBeUndefined();
    });
  });
});

import { describe, it, expect } from 'vitest';
import { SOURCE_TOPIC_KEY, getSourceTopic, setSourceTopic } from '@/utils/customProperties';

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
});

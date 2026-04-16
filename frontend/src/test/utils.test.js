import { describe, it, expect } from 'vitest';
import { parseIgsn, baseIgsn } from '../utils';

describe('parseIgsn', () => {
  it('splits base and suffix', () => {
    expect(parseIgsn('JHAMAL00016-006')).toEqual({ base: 'JHAMAL00016', suffix: '-006' });
  });

  it('handles no suffix', () => {
    expect(parseIgsn('JHXMAL00005')).toEqual({ base: 'JHXMAL00005', suffix: null });
  });

  it('handles empty string', () => {
    expect(parseIgsn('')).toEqual({ base: '', suffix: null });
  });

  it('handles null/undefined', () => {
    expect(parseIgsn(null)).toEqual({ base: '', suffix: null });
    expect(parseIgsn(undefined)).toEqual({ base: '', suffix: null });
  });
});

describe('baseIgsn', () => {
  it('returns just the prefix', () => {
    expect(baseIgsn('JHAMAL00016-006')).toBe('JHAMAL00016');
  });
});

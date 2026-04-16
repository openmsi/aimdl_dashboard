import { describe, it, expect } from 'vitest';
import { groupIntoPairs } from '../StreamView';

function makeViz(id, { pairKey = null, pairRole = null, instrument = "HELIX" } = {}) {
  return {
    id,
    instrument,
    pairKey,
    pairRole,
    sample: "TEST001",
    vizType: "test.png",
    vizColor: "#fff",
    timestamp: new Date().toISOString(),
    imageUrl: null,
    status: "complete",
  };
}

describe('groupIntoPairs', () => {
  it('groups scan/xrd pairs by pairKey', () => {
    const items = [
      makeViz('a1', { pairKey: 'A', pairRole: 'scan', instrument: 'MAXIMA' }),
      makeViz('a2', { pairKey: 'A', pairRole: 'xrd', instrument: 'MAXIMA' }),
      makeViz('b1', { pairKey: 'B', pairRole: 'scan', instrument: 'MAXIMA' }),
      makeViz('b2', { pairKey: 'B', pairRole: 'xrd', instrument: 'MAXIMA' }),
    ];
    const groups = groupIntoPairs(items);
    expect(groups).toHaveLength(2);
    expect(groups[0].type).toBe('pair');
    expect(groups[0].items[0].pairRole).toBe('scan');
    expect(groups[0].items[1].pairRole).toBe('xrd');
    expect(groups[1].type).toBe('pair');
    expect(groups[1].items[0].pairRole).toBe('scan');
    expect(groups[1].items[1].pairRole).toBe('xrd');
  });

  it('pairs work when partners are not adjacent', () => {
    const items = [
      makeViz('scan1', { pairKey: 'A', pairRole: 'scan', instrument: 'MAXIMA' }),
      makeViz('h1'),
      makeViz('h2'),
      makeViz('xrd1', { pairKey: 'A', pairRole: 'xrd', instrument: 'MAXIMA' }),
    ];
    const groups = groupIntoPairs(items);
    expect(groups).toHaveLength(3);
    expect(groups[0].type).toBe('pair');
    expect(groups[0].items[0].id).toBe('scan1');
    expect(groups[0].items[1].id).toBe('xrd1');
    expect(groups[1].type).toBe('single');
    expect(groups[1].items[0].id).toBe('h1');
    expect(groups[2].type).toBe('single');
    expect(groups[2].items[0].id).toBe('h2');
  });

  it('orphan pairKey renders as single', () => {
    const items = [
      makeViz('orphan', { pairKey: 'X', pairRole: 'scan', instrument: 'MAXIMA' }),
    ];
    const groups = groupIntoPairs(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe('single');
    expect(groups[0].items[0].id).toBe('orphan');
  });

  it('items without pairKey render as singles', () => {
    const items = [makeViz('h1'), makeViz('h2'), makeViz('h3')];
    const groups = groupIntoPairs(items);
    expect(groups).toHaveLength(3);
    groups.forEach((g) => expect(g.type).toBe('single'));
  });

  it('mixed instruments: HELIX singles and MAXIMA pairs', () => {
    const items = [
      makeViz('h1'),
      makeViz('h2'),
      makeViz('scan1', { pairKey: 'A', pairRole: 'scan', instrument: 'MAXIMA' }),
      makeViz('h3'),
      makeViz('xrd1', { pairKey: 'A', pairRole: 'xrd', instrument: 'MAXIMA' }),
    ];
    const groups = groupIntoPairs(items);
    const pairs = groups.filter((g) => g.type === 'pair');
    const singles = groups.filter((g) => g.type === 'single');
    expect(singles).toHaveLength(3);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].items[0].pairRole).toBe('scan');
    expect(pairs[0].items[0].id).toBe('scan1');
    expect(pairs[0].items[1].pairRole).toBe('xrd');
    expect(pairs[0].items[1].id).toBe('xrd1');
  });
});

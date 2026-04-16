import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import SampleComparisonView from '../SampleComparisonView';

function makeViz(id, { igsn = 'JHAMAL00016-005', instrument = 'HELIX' } = {}) {
  return {
    id,
    instrument,
    sample: igsn,
    igsn,
    vizType: `${id}.png`,
    vizColor: '#fff',
    timestamp: new Date().toISOString(),
    imageUrl: null,
    status: 'complete',
    pairKey: null,
    pairRole: null,
    position: null,
    folderPath: `${instrument} / ${igsn}`,
    fileId: `file_${id}`,
    metadata: {},
  };
}

describe('SampleComparisonView', () => {
  it('renders batch buttons from data', () => {
    const data = [
      makeViz('v1', { igsn: 'JHAMAL00016-005' }),
      makeViz('v2', { igsn: 'JHAMAL00016-006' }),
      makeViz('v3', { igsn: 'JHXMAL00005' }),
    ];
    render(<SampleComparisonView data={data} />);
    expect(screen.getByText('JHAMAL00016')).toBeInTheDocument();
    expect(screen.getByText('JHXMAL00005')).toBeInTheDocument();
  });

  it('renders sub-sample pills when batch is selected', () => {
    const data = [
      makeViz('v1', { igsn: 'JHAMAL00016-005' }),
      makeViz('v2', { igsn: 'JHAMAL00016-006' }),
      makeViz('v3', { igsn: 'JHAMAL00016-007' }),
    ];
    render(<SampleComparisonView data={data} />);
    expect(screen.getByText('ALL')).toBeInTheDocument();
    expect(screen.getByText('-005')).toBeInTheDocument();
    expect(screen.getByText('-006')).toBeInTheDocument();
    expect(screen.getByText('-007')).toBeInTheDocument();
  });

  it('ALL mode shows items from all sub-samples', () => {
    const data = [
      makeViz('v1', { igsn: 'JHAMAL00016-005' }),
      makeViz('v2', { igsn: 'JHAMAL00016-005' }),
      makeViz('v3', { igsn: 'JHAMAL00016-006' }),
      makeViz('v4', { igsn: 'JHAMAL00016-006' }),
    ];
    render(<SampleComparisonView data={data} />);
    expect(screen.getAllByText('v1.png').length).toBeGreaterThan(0);
    expect(screen.getAllByText('v2.png').length).toBeGreaterThan(0);
    expect(screen.getAllByText('v3.png').length).toBeGreaterThan(0);
    expect(screen.getAllByText('v4.png').length).toBeGreaterThan(0);
  });

  it('selecting a suffix filters to that sub-sample', async () => {
    const user = userEvent.setup();
    const data = [
      makeViz('v1', { igsn: 'JHAMAL00016-005' }),
      makeViz('v2', { igsn: 'JHAMAL00016-006' }),
    ];
    render(<SampleComparisonView data={data} />);
    await user.click(screen.getByText('-005'));
    expect(screen.getAllByText('v1.png').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('v2.png')).toHaveLength(0);
  });

  it('sort toggle switches between suffix and time order', async () => {
    const user = userEvent.setup();
    const data = [
      makeViz('v1', { igsn: 'JHAMAL00016-005' }),
      makeViz('v2', { igsn: 'JHAMAL00016-006' }),
    ];
    render(<SampleComparisonView data={data} />);
    const byTimeBtn = screen.getByText('by time');
    await user.click(byTimeBtn);
    expect(byTimeBtn).toHaveStyle({ background: '#1e274080' });
  });
});

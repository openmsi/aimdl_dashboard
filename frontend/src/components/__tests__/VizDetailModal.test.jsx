import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import VizDetailModal from '../VizDetailModal';

const baseViz = {
  id: 'abc123',
  instrument: 'MAXIMA',
  sample: 'JHXMAL00005',
  igsn: 'JHXMAL00005',
  vizType: 'XRD Pattern',
  vizColor: '#4ECDC4',
  timestamp: new Date('2026-03-23T15:59:06Z').toISOString(),
  imageUrl: 'http://localhost:8000/api/visualizations/abc123/image',
  status: 'complete',
  folderPath: 'AIMD-L/MAXIMA/automatic_mode/foo',
};

describe('VizDetailModal', () => {
  it('renders image, metadata grid, and action buttons', () => {
    render(<VizDetailModal viz={baseViz} onClose={() => {}} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', baseViz.imageUrl);
    expect(screen.getByText('XRD Pattern')).toBeInTheDocument();
    expect(screen.getByText('Instrument')).toBeInTheDocument();
    expect(screen.getByText('IGSN')).toBeInTheDocument();
    expect(screen.getByText('Item ID')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('"Open in Data Portal" has correct href', () => {
    render(<VizDetailModal viz={baseViz} onClose={() => {}} />);
    const link = screen.getByRole('link', { name: /open in data portal/i });
    expect(link).toHaveAttribute('href', 'https://data.htmdec.org/#item/abc123');
  });

  it('"View Sample" has correct href for IGSN', () => {
    render(<VizDetailModal viz={baseViz} onClose={() => {}} />);
    const link = screen.getByRole('link', { name: /view sample/i });
    expect(link).toHaveAttribute('href', 'https://data.htmdec.org/#igsn/JHXMAL00005');
  });

  it('close button calls onClose', async () => {
    const onClose = vi.fn();
    render(<VizDetailModal viz={baseViz} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking backdrop calls onClose', async () => {
    const onClose = vi.fn();
    const { container } = render(<VizDetailModal viz={baseViz} onClose={onClose} />);
    await userEvent.click(container.firstChild);
    expect(onClose).toHaveBeenCalled();
  });

  it('all instruments show Data Portal button', () => {
    for (const inst of ['MAXIMA', 'HELIX', 'SPHINX']) {
      const { unmount } = render(
        <VizDetailModal viz={{ ...baseViz, instrument: inst }} onClose={() => {}} />,
      );
      expect(screen.getByRole('link', { name: /open in data portal/i })).toBeInTheDocument();
      unmount();
    }
  });
});

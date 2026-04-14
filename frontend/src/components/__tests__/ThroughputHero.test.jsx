import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ThroughputHero from '../ThroughputHero';

describe('ThroughputHero', () => {
  let esInstance;

  beforeEach(() => {
    global.fetch.mockReset();
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        total_files: 42,
        by_instrument: {
          MAXIMA: { files: 20 },
          HELIX: { files: 22 },
          SPHINX: { files: 0 },
        },
      }),
    });
    esInstance = { onmessage: null, onerror: null, close: vi.fn() };
    global.EventSource = vi.fn(() => esInstance);
  });

  it('starts collapsed with "Show live counters"', () => {
    render(<ThroughputHero />);
    expect(screen.getByText(/show live counters/i)).toBeInTheDocument();
  });

  it('clicking collapsed bar expands it', async () => {
    render(<ThroughputHero />);
    await userEvent.click(screen.getByText(/show live counters/i));
    expect(screen.getByText(/samples analyzed/i)).toBeInTheDocument();
  });

  it('expanded state shows three counter columns', async () => {
    render(<ThroughputHero />);
    await userEvent.click(screen.getByText(/show live counters/i));
    expect(screen.getByText(/samples analyzed/i)).toBeInTheDocument();
    expect(screen.getByText(/measurements completed/i)).toBeInTheDocument();
    expect(screen.getByText(/data captured/i)).toBeInTheDocument();
  });

  it('falls back to girder counts when stream counter unavailable', async () => {
    render(<ThroughputHero />);
    await userEvent.click(screen.getByText(/show live counters/i));
    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument());
  });

  it('displays "coming online" for SPHINX when files=0', async () => {
    render(<ThroughputHero />);
    await userEvent.click(screen.getByText(/show live counters/i));
    await waitFor(() => expect(screen.getAllByText(/coming online/i).length).toBeGreaterThan(0));
  });
});

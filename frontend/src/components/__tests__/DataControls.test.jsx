import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DataControls from '../DataControls';

function mockCounts(data) {
  global.fetch.mockImplementation((url) => {
    const u = String(url);
    if (u.includes('/aimdl/count')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
      });
    }
    if (u.includes('/refresh')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    return Promise.resolve({ ok: false });
  });
}

describe('DataControls', () => {
  beforeEach(() => {
    global.fetch.mockReset();
  });

  it('renders refresh button, per-instrument dropdown, and last updated', () => {
    mockCounts({ total_files: 0, by_instrument: {} });
    render(
      <DataControls limit={60} setLimit={() => { }} lastUpdate={new Date().toISOString()} onRefresh={() => { }} />,
    );
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    expect(screen.getByText(/per instrument/i)).toBeInTheDocument();
    const combos = screen.getAllByRole('combobox');
    expect(combos.length).toBe(2);
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
  });

  it('clicking refresh button calls the refresh callback', async () => {
    mockCounts({ total_files: 0, by_instrument: {} });
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<DataControls limit={60} setLimit={() => { }} lastUpdate={null} onRefresh={onRefresh} />);

    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });

  it('changing per-instrument dropdown updates limit via setLimit', async () => {
    mockCounts({ total_files: 0, by_instrument: {} });
    const setLimit = vi.fn();
    render(<DataControls limit={30} setLimit={setLimit} lastUpdate={null} onRefresh={() => { }} />);
    const perInstrumentSelect = screen.getByDisplayValue('30');
    await userEvent.selectOptions(perInstrumentSelect, '60');
    expect(setLimit).toHaveBeenCalledWith(60);
  });

  it('fetch depth dropdown renders and defaults to 100', () => {
    mockCounts({ total_files: 0, by_instrument: {} });
    render(<DataControls limit={30} setLimit={() => { }} lastUpdate={null} onRefresh={() => { }} />);
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
  });

  it('fetch depth dropdown updates the UI value before refresh', async () => {
    mockCounts({ total_files: 0, by_instrument: {} });
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<DataControls limit={30} setLimit={() => { }} lastUpdate={null} onRefresh={onRefresh} />);
    const fetchSelect = screen.getByDisplayValue('100');
    await userEvent.selectOptions(fetchSelect, '500');
    expect(screen.getByDisplayValue('500')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });

  it('displays instrument counts from the Girder count endpoint', async () => {
    mockCounts({
      total_files: 1234,
      by_instrument: {
        MAXIMA: { files: 500 },
        HELIX: { files: 700 },
        SPHINX: { files: 34 },
      },
    });
    render(<DataControls limit={60} setLimit={() => { }} lastUpdate={null} onRefresh={() => { }} />);
    await waitFor(() => expect(screen.getByText('1,234')).toBeInTheDocument());
    // "500" also appears as a select option; look at instrument count spans by sibling label
    expect(screen.getByText('MAXIMA').parentElement).toHaveTextContent('500');
    expect(screen.getByText('HELIX').parentElement).toHaveTextContent('700');
    expect(screen.getByText('SPHINX').parentElement).toHaveTextContent('34');
  });

  it('handles /api/counts failure gracefully', async () => {
    global.fetch.mockRejectedValue(new Error('network'));
    render(<DataControls limit={60} setLimit={() => { }} lastUpdate={null} onRefresh={() => { }} />);
    // Should still render the refresh button
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it("keyboard shortcut 'r' triggers refresh", async () => {
    mockCounts({ total_files: 0, by_instrument: {} });
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<DataControls limit={60} setLimit={() => { }} lastUpdate={null} onRefresh={onRefresh} />);
    fireEvent.keyDown(window, { key: 'r' });
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });
});

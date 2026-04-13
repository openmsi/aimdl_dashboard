import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DataControls from '../DataControls';

function mockCounts(data) {
  global.fetch.mockImplementation((url, opts) => {
    const u = String(url);
    if (u.includes('/counts')) {
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

  it('renders refresh button, limit dropdown, and last updated', () => {
    mockCounts({ total_files: 0, by_instrument: {} });
    render(
      <DataControls limit={60} setLimit={() => {}} lastUpdate={new Date().toISOString()} onRefresh={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('60');
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
  });

  it('clicking refresh button calls POST /api/refresh and refetch callback', async () => {
    mockCounts({ total_files: 0, by_instrument: {} });
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<DataControls limit={60} setLimit={() => {}} lastUpdate={null} onRefresh={onRefresh} />);

    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => {
      const calls = global.fetch.mock.calls.map((c) => String(c[0]));
      expect(calls.some((u) => u.includes('/refresh'))).toBe(true);
    });
    expect(onRefresh).toHaveBeenCalled();
  });

  it('changing dropdown updates limit via setLimit', async () => {
    mockCounts({ total_files: 0, by_instrument: {} });
    const setLimit = vi.fn();
    render(<DataControls limit={60} setLimit={setLimit} lastUpdate={null} onRefresh={() => {}} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), '120');
    expect(setLimit).toHaveBeenCalledWith(120);
  });

  it('displays instrument counts from /api/counts', async () => {
    mockCounts({
      total_files: 1234,
      by_instrument: {
        MAXIMA: { files: 500 },
        HELIX: { files: 700 },
        SPHINX: { files: 34 },
      },
    });
    render(<DataControls limit={60} setLimit={() => {}} lastUpdate={null} onRefresh={() => {}} />);
    await waitFor(() => expect(screen.getByText('1,234')).toBeInTheDocument());
    // "500" also appears as a select option; look at instrument count spans by sibling label
    expect(screen.getByText('MAXIMA').parentElement).toHaveTextContent('500');
    expect(screen.getByText('HELIX').parentElement).toHaveTextContent('700');
    expect(screen.getByText('SPHINX').parentElement).toHaveTextContent('34');
  });

  it('handles /api/counts failure gracefully', async () => {
    global.fetch.mockRejectedValue(new Error('network'));
    render(<DataControls limit={60} setLimit={() => {}} lastUpdate={null} onRefresh={() => {}} />);
    // Should still render the refresh button
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it("keyboard shortcut 'r' triggers refresh", async () => {
    mockCounts({ total_files: 0, by_instrument: {} });
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<DataControls limit={60} setLimit={() => {}} lastUpdate={null} onRefresh={onRefresh} />);
    fireEvent.keyDown(window, { key: 'r' });
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });
});

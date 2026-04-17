import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useVizStream from '../useVizStream';

const apiItem = {
  id: 'v1',
  instrument: 'MAXIMA',
  igsn: 'JHXMAL00005',
  name: 'XRD Pattern',
  created: '2026-03-23T15:59:06Z',
  folder_path: 'AIMD-L/MAXIMA/automatic_mode/foo',
  metadata: {},
};

function setSearch(search) {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, search },
  });
}

describe('useVizStream', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch.mockReset();
    setSearch('');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty data initially, populated after fetch', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [apiItem] }),
    });
    const { result } = renderHook(() => useVizStream({ perInstrument: 10 }));
    expect(result.current.data).toEqual([]);
    await vi.waitFor(() => expect(result.current.data.length).toBe(1));
    expect(result.current.data[0].id).toBe('v1');
    expect(result.current.useMock).toBe(false);
  });

  it('respects perInstrument parameter in fetch URL', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });
    renderHook(() => useVizStream({ perInstrument: 250 }));
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const url = String(global.fetch.mock.calls[0][0]);
    expect(url).toContain('per_instrument=250');
  });

  it('defaults to per_instrument=30', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });
    renderHook(() => useVizStream());
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const url = String(global.fetch.mock.calls[0][0]);
    expect(url).toContain('per_instrument=30');
  });

  it('falls back to mock data when API returns error', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500 });
    const { result } = renderHook(() => useVizStream({ perInstrument: 10 }));
    await vi.waitFor(() => expect(result.current.useMock).toBe(true));
    expect(result.current.data.length).toBeGreaterThan(0);
  });

  it('mock mode activated by ?mock=true', async () => {
    setSearch('?mock=true');
    const { result } = renderHook(() => useVizStream({ perInstrument: 10 }));
    await vi.waitFor(() => expect(result.current.useMock).toBe(true));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('polling interval triggers repeated fetches', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [apiItem] }),
    });
    renderHook(() => useVizStream({ perInstrument: 10, pollIntervalMs: 5000 }));
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    await vi.waitFor(() => expect(global.fetch.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('refetch function triggers new API call', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [apiItem] }),
    });
    const { result } = renderHook(() => useVizStream({ perInstrument: 10 }));
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.refetch();
    });
    expect(global.fetch.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

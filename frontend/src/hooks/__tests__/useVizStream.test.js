import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useVizStream from '../useVizStream';

const apiItem = {
  _id: 'v1',
  instrument: 'MAXIMA',
  igsn: 'JHXMAL00005',
  name: 'XRD Pattern.png',
  created: '2026-03-23T15:59:06Z',
  folder_path: 'AIMD-L/MAXIMA/automatic_mode/foo',
  metadata: { data_type: 'xrd_derived', igsn: 'JHXMAL00005' },
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
    global.fetch.mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([apiItem]),
    }));
    const { result } = renderHook(() => useVizStream({ perInstrument: 10 }));
    expect(result.current.data).toEqual([]);
    await vi.waitFor(() => expect(result.current.data.length).toBeGreaterThan(0));
    expect(result.current.data.some((item) => item.id === 'v1')).toBe(true);
    expect(result.current.useMock).toBe(false);
  });

  it('respects perInstrument parameter in fetch URL', async () => {
    global.fetch.mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    }));
    renderHook(() => useVizStream({ perInstrument: 250 }));
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const urls = global.fetch.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes('limit=250'))).toBe(true);
  });

  it('defaults to per_instrument=30', async () => {
    global.fetch.mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    }));
    renderHook(() => useVizStream());
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const urls = global.fetch.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes('limit=30'))).toBe(true);
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
    global.fetch.mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([apiItem]),
    }));
    renderHook(() => useVizStream({ perInstrument: 10, pollIntervalMs: 5000 }));
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    await vi.waitFor(() => expect(global.fetch.mock.calls.length).toBeGreaterThanOrEqual(6));
  });

  it('refetch function triggers new API call', async () => {
    global.fetch.mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([apiItem]),
    }));
    const { result } = renderHook(() => useVizStream({ perInstrument: 10 }));
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    await act(async () => {
      await result.current.refetch();
    });
    expect(global.fetch.mock.calls.length).toBeGreaterThanOrEqual(6);
  });
});

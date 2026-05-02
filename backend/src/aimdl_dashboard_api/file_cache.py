"""Image file cache backed by the ``diskcache`` package."""

from __future__ import annotations

import diskcache


def make_image_cache(cache_dir: str, max_bytes: int) -> diskcache.Cache:
    """Return a size-limited LRU disk cache for image bytes.

    Parameters
    ----------
    cache_dir:
        Directory used to store cached files.  Created if it does not exist.
    max_bytes:
        Maximum total disk space in bytes.  Least-recently-used entries are
        evicted automatically when this limit would be exceeded.
    """
    return diskcache.Cache(
        directory=cache_dir,
        size_limit=max_bytes,
        eviction_policy="least-recently-used",
    )

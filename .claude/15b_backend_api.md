# Step B: Backend — API endpoints for per-instrument balance

**Branch:** `feat/per-instrument-balance` (continue from Step A)

## Context

Step A added the `per_instrument` parameter to `get_cached_visualizations`
in `discovery.py` and created test fixtures + unit tests. This step wires
that logic into the FastAPI endpoints in `app.py` and adds HTTP-level tests.

No frontend or README changes in this step.

## Read these files first

- `backend/src/aimdl_dashboard_api/app.py`
- `backend/src/aimdl_dashboard_api/discovery.py` (to see the function you're calling)
- `backend/src/aimdl_dashboard_api/config.py` (for DEFAULT_PER_INSTRUMENT)
- `backend/src/aimdl_dashboard_api/models.py`
- `backend/tests/conftest.py` (for the `app_client` fixture)
- `backend/tests/test_discovery.py` (to confirm Step A tests pass)

## Task 1: Add `per_instrument` query param to GET /api/visualizations

In `app.py`, update the `list_visualizations` endpoint signature to accept
a new optional query parameter:

```python
per_instrument: Optional[int] = Query(None, le=500)
```

Pass it through to `get_cached_visualizations`. When `per_instrument` is
set, it takes precedence over `limit` — pass `per_instrument` and do not
pass `limit`. When `per_instrument` is None, pass `limit` as before.

Do not change the response model (`VisualizationList`) — the shape of the
response is the same either way.

## Task 2: Accept JSON body on POST /api/refresh

The current `manual_refresh` endpoint takes no arguments and calls
`refresh_cache()` with defaults. Change it to accept an optional JSON
body with `per_instrument_limit`.

Create a Pydantic model in `app.py` (or in `models.py` if you prefer):

```python
class RefreshRequest(BaseModel):
    per_instrument_limit: Optional[int] = None
```

Update the endpoint:

```python
@app.post("/api/refresh")
def manual_refresh(body: Optional[RefreshRequest] = None):
    pil = body.per_instrument_limit if body else None
    try:
        refresh_cache(per_instrument_limit=pil)
    except Exception as e:
        logger.exception("Manual refresh failed")
        raise HTTPException(500, f"Refresh failed: {e}")
    return {"status": "ok", "total": len(get_cached_visualizations(limit=10000))}
```

**Critical:** The endpoint must still work when called with no body
(e.g., `POST /api/refresh` with empty body or no Content-Type header).
The `Optional[RefreshRequest] = None` default handles this.

## Task 3: Create `backend/tests/test_app.py`

Write HTTP-level tests using the `app_client` fixture from `conftest.py`.
The `app_client` fixture creates a `fastapi.testclient.TestClient` and
patches the Girder mock, so no real network calls are made.

Import pattern:
```python
def test_something(app_client):
    resp = app_client.get("/api/visualizations?per_instrument=2")
    assert resp.status_code == 200
    data = resp.json()
    ...
```

Test cases:

1. **`test_visualizations_per_instrument_param`** — `GET
   /api/visualizations?per_instrument=2`. Assert 200. Assert response
   contains items from both HELIX and MAXIMA, each capped at 2.

2. **`test_visualizations_legacy_limit_param`** — `GET
   /api/visualizations?limit=3`. Assert 200. Assert response has exactly
   3 items total (backward compatible global limit).

3. **`test_visualizations_per_instrument_overrides_limit`** — `GET
   /api/visualizations?per_instrument=2&limit=1`. Assert that
   `per_instrument` wins: result has items from both instruments (not
   just 1 item total).

4. **`test_refresh_with_body`** — `POST /api/refresh` with JSON body
   `{"per_instrument_limit": 50}`. Assert 200. Assert response has
   `"status": "ok"`.

5. **`test_refresh_without_body`** — `POST /api/refresh` with no body.
   Assert 200. This confirms backward compatibility.

6. **`test_refresh_with_empty_body`** — `POST /api/refresh` with body
   `{}`. Assert 200.

7. **`test_health_endpoint`** — `GET /api/health`. Assert 200 and
   `"girder_connected": true`. (A simple sanity check that the test
   harness works.)

## Verification

```bash
cd backend
python -c "import ast; ast.parse(open('src/aimdl_dashboard_api/app.py').read()); print('Parse OK')"
python -m pytest tests/test_app.py -v
python -m pytest tests/ -v
```

All tests must pass, including Step A's `test_discovery.py` and the
existing `test_girder_client.py`.

## Constraints

- Python 3.9 compatible — use `Optional[int]` not `int | None`
- Do NOT modify `discovery.py` — it was completed in Step A
- Do NOT modify frontend files or READMEs
- Do NOT change the `VisualizationList` response model shape
- The existing `/api/visualizations/sample/{igsn}` endpoint must remain
  unchanged — it uses its own query logic
- Commit message: `"feat(api): add per_instrument query param and refresh body"`

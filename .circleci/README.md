# CircleCI Pipeline

Continuous integration for the AIMD-L Dashboard. Runs on every push and
pull request.

## What the pipeline does

The `test-and-build` workflow runs five jobs:

| Job              | Purpose                                                    |
|------------------|------------------------------------------------------------|
| `lint-backend`   | `ruff check` + `ruff format --check` on `backend/src` and `backend/tests` |
| `test-backend`   | `pytest` against the FastAPI backend (Girder client fully mocked)         |
| `lint-frontend`  | `eslint .` on the Vite/React frontend                                      |
| `test-frontend`  | `vitest run` — component and hook tests with jsdom + mocked fetch         |
| `build-frontend` | `vite build`, persisted as a workspace artifact                            |

Backend and frontend jobs run in parallel. Test jobs depend on their
corresponding lint jobs; `build-frontend` depends on `test-frontend`.

Executors:
- Backend: `circleci/python@2.1` with Python **3.9** (matches
  `pyproject.toml` `requires-python`)
- Frontend: `circleci/node@6.1` with Node **20 LTS**

## Setting up CircleCI for this repo

1. Sign in to <https://app.circleci.com/> with the GitHub account that
   has access to `htmdec/aimdl_dashboard`.
2. Go to **Projects**, find `aimdl_dashboard`, and click **Set Up Project**.
3. When prompted, choose **Fastest: use the existing config** — CircleCI
   will pick up `.circleci/config.yml` from the default branch.
4. No additional configuration is needed for the test workflow. All
   tests mock external services (Girder, `fetch`, `EventSource`).

## Required environment variables

None for the current test workflow. The backend tests never hit the
real Girder API, and the frontend tests never make real network calls.

Reserved for future publish/deploy jobs (not yet wired up):

| Variable        | Used by                | Purpose                                       |
|-----------------|------------------------|-----------------------------------------------|
| `AIMDL_API_KEY` | future deploy job      | Girder API key for `data.htmdec.org`          |
| `GIRDER_API_URL`| future deploy job      | Override Girder base URL (default production) |

When these are needed, add them as CircleCI project environment
variables (not in `config.yml`).

## Running the same checks locally

```bash
# Backend
cd backend && pip install -e ".[dev]"
ruff check src/ tests/
ruff format --check src/ tests/
python -m pytest tests/ -v

# Frontend
cd frontend && npm install
npm run lint
npm test
npm run build
```

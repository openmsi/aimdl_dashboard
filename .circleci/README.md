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

None for the `test-and-build` workflow. The backend tests never hit the
real Girder API, and the frontend tests never make real network calls.

### Release workflow secrets (contexts)

The `release` workflow runs only on tags matching `/^v.*/` and requires
two CircleCI **contexts** (shared across htmdec repos — not project-level
env vars). Create them under **Organization Settings → Contexts**.

**Context: `pypi-publish`**

| Variable         | Purpose                                                   |
|------------------|-----------------------------------------------------------|
| `PYPI_API_TOKEN` | API token from <https://pypi.org/manage/account/> (scope: project `aimdl-dashboard-api`) |

**Context: `dockerhub-publish`**

| Variable            | Purpose                                            |
|---------------------|----------------------------------------------------|
| `DOCKERHUB_USERNAME`| Docker Hub username (e.g. `htmdec`)                |
| `DOCKERHUB_TOKEN`   | Docker Hub access token with push rights to `htmdec/aimdl-dashboard` |

## Release workflow

`release` runs in parallel to `test-and-build` when a Git tag matching
`v*` is pushed. It re-runs lint + tests, then publishes:

| Job             | Publishes                                                  |
|-----------------|------------------------------------------------------------|
| `publish-pypi`  | `aimdl-dashboard-api` sdist + wheel to PyPI                |
| `publish-docker`| `htmdec/aimdl-dashboard:<version>` and `:latest` to Docker Hub |

The Docker tag strips the leading `v` from `CIRCLE_TAG`, so tag
`v0.1.0` publishes `htmdec/aimdl-dashboard:0.1.0`. PyPI and Docker
publish are independent — one failing does not block the other.

### Setup checklist

1. Connect `htmdec/aimdl_dashboard` to CircleCI
2. Create the `pypi-publish` and `dockerhub-publish` contexts above
3. Create the Docker Hub repo `htmdec/aimdl-dashboard`
4. Register `aimdl-dashboard-api` on PyPI (or enable trusted publishers)
5. Push a test tag `v0.1.0-rc1` to verify the pipeline end-to-end

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

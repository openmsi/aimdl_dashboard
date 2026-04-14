FROM --platform=linux/amd64 node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.10-slim AS runtime
WORKDIR /app

COPY backend/pyproject.toml backend/README.md ./backend/
COPY backend/src/ ./backend/src/
RUN pip install --no-cache-dir ./backend

COPY --from=frontend-build /app/frontend/dist ./static

EXPOSE 8000

CMD ["uvicorn", "aimdl_dashboard_api.app:app", "--host", "0.0.0.0", "--port", "8000"]

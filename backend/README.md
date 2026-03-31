# AIMD-L Dashboard Backend

Phase 2 — FastAPI service for proxying Girder API queries and (Phase 3)
serving SSE streams of new visualizations.

Not yet implemented. The frontend currently runs standalone with mock data.

## Planned Stack

- FastAPI + uvicorn
- girder-client or httpx for Girder REST API
- SSE via StreamingResponse
- Optional: Kafka consumer via confluent-kafka-python (Phase 3)

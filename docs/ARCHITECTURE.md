# System Architecture

## Request Flow
UI (public/*) → API (routes/*, server.js) → Services (store/pdf/signature) → Responses (JSON/PDF) → Metrics (/admin/metrics)

## Endpoints (discovered)
- DELETE /notes/:uuid  —  routes/notes-api.js
- GET /admin/metrics  —  server.js
- GET /api/models  —  server.js
- GET /api/specialties  —  server.js
- GET /health  —  server.js
- GET /notes  —  routes/notes-api.js
- GET /notes/:uuid  —  routes/notes-api.js
- GET /notes/:uuid/pdf  —  routes/export-pdf.js
- GET /specialties.js  —  server.js
- POST /api/birp  —  server.js
- POST /api/generate-soap-json-annotated  —  server.js
- POST /api/generate_soap  —  server.js
- POST /api/soap  —  server.js
- POST /export/pdf  —  routes/export-pdf.js
- POST /generate-soap  —  routes/soap.js
- POST /notes/:uuid/finalize  —  routes/notes-api.js
- POST /notes/generate  —  routes/generate-api.js
- PUT /notes/:uuid  —  routes/notes-api.js

## Modules
- Routes: routes/*
- Services: services/* (store, pdf, signature, key-health)
- Middleware: middleware/* (require-json, json-error, inflight-lock)
- Observability: /admin/metrics
- Health: /health, Readiness: /ready (planned)

## Security and Integrity
- Content-Type enforcement (415) on JSON routes; JSON error model; finalized notes immutable.
- Signatures: finalized payloads signed (RSASSA-PSS); hashes recorded.

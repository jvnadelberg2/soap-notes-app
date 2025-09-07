# SOAP/BIRP Notes App — To-Do List

## Development Mode (free, local-only, no HIPAA)
- **FHIR:** Use HAPI FHIR JPA server (public sandbox at hapi.fhir.org or local Docker), Firely Server free edition, or HL7 validators. *Test data only — no PHI.*
- **PDF:** Use free Node.js libraries like pdfkit or Puppeteer for generating print-ready PDFs.
- **Database:** SQLite for local development; Postgres optional in Docker if multi-user testing needed.
- **Auth & security:** Feature-flagged Bearer token (`AUTH_ENABLED=0|1`). Keep `AUTH_ENABLED=0` in development for convenience.
- **Hosting:** Run app locally on `http://localhost:5050`. No TLS or HIPAA compliance required in development.
- **Testing workflow:** Validate FHIR Bundles against public sandboxes/validators. Test PDF output locally. Defer TLS and HIPAA until production.

---

## Phase 0 — Starting line (minimum technical safeguards)
1. Auth gate (feature-flagged): `AUTH_ENABLED=0|1` (default 0). Require `Authorization: Bearer $AUTH_TOKEN` on all routes except `/health`. Add per-request audit logging.  
2. TLS: Put Caddy or nginx in front with Let’s Encrypt. Force HTTPS; enable HSTS. No PHI over plain HTTP.  
3. Audit logs: Append JSON lines (`ts,user,ip,method,path,status,ms`) to `logs/audit.log.jsonl`.  
4. PDFs: For each note, generate a canonical, signable PDF with header/body/footer + signature line.  
5. FHIR export: `GET /notes/:id/fhir` returns a Bundle (`type=document`) with Composition + DocumentReference (PDF) + Patient/Encounter/Observation/Condition/Practitioner.  

---

## Phase 1 — App correctness & immutability
6. States: `draft → finalized → amended`. Block edits to finalized; use amend endpoint for new versions.  
7. Metadata: `note_uuid`, `version`, `finalized_at`, `author_name/credentials`. Show in UI and in PDF footer.  
8. Buttons/flow: Draft → **Finalize & PDF**; Final → **Print PDF**, **Export FHIR**, **Amend**.  

---

## Phase 2 — Security hardening (dev-toggle friendly)
9. When `AUTH_ENABLED=1`: enable helmet, CORS allowlist (`CORS_ORIGINS`), express-rate-limit, JSON/urlencoded size limits (1 MB), trust proxy, access log (no PHI), PHI redaction in logs.  
10. Strict content-type & limits: reject non-`application/json` (415). Enforce body size limit (413).  
11. Consistent errors: `{ error: { code, message } }` with correct HTTP statuses.  

---

## Phase 3 — Persistence & integrity
12. Storage: SQLite or Postgres. Tables: patients, encounters, notes, versions, signatures, attachments, audit_log, users.  
13. Hashing: Store SHA-256 for finalized JSON and PDF bytes; print hash in PDF footer.  
14. Backups: Nightly encrypted backup of DB + audit logs; 30-day retention; monthly restore drill.  

---

## Phase 4 — PDF details (paper-ready)
15. Header: Patient name, DOB, MRN; Encounter datetime; Author + credentials.  
16. Footer: Page X/Y; Note UUID; Version; Finalized timestamp; Content hash; Signature line.  
17. Amendments: On print, include original (Finalized) + amendment (Amendment).  

---

## Phase 5 — FHIR details (interop-ready)
18. Composition: status `final`; date=`finalized_at`; subject/encounter/author references; SOAP/BIRP sections.  
19. Linked resources: Patient, Encounter, Practitioner, Observation (vitals/labs), Condition (ICD), DocumentReference (PDF).  
20. Endpoint: `GET /notes/:id/fhir` → `application/fhir+json`. Validate locally with a FHIR validator.  

---

## Phase 6 — Ops & readiness
21. Health vs readiness: `/health` (process alive) and `/ready` (DB/filesystem OK). Add `X-Request-ID`.  
22. Log rotation & alerts: rotate access/audit logs; alert on 5xx spikes, repeated 401/429.  
23. Config hygiene: `.env` only; never commit secrets; `chmod 700 data logs`.  
24. Remove DOCX routes/links to avoid confusion.  

---

## Phase 7 — Administrative & physical (non-code)
25. Policies: access control, incident response, backups/retention, vendor management, right-of-access.  
26. Training: HIPAA training for staff with PHI access (keep certificates).  
27. BAAs: with any vendor touching PHI (hosting, email, storage). If self-hosted, document that.  
28. Physical safeguards: device encryption, screen locks, secure disposal, facility access controls.

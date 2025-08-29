# SOAP Notes AI

Generate structured SOAP notes from free text with specialty-aware prompts, optional ICD-10 suggestions, and exports.

## Quick Start
1. Install Node 18+ and Ollama (for local models).
2. Copy `.env.example` to `.env`, set ports/keys.
3. `npm install`
4. `PORT=5050 npm start`
5. Open `http://localhost:5050/`

## API
GET /api/health  
GET /api/specialties  
POST /api/generate-soap-json  
POST /api/generate-soap-json-annotated  
POST /api/generate-soap-stream  
POST /api/save-note  
GET /api/notes-list  
POST /api/icd-import-csv  
GET /api/icd-count  
POST /api/icd-suggest  
GET /api/icd-search?q=term  
GET /api/models  
GET /api/providers  
POST /api/export-pdf  
GET /api/todo  
POST /api/todo

## TODO
Managed at `/todo.html` and `/api/todo`. See `data/todo.json`.

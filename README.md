# SOAP Notes AI

An AI-powered application that generates structured SOAP notes from unstructured clinical input using LLM workflows.

This repository demonstrates how AI applications can be designed, structured, and documented for real-world use.

## What this project demonstrates

This project is designed to show how AI documentation can:
- Translate unstructured input into structured outputs  
- Use prompt workflows to guide model behavior  
- Produce consistent, usable results across different scenarios  
- Document AI systems clearly for developers and users  

## Features

- LLM-based SOAP note generation  
- Specialty-aware prompting  
- Structured output (Subjective, Objective, Assessment, Plan)  
- Optional ICD-10 suggestions  
- PDF export  
- Local (Ollama) and API-based model support  

## How it works

1. User provides free-text clinical input  
2. Backend constructs a structured prompt  
3. LLM generates structured JSON output  
4. Application formats and displays the SOAP note  

## Quick Start

1. Install Node 18+ and Ollama (for local models)  
2. Copy `.env.example` to `.env`, set ports/keys  
3. `npm install`  
4. `PORT=5050 npm start`  
5. Open `http://localhost:5050/`  

## API

- `GET /api/health`  
- `GET /api/specialties`  
- `POST /api/generate-soap-json`  
- `POST /api/generate-soap-json-annotated`  
- `POST /api/generate-soap-stream`  
- `POST /api/save-note`  
- `GET /api/notes-list`  
- `POST /api/icd-import-csv`  
- `GET /api/icd-count`  
- `POST /api/icd-suggest`  
- `GET /api/icd-search?q=term`  
- `GET /api/models`  
- `GET /api/providers`  
- `POST /api/export-pdf`  

## Why this matters

This project demonstrates:
- Practical application of LLMs in structured workflows  
- Prompt design for consistent output  
- Clear documentation of AI system behavior  
- Real-world use of AI in domain-specific applications  

## TODO

Managed at `/todo.html` and `/api/todo`. See `data/todo.json`.

## Author

Jon Nadelberg  
Technical Writer focused on AI workflows and developer documentation

# AI-Powered Investor Intelligence Platform

An intelligent, full-stack financial analysis platform that ingests company annual reports (PDFs), extracts structured financial KPIs and qualitative insights using multimodal parsing and NLP, and provides interactive analytics and an AI-powered RAG assistant for deep-dive investor queries.

---

## 🚀 Key Features

- **Automated PDF Parsing**: Uses `PyMuPDF4LLM` to extract tables, headers, and text from complex financial annual reports into structured markdown.
- **KPI Extraction & Analytics**: Automatically parses and computes essential financial metrics (Revenue, Operating Margin, Net Profit, Debt-to-Equity, EPS, Free Cash Flow, etc.).
- **Multi-Company Comparison**: Side-by-side performance comparison across multiple quarters, fiscal years, and competitors.
- **Qualitative Deep-Dive**: Extracts MD&A (Management Discussion & Analysis), risk factors, strategy summaries, and outlook.
- **RAG-Powered AI Investor Chat**: Uses ChromaDB vector search with Ollama LLM to answer detailed investor questions with grounded citations from uploaded reports.
- **Interactive Modern Frontend**: Built with React, Vite, and responsive data visualization components.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: SQLite (SQLAlchemy ORM)
- **Vector Database**: ChromaDB
- **PDF Extraction**: PyMuPDF4LLM & PyMuPDF
- **Embeddings & LLM**: Sentence Transformers / BGE embeddings & Ollama
- **Server**: Uvicorn

### Frontend
- **Framework**: React 18
- **Tooling**: Vite
- **Styling**: CSS & modern UI components

---

## 📁 Repository Structure

```
investor_intelligence/
├── backend/
│   ├── database.py              # SQLite models and connection setup
│   ├── main.py                  # FastAPI REST API endpoints
│   ├── seed_data.py             # Sample financial benchmark seed data
│   ├── requirements.txt         # Python dependencies
│   ├── services/
│   │   ├── pdf_processor.py     # PDF to Markdown parsing
│   │   ├── kpi_extractor.py     # KPI & qualitative insight extraction
│   │   └── rag_service.py       # Chunking, vector indexing & RAG query execution
│   └── uploaded_reports/        # Directory for ingested PDF reports
├── frontend/
│   ├── src/
│   │   ├── components/          # Dashboard, Comparison, Chat Drawer, etc.
│   │   ├── App.jsx              # Main React application
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## ⚡ Quick Start Guide

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend API server
uvicorn main:app --reload --port 8000
```
API Documentation will be available at: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```
The frontend application will be accessible at: `http://localhost:5173`

---

## 📜 License
MIT License.

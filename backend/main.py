"""
===============================================================================
FASTAPI MAIN SERVER - AI-POWERED INVESTOR INTELLIGENCE PLATFORM
===============================================================================
Main application entry point. Exposes REST API endpoints for:
1. Report Ingestion (/reports/upload)
2. KPI Dashboard & Multi-Company Analytics (/kpis/summary, /kpis/compare)
3. Qualitative Deep-Dive (/qualitative/{company_id}/{year})
4. AI Chat Assistant RAG Queries (/chat)
5. Seed Data & Database Initialization (/seed)
===============================================================================
"""

import os
import shutil
import logging
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Database and Services imports
from database import init_db, get_db, Company, Report, FinancialKPI, QualitativeInsight
from services.pdf_processor import convert_pdf_to_markdown, extract_metadata_from_filename_or_text
from services.kpi_extractor import extract_kpis_from_markdown, extract_qualitative_insights
from services.rag_service import chunk_markdown_document, vector_store, execute_rag_query
from seed_data import seed_initial_financial_data

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main_api")

# Directory for saving uploaded PDF annual reports
UPLOAD_DIR = "./uploaded_reports"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Initialize FastAPI App
app = FastAPI(
    title="AI-Powered Investor Intelligence Platform API",
    description="Full-stack financial analysis platform with PyMuPDF4LLM, LangChain, BGE embeddings, ChromaDB, and Ollama LLM RAG.",
    version="1.0.0"
)

# Enable CORS for React Frontend (running on port 5173 or 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
# REQUEST & RESPONSE PYDANTIC SCHEMAS
# -----------------------------------------------------------------------------

class ChatQueryRequest(BaseModel):
    question: str
    company_filter: Optional[str] = None  # e.g., 'Apple Inc.', 'Microsoft Corporation', or None for all


class ChatQueryResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    grounded: bool


# -----------------------------------------------------------------------------
# STARTUP EVENT & SEED INITIALIZATION
# -----------------------------------------------------------------------------

@app.on_event("startup")
def startup_event():
    """
    Ensures database tables exist and seeds initial company dataset on server launch.
    """
    logger.info("Initializing database schema on server startup...")
    init_db()
    
    # Auto-seed database session
    from database import SessionLocal
    db = SessionLocal()
    try:
        company_count = db.query(Company).count()
        if company_count == 0:
            logger.info("Database empty. Auto-seeding initial dataset for Apple, Microsoft, and Tesla...")
            seed_initial_financial_data(db)
    except Exception as e:
        logger.error(f"Startup seed error: {e}")
    finally:
        db.close()


# -----------------------------------------------------------------------------
# API ENDPOINTS
# -----------------------------------------------------------------------------

@app.get("/health")
def health_check():
    """
    Simple health check endpoint.
    """
    return {"status": "online", "service": "Investor Intelligence Platform API"}


@app.post("/seed")
def trigger_seed(db: Session = Depends(get_db)):
    """
    Manually triggers database & ChromaDB seeding.
    """
    try:
        seed_initial_financial_data(db)
        return {"status": "success", "message": "Successfully seeded financial data for Apple, Microsoft, and Tesla!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/companies")
def list_companies(db: Session = Depends(get_db)):
    """
    Returns list of all companies in the database that have active reports.
    Excludes orphan company entries with 0 active reports.
    """
    active_comp_ids = db.query(Report.company_id).distinct().all()
    active_ids = [c[0] for c in active_comp_ids if c[0] is not None]
    
    if not active_ids:
        return []

    companies = db.query(Company).filter(Company.id.in_(active_ids)).all()
    return [c.to_dict() for c in companies]


@app.get("/reports")
def list_reports(db: Session = Depends(get_db)):
    """
    Returns all uploaded annual reports and their ingestion status.
    """
    reports = db.query(Report).all()
    return [r.to_dict() for r in reports]


@app.delete("/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    """
    DELETES A REPORT RECORD AND SYNCS ALL DOWNSTREAM DATA:
    1. Removes PDF file from disk.
    2. Clears ChromaDB vector embeddings for this report.
    3. Removes linked FinancialKPIs and QualitativeInsights.
    4. Removes Report record.
    5. Cleans up orphan Company records if no reports remain.
    """
    rep = db.query(Report).filter(Report.id == report_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")
    
    comp = rep.company
    comp_name = comp.name if comp else "Unknown"
    comp_id = rep.company_id
    fiscal_year = rep.fiscal_year
    filename = rep.filename

    # Delete physical PDF file from disk
    if os.path.exists(rep.file_path):
        try:
            os.remove(rep.file_path)
        except Exception as e:
            logger.warning(f"Could not delete physical file: {e}")

    # Clear vector chunks from ChromaDB
    vector_store.delete_report_chunks(company=comp_name, fiscal_year=fiscal_year, source_file=filename)

    # Delete linked FinancialKPIs and QualitativeInsights for this report
    db.query(FinancialKPI).filter(
        (FinancialKPI.report_id == rep.id) | 
        ((FinancialKPI.company_id == comp_id) & (FinancialKPI.fiscal_year == fiscal_year))
    ).delete()

    db.query(QualitativeInsight).filter(
        (QualitativeInsight.report_id == rep.id) | 
        ((QualitativeInsight.company_id == comp_id) & (QualitativeInsight.fiscal_year == fiscal_year))
    ).delete()

    # Delete report record
    db.delete(rep)
    db.commit()

    # Check if company has any remaining reports; if not, remove orphan company
    remaining_reports = db.query(Report).filter(Report.company_id == comp_id).count()
    if remaining_reports == 0:
        db.query(FinancialKPI).filter(FinancialKPI.company_id == comp_id).delete()
        db.query(QualitativeInsight).filter(QualitativeInsight.company_id == comp_id).delete()
        if comp:
            db.delete(comp)
        db.commit()

    return {
        "status": "success",
        "message": f"Report #{report_id} ('{filename}') deleted and UI synced.",
        "company_id": comp_id,
        "remaining_reports": remaining_reports
    }


@app.post("/reports/upload")
async def upload_annual_report(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    company_name: Optional[str] = Form(None),
    fiscal_year: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    ANNUAL REPORT PDF INGESTION PIPELINE:
    1. Saves uploaded PDF file locally.
    2. Converts PDF to Markdown via PyMuPDF.
    3. Auto-detects metadata and saves Report, FinancialKPI, & QualitativeInsight in DB immediately.
    4. Queues ChromaDB vector embedding storage as an asynchronous background task for instant response.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    save_path = os.path.join(UPLOAD_DIR, file.filename)
    
    # Save file to disk
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    logger.info(f"Received PDF report upload: {file.filename}")

    try:
        # Step 1: Convert PDF to Markdown using high-performance PyMuPDF
        full_markdown, pages_data = convert_pdf_to_markdown(save_path)
        page_count = len(pages_data)

        # Step 2: Auto-detect company name and fiscal year if not provided
        auto_meta = extract_metadata_from_filename_or_text(file.filename, full_markdown)
        comp_name = company_name.strip() if (company_name and company_name.strip()) else auto_meta["company_name"]
        
        parsed_year = None
        if fiscal_year and fiscal_year.strip():
            try:
                parsed_year = int(fiscal_year.strip())
            except ValueError:
                parsed_year = None
        year = parsed_year if parsed_year else auto_meta["fiscal_year"]
        ticker = auto_meta["ticker"]

        # Step 3: Get or create Company in Database
        comp = db.query(Company).filter(
            (Company.name == comp_name) | (Company.ticker == ticker)
        ).first()

        if not comp:
            # Ensure unique ticker symbol if ticker collision occurs
            existing_ticker = db.query(Company).filter(Company.ticker == ticker).first()
            if existing_ticker:
                import time
                ticker = f"{ticker}_{int(time.time()) % 1000}"
            comp = Company(ticker=ticker, name=comp_name, sector="Technology")
            db.add(comp)
            db.commit()
            db.refresh(comp)

        # Step 4: Chunk document semantically
        chunks = chunk_markdown_document(pages_data, chunk_size=1200, overlap=150)
        chunk_count = len(chunks)

        # Step 5: Check if report already exists for company_id and fiscal_year to prevent duplicate report rows
        existing_report = db.query(Report).filter(
            Report.company_id == comp.id,
            Report.fiscal_year == year
        ).first()

        if existing_report:
            logger.info(f"Updating existing report #{existing_report.id} for {comp.name} ({year})...")
            # Clear old vector chunks from ChromaDB before indexing new ones
            vector_store.delete_report_chunks(company=comp.name, fiscal_year=year, source_file=existing_report.filename)
            
            existing_report.filename = file.filename
            existing_report.file_path = save_path
            existing_report.page_count = page_count
            existing_report.chunk_count = chunk_count
            existing_report.status = "PROCESSED"
            report_record = existing_report
        else:
            report_record = Report(
                company_id=comp.id,
                fiscal_year=year,
                filename=file.filename,
                file_path=save_path,
                page_count=page_count,
                chunk_count=chunk_count,
                status="PROCESSED"
            )
            db.add(report_record)

        db.commit()
        db.refresh(report_record)

        # Step 6: Queue BGE embeddings & ChromaDB vector store indexing in background task
        background_tasks.add_task(
            vector_store.add_chunks,
            chunks=chunks,
            company=comp.name,
            fiscal_year=year,
            source_file=file.filename
        )

        # Step 7: Extract financial KPIs & Qualitative Insights
        kpi_values = extract_kpis_from_markdown(full_markdown, comp.name, year)
        qualitative = extract_qualitative_insights(full_markdown, comp.name, year)

        # Upsert Financial KPIs in DB
        existing_kpi = db.query(FinancialKPI).filter(
            FinancialKPI.company_id == comp.id,
            FinancialKPI.fiscal_year == year
        ).first()

        if existing_kpi:
            for k, v in kpi_values.items():
                setattr(existing_kpi, k, v)
            existing_kpi.report_id = report_record.id
        else:
            new_kpi = FinancialKPI(
                report_id=report_record.id,
                company_id=comp.id,
                fiscal_year=year,
                **kpi_values
            )
            db.add(new_kpi)

        # Upsert Qualitative Insights in DB
        existing_insight = db.query(QualitativeInsight).filter(
            QualitativeInsight.company_id == comp.id,
            QualitativeInsight.fiscal_year == year
        ).first()

        if existing_insight:
            existing_insight.growth_drivers = qualitative["growth_drivers"]
            existing_insight.risk_factors = qualitative["risk_factors"]
            existing_insight.report_id = report_record.id
        else:
            new_insight = QualitativeInsight(
                report_id=report_record.id,
                company_id=comp.id,
                fiscal_year=year
            )
            new_insight.growth_drivers = qualitative["growth_drivers"]
            new_insight.risk_factors = qualitative["risk_factors"]
            db.add(new_insight)

        db.commit()

        return {
            "status": "success",
            "message": f"Successfully processed report '{file.filename}' for {comp.name} ({year}).",
            "report_id": report_record.id,
            "company": comp.name,
            "fiscal_year": year,
            "page_count": page_count,
            "chunk_count": chunk_count,
            "kpis_extracted": list(kpi_values.keys())
        }

    except Exception as e:
        logger.error(f"Error processing report '{file.filename}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process PDF report: {str(e)}")


@app.get("/kpis/summary")
def get_kpi_summary(year: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Returns comparative KPI summary across ALL ingested companies for the main Dashboard KPI cards.
    Fetches the latest financial KPI record for EACH company so every ingested report appears!
    """
    from sqlalchemy import func

    # Subquery to find the latest fiscal year available per company
    subquery = (
        db.query(
            FinancialKPI.company_id,
            func.max(FinancialKPI.fiscal_year).label("max_year")
        )
        .group_by(FinancialKPI.company_id)
        .subquery()
    )

    kpis = (
        db.query(FinancialKPI)
        .join(
            subquery,
            (FinancialKPI.company_id == subquery.c.company_id) & 
            (FinancialKPI.fiscal_year == subquery.c.max_year)
        )
        .all()
    )

    # If database is empty, fallback to all records
    if not kpis:
        kpis = db.query(FinancialKPI).all()

    summary_cards = {
        "revenue": {"title": "REVENUE", "subtitle": "Total company revenue", "items": []},
        "net_income": {"title": "NET INCOME", "subtitle": "Net profit after all expenses", "items": []},
        "operating_income": {"title": "OPERATING INCOME", "subtitle": "Earnings from operations", "items": []},
        "operating_cash_flow": {"title": "OPERATING CASH FLOW", "subtitle": "Cash flow from operations", "items": []},
        "total_assets": {"title": "TOTAL ASSETS", "subtitle": "Total economic resources", "items": []},
        "total_liabilities": {"title": "TOTAL LIABILITIES", "subtitle": "Total outstanding obligations", "items": []}
    }

    # Group by metric for progress bar comparison across all ingested companies
    for k in kpis:
        cname = k.company.name if k.company else "Unknown"
        ticker = k.company.ticker if k.company else "UNK"
        cyear = k.fiscal_year

        summary_cards["revenue"]["items"].append({"company": cname, "ticker": ticker, "year": cyear, "value": k.revenue})
        summary_cards["net_income"]["items"].append({"company": cname, "ticker": ticker, "year": cyear, "value": k.net_income})
        summary_cards["operating_income"]["items"].append({"company": cname, "ticker": ticker, "year": cyear, "value": k.operating_income})
        summary_cards["operating_cash_flow"]["items"].append({"company": cname, "ticker": ticker, "year": cyear, "value": k.operating_cash_flow})
        summary_cards["total_assets"]["items"].append({"company": cname, "ticker": ticker, "year": cyear, "value": k.total_assets})
        summary_cards["total_liabilities"]["items"].append({"company": cname, "ticker": ticker, "year": cyear, "value": k.total_liabilities})

    return summary_cards


@app.get("/kpis/compare")
def get_kpi_comparison(db: Session = Depends(get_db)):
    """
    Returns multi-year trend and multi-company structured KPI data for Recharts interactive visualizations.
    """
    all_kpis = db.query(FinancialKPI).order_by(FinancialKPI.fiscal_year.asc()).all()
    return [k.to_dict() for k in all_kpis]


@app.get("/qualitative/{company_id}/{year}")
def get_qualitative_deep_dive(company_id: int, year: int, db: Session = Depends(get_db)):
    """
    Returns Top Growth Drivers and Top Risk Factors for the Qualitative Intelligence Deep-Dive card.
    """
    insight = db.query(QualitativeInsight).filter(
        QualitativeInsight.company_id == company_id,
        QualitativeInsight.fiscal_year == year
    ).first()

    if not insight:
        # Fallback to any year for this company
        insight = db.query(QualitativeInsight).filter(QualitativeInsight.company_id == company_id).first()

    if not insight:
        return {"growth_drivers": [], "risk_factors": []}

    return insight.to_dict()


@app.post("/chat", response_model=ChatQueryResponse)
def chat_with_assistant(query: ChatQueryRequest):
    """
    AI CHAT ASSISTANT ENDPOINT:
    Accepts user question, searches ChromaDB vector store with BGE query embeddings,
    builds prompt with retrieved annual report context, queries Ollama LLM, and returns
    answer grounded strictly in context with source citations.
    """
    if not query.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    res = execute_rag_query(question=query.question, company_filter=query.company_filter)
    return res


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

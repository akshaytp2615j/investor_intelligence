"""
===============================================================================
DATABASE MODULE - AI-POWERED INVESTOR INTELLIGENCE PLATFORM
===============================================================================
This module handles database connection initialization using SQLAlchemy and defines
the relational ORM models for structured financial KPIs, company metadata,
report tracking, and qualitative intelligence (growth drivers and risk factors).

Supports both PostgreSQL (e.g. postgresql://user:pass@localhost:5432/investordb)
and SQLite (default fallback for instant zero-configuration development).
===============================================================================
"""

import os
import json
from datetime import datetime
from typing import Generator
from sqlalchemy import create_engine, Column, Integer, Float, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

# -----------------------------------------------------------------------------
# DATABASE CONNECTION SETUP
# -----------------------------------------------------------------------------
# Priority 1: PostgreSQL URL from environment variable
# Priority 2: SQLite local file database fallback
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "sqlite:///./investor_platform.db"
)

# SQLite requires connect_args check_same_thread=False for async/multithreaded FastAPI access
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL, 
    connect_args=connect_args,
    echo=False  # Set to True for SQL query debugging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base for SQLAlchemy models
Base = declarative_base()


# -----------------------------------------------------------------------------
# DATABASE ORM MODELS
# -----------------------------------------------------------------------------

class Company(Base):
    """
    Represents a corporate entity being analyzed on the platform (e.g. Apple, Microsoft, Tesla).
    """
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(10), unique=True, index=True, nullable=False)  # e.g., AAPL, MSFT, TSLA
    name = Column(String(100), nullable=False)                             # e.g., Apple Inc.
    sector = Column(String(50), default="Technology")                    # e.g., Consumer Electronics / Cloud

    # Relationships
    reports = relationship("Report", back_populates="company", cascade="all, delete-orphan")
    kpis = relationship("FinancialKPI", back_populates="company", cascade="all, delete-orphan")
    insights = relationship("QualitativeInsight", back_populates="company", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "ticker": self.ticker,
            "name": self.name,
            "sector": self.sector
        }


class Report(Base):
    """
    Tracks uploaded annual report files (Form 10-K / Annual Reports) and processing status.
    """
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    fiscal_year = Column(Integer, nullable=False)                         # e.g., 2024
    filename = Column(String(255), nullable=False)                       # Original PDF filename
    file_path = Column(String(500), nullable=False)                      # Local disk storage path
    page_count = Column(Integer, default=0)                              # Total pages in PDF
    chunk_count = Column(Integer, default=0)                             # Total semantic chunks created
    status = Column(String(50), default="PROCESSED")                     # PROCESSING, PROCESSED, ERROR
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="reports")
    kpis = relationship("FinancialKPI", back_populates="report", cascade="all, delete-orphan")
    insights = relationship("QualitativeInsight", back_populates="report", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "company_name": self.company.name if self.company else "Unknown",
            "company_ticker": self.company.ticker if self.company else "",
            "fiscal_year": self.fiscal_year,
            "filename": self.filename,
            "page_count": self.page_count,
            "chunk_count": self.chunk_count,
            "status": self.status,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None
        }


class FinancialKPI(Base):
    """
    Stores extracted quantitative financial metrics for major KPI Dashboard visualization.
    Values are stored in Millions USD (except EPS which is in USD).
    """
    __tablename__ = "financial_kpis"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    fiscal_year = Column(Integer, nullable=False)                         # e.g., 2024

    # Core Financial KPIs (in Millions USD, EPS in USD)
    revenue = Column(Float, nullable=False, default=0.0)                 # Revenue ($M)
    net_income = Column(Float, nullable=False, default=0.0)              # Net Income ($M)
    eps = Column(Float, nullable=False, default=0.0)                     # Diluted Earnings Per Share ($)
    operating_income = Column(Float, nullable=False, default=0.0)        # Operating Income ($M)
    gross_profit = Column(Float, nullable=False, default=0.0)            # Gross Profit ($M)
    total_assets = Column(Float, nullable=False, default=0.0)            # Total Assets ($M)
    total_liabilities = Column(Float, nullable=False, default=0.0)       # Total Liabilities ($M)
    operating_cash_flow = Column(Float, nullable=False, default=0.0)    # Operating Cash Flow ($M)
    cash_equivalents = Column(Float, nullable=False, default=0.0)       # Cash & Cash Equivalents ($M)
    free_cash_flow = Column(Float, nullable=False, default=0.0)          # Free Cash Flow ($M)

    # YoY Growth percentages
    revenue_growth = Column(Float, default=0.0)                          # e.g., 2.0%
    net_income_growth = Column(Float, default=0.0)                       # e.g., 5.4%

    # Relationships
    company = relationship("Company", back_populates="kpis")
    report = relationship("Report", back_populates="kpis")

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "company_name": self.company.name if self.company else "",
            "company_ticker": self.company.ticker if self.company else "",
            "fiscal_year": self.fiscal_year,
            "revenue": self.revenue,
            "net_income": self.net_income,
            "eps": self.eps,
            "operating_income": self.operating_income,
            "gross_profit": self.gross_profit,
            "total_assets": self.total_assets,
            "total_liabilities": self.total_liabilities,
            "operating_cash_flow": self.operating_cash_flow,
            "cash_equivalents": self.cash_equivalents,
            "free_cash_flow": self.free_cash_flow,
            "revenue_growth": self.revenue_growth,
            "net_income_growth": self.net_income_growth
        }


class QualitativeInsight(Base):
    """
    Stores extracted qualitative insights (Growth Drivers & Risk Factors)
    for the Qualitative Intelligence Deep-Dive dashboard section.
    """
    __tablename__ = "qualitative_insights"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    fiscal_year = Column(Integer, nullable=False)

    # Stored as JSON encoded strings or newline-separated text
    growth_drivers_json = Column(Text, nullable=False, default="[]")     # List of growth drivers
    risk_factors_json = Column(Text, nullable=False, default="[]")       # List of risk factors

    # Relationships
    company = relationship("Company", back_populates="insights")
    report = relationship("Report", back_populates="insights")

    @property
    def growth_drivers(self):
        try:
            return json.loads(self.growth_drivers_json)
        except Exception:
            return []

    @growth_drivers.setter
    def growth_drivers(self, val):
        self.growth_drivers_json = json.dumps(val)

    @property
    def risk_factors(self):
        try:
            return json.loads(self.risk_factors_json)
        except Exception:
            return []

    @risk_factors.setter
    def risk_factors(self, val):
        self.risk_factors_json = json.dumps(val)

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "company_name": self.company.name if self.company else "",
            "company_ticker": self.company.ticker if self.company else "",
            "fiscal_year": self.fiscal_year,
            "growth_drivers": self.growth_drivers,
            "risk_factors": self.risk_factors
        }


# -----------------------------------------------------------------------------
# HELPER FUNCTIONS
# -----------------------------------------------------------------------------

def init_db():
    """
    Creates database tables if they do not exist.
    """
    Base.metadata.create_all(bind=engine)

def get_db() -> Generator:
    """
    FastAPI Dependency: Yields a transactional SQLAlchemy database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

"""
===============================================================================
SEED DATA MODULE - AI-POWERED INVESTOR INTELLIGENCE PLATFORM
===============================================================================
Populates the relational database (PostgreSQL/SQLite) and ChromaDB vector store
with initial financial metrics, qualitative insights, and annual report context chunks
for Apple Inc., Microsoft Corporation, and Tesla Inc. across 2022, 2023, and 2024.
===============================================================================
"""

import logging
from sqlalchemy.orm import Session
from database import init_db, SessionLocal, Company, Report, FinancialKPI, QualitativeInsight
from services.rag_service import vector_store

logger = logging.getLogger("seed_data")
logger.setLevel(logging.INFO)


def seed_initial_financial_data(db: Session):
    """
    Seeds initial financial companies, KPIs, and Qualitative Insights into database.
    """
    logger.info("Initializing database schema...")
    init_db()

    # 1. Seed Companies
    companies_data = [
        {"ticker": "AAPL", "name": "Apple Inc.", "sector": "Consumer Electronics"},
        {"ticker": "MSFT", "name": "Microsoft Corporation", "sector": "Cloud & Enterprise Software"},
        {"ticker": "TSLA", "name": "Tesla, Inc.", "sector": "Automotive & Clean Energy"}
    ]

    company_map = {}
    for cdata in companies_data:
        existing = db.query(Company).filter(Company.ticker == cdata["ticker"]).first()
        if not existing:
            comp = Company(ticker=cdata["ticker"], name=cdata["name"], sector=cdata["sector"])
            db.add(comp)
            db.commit()
            db.refresh(comp)
            company_map[cdata["ticker"]] = comp
        else:
            company_map[cdata["ticker"]] = existing

    # 2. Seed Reports & Financial KPIs
    kpis_data = [
        # APPLE INC
        {
            "ticker": "AAPL", "year": 2024,
            "revenue": 391035.0, "net_income": 93736.0, "eps": 6.08, "operating_income": 123216.0,
            "gross_profit": 180683.0, "total_assets": 364980.0, "total_liabilities": 308030.0,
            "operating_cash_flow": 118254.0, "cash_equivalents": 29944.0, "free_cash_flow": 108800.0,
            "revenue_growth": 2.0, "net_income_growth": 5.4,
            "drivers": [
                "Higher net sales of Services including advertising, App Store, and cloud services",
                "Increased Mac sales driven by higher laptop sales and new M-series chip architecture",
                "Strong iPhone sales momentum in key international growth markets",
                "New product launches such as iPhone 16 series, Apple Watch Series 10, and MacBook updates",
                "Operational efficiencies contributing to higher overall product gross margins"
            ],
            "risks": [
                "Macroeconomic conditions including inflation, interest rates, and foreign currency fluctuations",
                "Weakness in foreign currencies relative to the U.S. dollar impacting international sales",
                "Lower net sales in Greater China due to intense local smartphone competition",
                "Volatility and downward pressure on gross margins due to product mix shifts",
                "Global supply chain dependency and concentrated semiconductor manufacturing"
            ]
        },
        {
            "ticker": "AAPL", "year": 2023,
            "revenue": 383285.0, "net_income": 88997.0, "eps": 5.65, "operating_income": 114301.0,
            "gross_profit": 169148.0, "total_assets": 352583.0, "total_liabilities": 290437.0,
            "operating_cash_flow": 110543.0, "cash_equivalents": 29965.0, "free_cash_flow": 99584.0,
            "revenue_growth": -2.8, "net_income_growth": -2.8,
            "drivers": ["Services revenue all-time high", "Strong iPhone upgrade cycle in Q4"],
            "risks": ["Foreign exchange headwinds", "Mac and iPad market contraction"]
        },
        {
            "ticker": "AAPL", "year": 2022,
            "revenue": 394328.0, "net_income": 99803.0, "eps": 6.11, "operating_income": 119437.0,
            "gross_profit": 170782.0, "total_assets": 352755.0, "total_liabilities": 302083.0,
            "operating_cash_flow": 122151.0, "cash_equivalents": 23646.0, "free_cash_flow": 111443.0,
            "revenue_growth": 7.8, "net_income_growth": 5.4,
            "drivers": ["Record hardware sales", "Supply chain recovery post-pandemic"],
            "risks": ["Component shortages", "Geopolitical tensions"]
        },

        # MICROSOFT CORPORATION
        {
            "ticker": "MSFT", "year": 2024,
            "revenue": 245122.0, "net_income": 88136.0, "eps": 11.80, "operating_income": 109433.0,
            "gross_profit": 170000.0, "total_assets": 512163.0, "total_liabilities": 243686.0,
            "operating_cash_flow": 118548.0, "cash_equivalents": 75500.0, "free_cash_flow": 74100.0,
            "revenue_growth": 15.7, "net_income_growth": 21.8,
            "drivers": [
                "Accelerated adoption of Azure AI infrastructure and cloud platform services",
                "Expansion of Copilot AI integration across Microsoft 365 enterprise applications",
                "Solid enterprise software subscription renewals and commercial cloud growth",
                "Gaming segment revenue consolidation following the Activision Blizzard acquisition",
                "Expanding operating margins through disciplined capital allocation"
            ],
            "risks": [
                "Intense market competition in cloud computing and artificial intelligence",
                "High capital expenditure demands for AI data center expansion and GPU server clusters",
                "Cybersecurity vulnerabilities and privacy compliance mandates",
                "Geopolitical uncertainties affecting global enterprise IT spending"
            ]
        },
        {
            "ticker": "MSFT", "year": 2023,
            "revenue": 211915.0, "net_income": 72361.0, "eps": 9.68, "operating_income": 88523.0,
            "gross_profit": 146052.0, "total_assets": 411976.0, "total_liabilities": 205753.0,
            "operating_cash_flow": 87582.0, "cash_equivalents": 34700.0, "free_cash_flow": 59475.0,
            "revenue_growth": 6.8, "net_income_growth": -0.5,
            "drivers": ["Azure Cloud growth", "Office 365 enterprise seat expansion"],
            "risks": ["PC hardware sales decline", "Tech sector spending slowdown"]
        },
        {
            "ticker": "MSFT", "year": 2022,
            "revenue": 198270.0, "net_income": 72738.0, "eps": 9.65, "operating_income": 83383.0,
            "gross_profit": 135620.0, "total_assets": 364840.0, "total_liabilities": 198298.0,
            "operating_cash_flow": 89035.0, "cash_equivalents": 13931.0, "free_cash_flow": 65149.0,
            "revenue_growth": 18.0, "net_income_growth": 18.7,
            "drivers": ["Strong cloud transition", "LinkedIn and Intelligent Cloud strength"],
            "risks": ["Foreign currency unfavorable adjustments", "Macroeconomic headwinds"]
        },

        # TESLA INC
        {
            "ticker": "TSLA", "year": 2024,
            "revenue": 97690.0, "net_income": 7091.0, "eps": 2.04, "operating_income": 7076.0,
            "gross_profit": 17660.0, "total_assets": 122070.0, "total_liabilities": 48390.0,
            "operating_cash_flow": 14923.0, "cash_equivalents": 16400.0, "free_cash_flow": 3600.0,
            "revenue_growth": 1.0, "net_income_growth": -52.7,
            "drivers": [
                "Growth in energy storage business (Megapack deployments)",
                "Cybertruck production ramp and global vehicle delivery expansion",
                "Increased Full Self-Driving (FSD) software subscription recognition",
                "Manufacturing cost optimizations across Texas and Berlin Gigafactories"
            ],
            "risks": [
                "Automotive price reductions impacting vehicle gross margins",
                "Increasing EV competition from legacy OEMs and international market entrants",
                "Regulatory scrutiny regarding autonomous vehicle software and safety",
                "Capital investments in AI supercomputing infrastructure (Dojo)"
            ]
        },
        {
            "ticker": "TSLA", "year": 2023,
            "revenue": 96773.0, "net_income": 14997.0, "eps": 4.30, "operating_income": 8891.0,
            "gross_profit": 17660.0, "total_assets": 106618.0, "total_liabilities": 43009.0,
            "operating_cash_flow": 13256.0, "cash_equivalents": 16400.0, "free_cash_flow": 4358.0,
            "revenue_growth": 18.8, "net_income_growth": 19.4,
            "drivers": ["Model Y global volume leader", "Energy storage deployment doubling"],
            "risks": ["Price reductions", "High interest rate impact on auto financing"]
        },
        {
            "ticker": "TSLA", "year": 2022,
            "revenue": 81462.0, "net_income": 12587.0, "eps": 3.62, "operating_income": 13656.0,
            "gross_profit": 20853.0, "total_assets": 82338.0, "total_liabilities": 36440.0,
            "operating_cash_flow": 14724.0, "cash_equivalents": 16253.0, "free_cash_flow": 7566.0,
            "revenue_growth": 51.4, "net_income_growth": 127.5,
            "drivers": ["Record vehicle deliveries", "Austin and Berlin factory openings"],
            "risks": ["Supply chain logistics bottlenecks", "Raw material price spikes"]
        }
    ]

    for item in kpis_data:
        comp = company_map[item["ticker"]]
        
        # Check if report exists
        rep = db.query(Report).filter(Report.company_id == comp.id, Report.fiscal_year == item["year"]).first()
        if not rep:
            rep = Report(
                company_id=comp.id,
                fiscal_year=item["year"],
                filename=f"{comp.ticker}_{item['year']}_Annual_Report.pdf",
                file_path=f"/seed/{comp.ticker}_{item['year']}.pdf",
                page_count=75,
                chunk_count=120,
                status="PROCESSED"
            )
            db.add(rep)
            db.commit()
            db.refresh(rep)

        # Check if KPI exists
        existing_kpi = db.query(FinancialKPI).filter(
            FinancialKPI.company_id == comp.id,
            FinancialKPI.fiscal_year == item["year"]
        ).first()

        if not existing_kpi:
            kpi = FinancialKPI(
                report_id=rep.id,
                company_id=comp.id,
                fiscal_year=item["year"],
                revenue=item["revenue"],
                net_income=item["net_income"],
                eps=item["eps"],
                operating_income=item["operating_income"],
                gross_profit=item["gross_profit"],
                total_assets=item["total_assets"],
                total_liabilities=item["total_liabilities"],
                operating_cash_flow=item["operating_cash_flow"],
                cash_equivalents=item["cash_equivalents"],
                free_cash_flow=item["free_cash_flow"],
                revenue_growth=item["revenue_growth"],
                net_income_growth=item["net_income_growth"]
            )
            db.add(kpi)

        # Check if Insight exists
        existing_insight = db.query(QualitativeInsight).filter(
            QualitativeInsight.company_id == comp.id,
            QualitativeInsight.fiscal_year == item["year"]
        ).first()

        if not existing_insight:
            insight = QualitativeInsight(
                report_id=rep.id,
                company_id=comp.id,
                fiscal_year=item["year"]
            )
            insight.growth_drivers = item["drivers"]
            insight.risk_factors = item["risks"]
            db.add(insight)

    db.commit()
    logger.info("Successfully seeded database with structured financial KPIs!")

    # 3. Seed ChromaDB Vector Store Chunks for RAG
    seed_chunks = [
        {
            "company": "Apple Inc.",
            "fiscal_year": 2024,
            "source_file": "Apple_2024_Annual_Report.pdf",
            "page": 12,
            "text": "Total net sales increased 2% or $7.8 billion during fiscal year 2024 compared to fiscal year 2023. Services net sales reached a record $96,169 million, driven by higher net sales in advertising, App Store, and cloud services. Mac net sales rose to $29,984 million due to higher laptop demand."
        },
        {
            "company": "Apple Inc.",
            "fiscal_year": 2024,
            "source_file": "Apple_2024_Annual_Report.pdf",
            "page": 18,
            "text": "Item 1A. Risk Factors. Macroeconomic conditions including persistent inflation, high interest rates, and foreign currency fluctuations relative to the U.S. dollar continue to impact consolidated net sales. Foreign exchange headwinds reduced net sales growth by approximately 180 basis points."
        },
        {
            "company": "Microsoft Corporation",
            "fiscal_year": 2024,
            "source_file": "MSFT_2024_Annual_Report.pdf",
            "page": 24,
            "text": "Revenue increased $33.2 billion or 16% driven by growth in Intelligent Cloud and Azure AI services. Azure and other cloud services revenue grew 30% driven by strong demand for enterprise AI model training and inferencing workloads."
        },
        {
            "company": "Tesla, Inc.",
            "fiscal_year": 2024,
            "source_file": "TSLA_2024_Annual_Report.pdf",
            "page": 30,
            "text": "Total automotive revenues reached $78,500 million, while Energy storage and generation revenues doubled to $6,035 million due to strong Megapack deployments in North America and Asia."
        }
    ]

    for item in seed_chunks:
        vector_store.add_chunks(
            chunks=[{"text": item["text"], "page": item["page"]}],
            company=item["company"],
            fiscal_year=item["fiscal_year"],
            source_file=item["source_file"]
        )
    logger.info("Successfully seeded ChromaDB vector store with annual report context chunks!")


if __name__ == "__main__":
    db = SessionLocal()
    seed_initial_financial_data(db)
    db.close()

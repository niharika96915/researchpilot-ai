from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, Response

from app.auth import get_current_user
from app.exporter import report_to_markdown, report_to_pdf
from app.research import ResearchRequest, ResearchResponse, run_research
from app.report import ResearchReport
from app.payments import router as payments_router


app = FastAPI(
    title="ResearchPilot AI",
    description="Agentic AI Research Assistant API",
    version="0.1.0",
)
app.include_router(
    payments_router,
    prefix="/payments",
    tags=["payments"],
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://researchpilot-ai-1-97yx.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "ResearchPilot AI backend is running."
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# =========================================================
# RESEARCH
# =========================================================

@app.post(
    "/research",
    response_model=ResearchResponse,
)
def research(
    request: ResearchRequest,
    user=Depends(get_current_user),
):
    return run_research(
        query=request.query,
        user_id=user.id,
    )


# =========================================================
# EXPORT MARKDOWN
# =========================================================

@app.post("/research/export/markdown")
def export_markdown(
    report: ResearchReport,
    user=Depends(get_current_user),
):
    markdown = report_to_markdown(report)

    return PlainTextResponse(
        content=markdown,
        media_type="text/markdown",
        headers={
            "Content-Disposition": (
                "attachment; filename=research-report.md"
            )
        },
    )


# =========================================================
# EXPORT PDF
# =========================================================

@app.post("/research/export/pdf")
def export_pdf(
    report: ResearchReport,
    user=Depends(get_current_user),
):
    pdf = report_to_pdf(report)

    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                "attachment; filename=research-report.pdf"
            )
        },
    )
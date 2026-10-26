from fastapi import HTTPException
from pydantic import BaseModel

from app.citations import Citation, create_citations
from app.evidence import Evidence, extract_evidence
from app.planner import create_research_plan
from app.report import ResearchReport, create_report
from app.search import SearchResult, search_web
from app.supabase_client import get_supabase
from app.synthesizer import ResearchSynthesis, synthesize_research


class ResearchRequest(BaseModel):
    query: str


class ResearchResponse(BaseModel):
    query: str
    status: str
    message: str
    research_questions: list[str]
    sources: list[SearchResult]
    evidence: list[Evidence]
    synthesis: ResearchSynthesis
    citations: list[Citation]
    report: ResearchReport


def get_user_settings(user_id: str) -> dict:
    """
    Get the user's research preferences.

    Defaults are used if the user has not created
    a settings row yet.
    """

    supabase = get_supabase()

    result = (
        supabase
        .table("user_settings")
        .select(
            "research_depth, sources_per_query, "
            "export_format, citation_style"
        )
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )

    settings = result.data

    if not settings:
        return {
            "research_depth": "standard",
            "sources_per_query": 3,
            "export_format": "pdf",
            "citation_style": "numbered",
        }

    return {
        "research_depth": settings.get(
            "research_depth",
            "standard",
        ),
        "sources_per_query": int(
            settings.get(
                "sources_per_query",
                3,
            )
        ),
        "export_format": settings.get(
            "export_format",
            "pdf",
        ),
        "citation_style": settings.get(
            "citation_style",
            "numbered",
        ),
    }


def get_question_limit(research_depth: str) -> int:
    """
    Decide how many planned research questions
    should actually be searched.
    """

    limits = {
        "quick": 2,
        "standard": 4,
        "deep": 6,
    }

    return limits.get(
        research_depth,
        4,
    )


def run_research(
    query: str,
    user_id: str,
) -> ResearchResponse:

    query = query.strip()

    if not query:
        raise HTTPException(
            status_code=400,
            detail="Research query cannot be empty.",
        )

    supabase = get_supabase()

    # -------------------------------------------------
    # Load user settings
    # -------------------------------------------------

    settings = get_user_settings(user_id)

    research_depth = settings["research_depth"]
    sources_per_query = settings["sources_per_query"]

    question_limit = get_question_limit(
        research_depth
    )

    # -------------------------------------------------
    # Consume one research credit
    # -------------------------------------------------

    credit_result = supabase.rpc(
        "consume_credit",
        {
            "p_user_id": user_id,
        },
    ).execute()

    credit_consumed = bool(
        credit_result.data
    )

    if not credit_consumed:
        raise HTTPException(
            status_code=402,
            detail=(
                "Insufficient credits. "
                "Please purchase more credits "
                "to continue."
            ),
        )

    try:

        # -------------------------------------------------
        # 1. PLAN
        # -------------------------------------------------

        plan = create_research_plan(query)

        research_questions = (
            plan.research_questions[
                :question_limit
            ]
        )

        # -------------------------------------------------
        # 2. SEARCH
        # -------------------------------------------------

        all_sources: list[SearchResult] = []

        for question in research_questions:

            sources = search_web(
                question,
                max_results=sources_per_query,
            )

            all_sources.extend(sources)

        # -------------------------------------------------
        # 3. EXTRACT EVIDENCE
        # -------------------------------------------------

        evidence = extract_evidence(
            all_sources
        )

        if not evidence:
            raise ValueError(
                "No useful research evidence was found."
            )

        # -------------------------------------------------
        # 4. SYNTHESIZE
        # -------------------------------------------------

        synthesis = synthesize_research(
            query=query,
            evidence=evidence,
        )

        # -------------------------------------------------
        # 5. CITATIONS
        # -------------------------------------------------

        citations = create_citations(
            evidence
        )

        # -------------------------------------------------
        # 6. REPORT
        # -------------------------------------------------

        report = create_report(
            query=query,
            synthesis=synthesis,
            citations=citations,
        )

        # -------------------------------------------------
        # 7. SAVE HISTORY
        # -------------------------------------------------

        history_result = (
            supabase
            .table("research_history")
            .insert(
                {
                    "user_id": user_id,
                    "query": report.query,
                    "executive_summary": (
                        report.executive_summary
                    ),
                    "key_findings": (
                        report.key_findings
                    ),
                    "detailed_analysis": (
                        report.detailed_analysis
                    ),
                    "citations": [
                        citation.model_dump()
                        for citation in report.citations
                    ],
                }
            )
            .execute()
        )

        if not history_result.data:
            raise ValueError(
                "Research was completed but "
                "history could not be saved."
            )

        # -------------------------------------------------
        # SUCCESS
        # -------------------------------------------------

        return ResearchResponse(
            query=query,
            status="completed",
            message=(
                "Research report generated successfully."
            ),
            research_questions=research_questions,
            sources=all_sources,
            evidence=evidence,
            synthesis=synthesis,
            citations=citations,
            report=report,
        )

    except HTTPException:
        raise

    except Exception as error:

        # Refund credit if research fails
        try:
            supabase.rpc(
                "refund_credit",
                {
                    "p_user_id": user_id,
                },
            ).execute()

        except Exception:
            pass

        raise HTTPException(
            status_code=500,
            detail=f"Research failed: {str(error)}",
        ) from error
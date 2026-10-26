from pydantic import BaseModel

from app.citations import Citation
from app.synthesizer import ResearchSynthesis


class ResearchReport(BaseModel):
    query: str
    executive_summary: str
    key_findings: list[str]
    detailed_analysis: str
    citations: list[Citation]


def create_report(
    query: str,
    synthesis: ResearchSynthesis,
    citations: list[Citation],
) -> ResearchReport:
    return ResearchReport(
        query=query,
        executive_summary=synthesis.executive_summary,
        key_findings=synthesis.key_findings,
        detailed_analysis=synthesis.detailed_analysis,
        citations=citations,
    )
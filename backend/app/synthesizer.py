import os

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field

from app.evidence import Evidence

load_dotenv(override=True)


class ResearchSynthesis(BaseModel):
    executive_summary: str = Field(
        description="A concise summary of the main answer to the research query."
    )
    key_findings: list[str] = Field(
        description="The most important findings supported by the provided evidence."
    )
    detailed_analysis: str = Field(
        description="A detailed analysis based only on the provided evidence."
    )


def synthesize_research(
    query: str,
    evidence: list[Evidence],
) -> ResearchSynthesis:

    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured.")

    if not evidence:
        raise ValueError("No research evidence is available for synthesis.")

    client = genai.Client(api_key=api_key)

    evidence_text = "\n\n".join(
        f"""
SOURCE {index}
Title: {item.title}
URL: {item.url}
Evidence:
{item.passage}
"""
        for index, item in enumerate(evidence, start=1)
    )

    prompt = f"""
You are the synthesis agent for ResearchPilot AI.

Your job is to answer the user's research query using ONLY
the evidence provided below.

IMPORTANT RULES:
- Do not invent facts.
- Do not use information that is not supported by the provided evidence.
- If the evidence is insufficient for a claim, do not make that claim.
- Identify the most important findings.
- Write clear, factual, research-oriented prose.
- Do not include citations in this step.
- Citations will be added by a separate layer later.

USER QUERY:
{query}

PROVIDED EVIDENCE:
{evidence_text}
"""

    response = client.interactions.create(
        model=model,
        input=prompt,
        response_format={
            "type": "text",
            "mime_type": "application/json",
            "schema": ResearchSynthesis.model_json_schema(),
        },
    )

    return ResearchSynthesis.model_validate_json(response.output_text)
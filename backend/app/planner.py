import os

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field

load_dotenv(override=True)


class ResearchPlan(BaseModel):
    research_questions: list[str] = Field(
        description="A list of focused questions that should be researched to answer the user's query."
    )


def create_research_plan(query: str) -> ResearchPlan:
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured.")

    client = genai.Client(api_key=api_key)

    prompt = f"""
You are the research planning agent for ResearchPilot AI.

Your job is to break a user's research query into focused,
independent research questions.

Rules:
- Generate 4 to 6 research questions.
- Questions must directly help answer the original query.
- Avoid duplicate questions.
- Cover different important aspects of the topic.
- Do not answer the questions.
- Return only the structured research plan.

User query:
{query}
"""

    response = client.interactions.create(
        model=model,
        input=prompt,
        response_format={
            "type": "text",
            "mime_type": "application/json",
            "schema": ResearchPlan.model_json_schema(),
        },
    )

    return ResearchPlan.model_validate_json(response.output_text)
import os

from dotenv import load_dotenv
from tavily import TavilyClient
from pydantic import BaseModel

load_dotenv()


class SearchResult(BaseModel):
    title: str
    url: str
    content: str


def search_web(query: str, max_results: int = 5) -> list[SearchResult]:
    api_key = os.getenv("TAVILY_API_KEY")

    if not api_key:
        raise ValueError("TAVILY_API_KEY is not configured.")

    client = TavilyClient(api_key=api_key)

    response = client.search(
        query=query,
        search_depth="advanced",
        max_results=max_results,
        include_answer=False,
    )

    results = []

    for item in response.get("results", []):
        results.append(
            SearchResult(
                title=item.get("title", ""),
                url=item.get("url", ""),
                content=item.get("content", ""),
            )
        )

    return results
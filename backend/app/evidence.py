from pydantic import BaseModel

from app.search import SearchResult


class Evidence(BaseModel):
    title: str
    url: str
    passage: str


def extract_evidence(sources: list[SearchResult]) -> list[Evidence]:
    evidence = []

    seen_urls = set()

    for source in sources:
        if not source.url:
            continue

        if source.url in seen_urls:
            continue

        seen_urls.add(source.url)

        passage = source.content.strip()

        if not passage:
            continue

        evidence.append(
            Evidence(
                title=source.title,
                url=source.url,
                passage=passage,
            )
        )

    return evidence
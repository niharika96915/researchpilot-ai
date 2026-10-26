from pydantic import BaseModel

from app.evidence import Evidence


class Citation(BaseModel):
    id: int
    title: str
    url: str


def create_citations(evidence: list[Evidence]) -> list[Citation]:
    citations = []

    for index, item in enumerate(evidence, start=1):
        citations.append(
            Citation(
                id=index,
                title=item.title,
                url=item.url,
            )
        )

    return citations
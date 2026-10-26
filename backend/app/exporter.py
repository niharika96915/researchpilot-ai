from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)
from reportlab.lib.styles import getSampleStyleSheet

from app.report import ResearchReport


def report_to_markdown(report: ResearchReport) -> str:
    lines = [
        f"# {report.query}",
        "",
        "## Executive Summary",
        "",
        report.executive_summary,
        "",
        "## Key Findings",
        "",
    ]

    for finding in report.key_findings:
        lines.append(f"- {finding}")

    lines.extend(
        [
            "",
            "## Detailed Analysis",
            "",
            report.detailed_analysis,
            "",
            "## Sources & Citations",
            "",
        ]
    )

    for citation in report.citations:
        lines.append(
            f"[{citation.id}] {citation.title}\n"
            f"{citation.url}\n"
        )

    return "\n".join(lines)


def report_to_pdf(report: ResearchReport) -> bytes:
    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()
    story = []

    story.append(
        Paragraph(
            report.query,
            styles["Title"],
        )
    )

    story.append(Spacer(1, 20))

    story.append(
        Paragraph(
            "Executive Summary",
            styles["Heading2"],
        )
    )

    story.append(
        Paragraph(
            report.executive_summary,
            styles["BodyText"],
        )
    )

    story.append(Spacer(1, 15))

    story.append(
        Paragraph(
            "Key Findings",
            styles["Heading2"],
        )
    )

    for finding in report.key_findings:
        story.append(
            Paragraph(
                f"• {finding}",
                styles["BodyText"],
            )
        )

    story.append(Spacer(1, 15))

    story.append(
        Paragraph(
            "Detailed Analysis",
            styles["Heading2"],
        )
    )

    story.append(
        Paragraph(
            report.detailed_analysis,
            styles["BodyText"],
        )
    )

    story.append(Spacer(1, 15))

    story.append(
        Paragraph(
            "Sources & Citations",
            styles["Heading2"],
        )
    )

    for citation in report.citations:
        story.append(
            Paragraph(
                f"[{citation.id}] {citation.title}",
                styles["BodyText"],
            )
        )

        story.append(
            Paragraph(
                citation.url,
                styles["BodyText"],
            )
        )

        story.append(Spacer(1, 8))

    document.build(story)

    return buffer.getvalue()
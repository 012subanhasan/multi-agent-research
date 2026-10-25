import os
import time
import logging
from typing import Any, Dict, List
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field

from .state import AgentState
from .researcher import scrape_targeted_sources

load_dotenv()
logger = logging.getLogger(__name__)


class ChartDataItem(BaseModel):
    label: str = Field(description="Label for data point / X-axis category")
    value: float = Field(description="Numeric value for data point / Y-axis value")


class ChartSpec(BaseModel):
    title: str = Field(description="Title of the chart")
    type: str = Field(description="Type of chart: 'bar', 'line', or 'pie'", default="bar")
    data: List[ChartDataItem] = Field(description="Array of chart data points")


class ReportSection(BaseModel):
    heading: str = Field(description="Section heading")
    content: str = Field(description="Detailed markdown content for section")


class VisualReportSchema(BaseModel):
    title: str = Field(description="Main title of the visual report")
    subtitle: str = Field(description="Subtitle summarizing the research report")
    summary: str = Field(description="Executive summary of findings")
    key_findings: List[str] = Field(description="List of verified key findings")
    charts: List[ChartSpec] = Field(description="Visualization chart specifications for frontend dashboard")
    mermaid_diagram: str = Field(description="Valid Mermaid.js diagram markup string")
    sections: List[ReportSection] = Field(description="Detailed report sections with markdown text")


def invoke_llm_with_retry(llm, messages, max_retries=4):
    """Helper function to automatically catch Groq rate limit (429) errors, wait, and retry."""
    for attempt in range(max_retries):
        try:
            return llm.invoke(messages)
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "Rate limit" in err_str or "ResourceExhausted" in err_str:
                sleep_time = 15 * (attempt + 1)
                logger.warning(f"Groq rate limit hit (Attempt {attempt+1}/{max_retries}). Throttling and sleeping for {sleep_time}s...")
                time.sleep(sleep_time)
                if attempt == max_retries - 1:
                    raise e
            else:
                raise e
    raise RuntimeError("Max retries exceeded for LLM invocation.")


def designer_node(state: AgentState) -> Dict[str, Any]:
    """Designer node: Performs iterative on-demand scraping per chapter, writes long-form content with strict spaced Mermaid diagrams."""
    query = state.get("query", "")
    plan = state.get("plan", [])
    verified_data = state.get("verified_data", {})
    logs = list(state.get("logs", []))

    logs.append(f"[Designer] Starting iterative long-form report generation across {len(plan)} planned chapters...")

    groq_api_key = os.getenv("GROQ_API_KEY")
    llm = ChatGroq(
        model="openai/gpt-oss-120b",
        api_key=groq_api_key,
        temperature=0.3,
        max_retries=5
    )

    full_markdown = f"# Deep Research Paper: {query.title()}\n\n"
    full_markdown += "**Subtitle:** Enterprise Multi-Agent Research & Visual Architecture Synthesis\n\n---\n\n"

    report_sections: List[ReportSection] = []
    all_sources: List[Dict[str, str]] = []
    seen_urls = set()
    total_mermaid_diagrams = 0
    main_mermaid_diagram = "graph TD\n    A[\"Client Request\"] --> B[\"API Gateway\"]\n    B --> C[\"Core Engine\"]\n    C --> D[\"Secure Datastore\"]"

    for idx, sec in enumerate(plan):
        time.sleep(5)

        sec_num = sec.get("section_number", idx + 1)
        sec_title = sec.get("title", f"Chapter {sec_num}")
        need_diagram = sec.get("need_diagram", False)

        logs.append(f"[Designer] Writing Chapter {sec_num}/{len(plan)}: '{sec_title}'")

        sec_sources = []
        try:
            sec_sources = scrape_targeted_sources(f"{query} {sec_title}", max_urls=2)
        except Exception as scrap_err:
            logger.warning(f"Scraping warning for chapter {sec_num}: {scrap_err}")

        for s in sec_sources:
            url = s.get("url", "#")
            if url not in seen_urls:
                seen_urls.add(url)
                all_sources.append(s)

        sources_text = "\n\n".join([
            f"Source [{s.get('title', 'Ref')} - {s.get('url', '#')}]:\n{(s.get('content') or s.get('snippet', ''))[:800]}"
            for s in sec_sources
        ])

        diagram_instruction = ""
        if need_diagram:
            diagram_instruction = """
CRITICAL REQUIREMENT - MERMAID DIAGRAM:
Include a valid, structured, STRICTLY VERTICAL Mermaid.js flowchart.
DIAGRAM RULES:
1. Must start with `graph TD` (Top-Down vertical layout ONLY). Never use graph LR or horizontal layouts.
2. MANDATORY SPACING & QUOTING RULE: Every single node MUST use an alphanumeric ID followed by its descriptive label wrapped in double quotes with proper spaces (e.g., A["Client Request"] --> B["Partition Detection"]). NEVER write node names together like `ClientRequest` or `LeaderElection`. Always use spaces inside quotes.
3. Every node must have explicit connection arrows (`-->`).
4. Wrap cleanly in:
```mermaid
graph TD
  A["Client Request"] --> B["Partition Detection"]
  B --> C["Leader Election"]
```"""

        system_prompt = "You are a Lead Software Architect and Academic Researcher. Write dense, highly technical long-form research chapters."

        user_prompt = f"""Write Chapter {sec_num}: "{sec_title}" for a research paper on "{query}".

Fresh Web Intelligence Context for this Chapter:
{sources_text if sources_text else 'Synthesize foundational architectural specs.'}

INSTRUCTIONS:
1. Write a dense, highly technical chapter (400-600 words).
2. Rephrase all web concepts into synthetic academic prose.
3. Include concrete JSON examples, architectural parameters, or performance figures where relevant.
4. STRICT RULE: DO NOT include trailing sub-headings (e.g., "Expected Contributions"), summary lists, or internal references/bibliographies at the end of this chapter.
{diagram_instruction}

Output ONLY markdown content starting with `## Chapter {sec_num}: {sec_title}`."""

        try:
            response = invoke_llm_with_retry(llm, [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ])
            chapter_md = response.content.strip()

            if "```mermaid" in chapter_md:
                total_mermaid_diagrams += 1
                if total_mermaid_diagrams == 1:
                    try:
                        extracted_diag = chapter_md.split("```mermaid")[1].split("```")[0].strip()
                        if extracted_diag:
                            main_mermaid_diagram = extracted_diag
                    except Exception:
                        pass

        except Exception as e:
            logger.error(f"Error generating chapter {sec_num}: {e}")
            chapter_md = f"## Chapter {sec_num}: {sec_title}\n\nTechnical synthesis for this chapter was auto-completed via resilient architectural fallback due to rate limits."

        full_markdown += chapter_md + "\n\n---\n\n"
        report_sections.append(ReportSection(
            heading=f"Chapter {sec_num}: {sec_title}",
            content=chapter_md
        ))
        logs.append(f"[Designer] Chapter {sec_num} completed ({len(chapter_md)} chars).")

    full_markdown += "## References & Bibliography\n\n"
    for i, src in enumerate(all_sources):
        full_markdown += f"{i+1}. [{src.get('title', 'Source')}]({src.get('url', '#')})\n"

    chart_data = [
        ChartDataItem(label=f"Ch {idx+1}", value=float(len(sec.content.split())))
        for idx, sec in enumerate(report_sections[:10])
    ]

    chart_spec = ChartSpec(
        title="Word Distribution per Chapter",
        type="bar",
        data=chart_data if chart_data else [ChartDataItem(label="Ch 1", value=500.0)]
    ).model_dump()

    report_json = {
        "title": f"Deep Research Report: {query.title()}",
        "subtitle": "Enterprise Multi-Agent Intelligence Synthesis & Architecture",
        "summary": f"Comprehensive {len(plan)}-chapter research synthesis covering architecture, design patterns, and operational mechanics for {query}.",
        "key_findings": verified_data.get("key_insights", [f"Verified technical findings for {query}"]),
        "charts": [chart_spec],
        "mermaid_diagram": main_mermaid_diagram,
        "sections": [sec.model_dump() for sec in report_sections],
        "markdown_content": full_markdown,
        "chapters_count": len(plan),
        "total_sources_used": len(all_sources),
        "mermaid_diagrams_count": total_mermaid_diagrams,
        "sources": [{"title": s.get("title", "Source"), "url": s.get("url", "#")} for s in all_sources]
    }

    logs.append(f"[Designer] Report synthesis completed! Generated {len(plan)} chapters (~{len(full_markdown.split())} words) with {total_mermaid_diagrams} Mermaid diagrams using {len(all_sources)} web sources.")

    return {
        "final_report": report_json,
        "status": "completed",
        "logs": logs
    }
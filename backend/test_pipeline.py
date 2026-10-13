import json
import os
import sys
from dotenv import load_dotenv

# Add project root to Python search path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Load environment variables from backend/.env or root .env
load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))
if not os.getenv("GROQ_API_KEY"):
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from backend.agents.graph import agent_graph


def run_test():
    query = "Latest developments in AI Agent Frameworks in 2026"
    print("==================================================")
    print("DEEPSEARCH AI - MULTI-AGENT PIPELINE TEST (PURE GROQ)")
    print("==================================================")
    print(f"Query: {query}")
    print(f"GROQ_API_KEY present: {bool(os.getenv('GROQ_API_KEY'))}\n")

    initial_state = {
        "query": query,
        "plan": [],
        "raw_data": [],
        "verified_data": {},
        "final_report": {},
        "status": "started",
        "logs": ["Pipeline initialized."]
    }

    print("Running LangGraph StateGraph (Researcher -> Analyst -> Designer)...")
    final_state = agent_graph.invoke(initial_state)

    print("\n--------------------------------------------------")
    print("EXECUTION AUDIT LOGS:")
    print("--------------------------------------------------")
    for log in final_state.get("logs", []):
        print(f"  {log}")

    print("\n--------------------------------------------------")
    print(f"FINAL STATUS: {final_state.get('status')}")
    print("--------------------------------------------------")

    report = final_state.get("final_report", {})
    markdown_text = report.get("markdown_content", "")

    # Fallback to concatenate sections if markdown_content is missing
    if not markdown_text and report.get("sections"):
        markdown_text = "\n\n".join([f"## {sec.get('heading', '')}\n{sec.get('content', '')}" for sec in report.get("sections", [])])

    approx_words = len(markdown_text.split())
    approx_pages = max(1, approx_words // 500)

    print("\nGENERATED LONG-FORM REPORT METRICS:")
    print(f"Title: {report.get('title')}")
    print(f"Subtitle: {report.get('subtitle')}")
    print(f"Chapters Generated: {report.get('chapters_count', len(report.get('sections', [])))}")
    print(f"Total Unique Web Sources Scraped: {report.get('total_sources_used', len(report.get('sources', [])))}")
    print(f"Mermaid Diagrams Embedded: {report.get('mermaid_diagrams_count', 0)}")
    print(f"Estimated Word Count: ~{approx_words} words")
    print(f"Estimated Page Length: ~{approx_pages} Pages")

    print("\nCHAPTERS BREAKDOWN:")
    for sec in report.get("sections", []):
        has_diag = "```mermaid" in sec.get("content", "")
        diag_badge = "[📊 Diagram Included]" if has_diag else "[📄 Text Chapter]"
        print(f"  - {sec.get('heading')} {diag_badge} ({len(sec.get('content', ''))} chars)")

    if report.get("sources"):
        print("\nSOURCES USED:")
        for i, src in enumerate(report.get("sources", [])):
            print(f"  [{i+1}] {src.get('title')} -> {src.get('url')}")

    # Save full Markdown report to file
    output_filename = "generated_research_paper.md"
    with open(output_filename, "w", encoding="utf-8") as f:
        f.write(markdown_text)
    print(f"\n✅ Full Markdown Report saved to: {output_filename}")


if __name__ == "__main__":
    run_test()
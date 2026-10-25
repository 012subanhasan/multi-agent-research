import json
import os
import re
from typing import Any, Dict
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from .state import AgentState

load_dotenv()


def analyst_node(state: AgentState) -> Dict[str, Any]:
    """Analyst node: Performs fact verification and formulates a dynamic chapter research plan based on user selection."""
    query = state.get("query", "")
    raw_data = state.get("raw_data", [])
    chapters_count = int(state.get("chapters_count", 5))
    logs = list(state.get("logs", []))

    logs.append(f"[Analyst] Analyzing sources and formulating {chapters_count}-chapter outline for '{query}'...")

    groq_api_key = os.getenv("GROQ_API_KEY")
    llm = ChatGroq(
        model="openai/gpt-oss-120b",
        api_key=groq_api_key,
        temperature=0.2
    )

    # Format context from raw_data
    context_str = ""
    for i, doc in enumerate(raw_data[:5]):
        context_str += f"\n--- SOURCE {i+1}: {doc.get('title', '')} ({doc.get('url', '')}) ---\n"
        context_str += f"Snippet: {doc.get('snippet', '')}\n"

    system_prompt = (
        "You are an Expert Senior Research Analyst and Lead AI Systems Architect. Your task is to analyze "
        f"raw search context, perform fact verification, and formulate a detailed {chapters_count}-section research outline."
    )

    user_prompt = f"""Target Research Query: "{query}"

Available Web Context:
{context_str if context_str else "Synthesize standard architecture and research specs."}

Please analyze the sources and generate exactly {chapters_count} chapter research outline.
For each section, specify:
1. section_number (integer)
2. title (string)
3. need_diagram (boolean)
4. diagram_type (e.g., 'graph TD', 'sequenceDiagram', 'erDiagram', 'flowchart LR', 'stateDiagram-v2', 'graph TB')

Output strictly a raw JSON array of objects with the exact schema:
[
  {{"section_number": 1, "title": "Executive Summary & Core Motivation", "need_diagram": false, "diagram_type": "none"}},
  {{"section_number": 2, "title": "System Architecture & High-Level Topology", "need_diagram": true, "diagram_type": "graph TD"}}
]

Do NOT wrap your JSON response in backticks or markdown codeblocks. Output raw JSON array only.
"""

    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ])
        content = response.content.strip()

        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        plan = json.loads(content)
        if len(plan) > chapters_count:
            plan = plan[:chapters_count]
            
        logs.append(f"[Analyst] Research outline created successfully with {len(plan)} chapters.")

    except Exception as e:
        logs.append(f"[Analyst] Analysis warning/fallback activated: {str(e)}")
        diagram_types = ["none", "graph TD", "sequenceDiagram", "flowchart LR", "stateDiagram-v2", "erDiagram", "graph TB"]
        plan = [
            {
                "section_number": i + 1,
                "title": f"Chapter {i+1}: Technical Analysis & Architecture Aspect {i+1}",
                "need_diagram": i > 0,
                "diagram_type": diagram_types[i % len(diagram_types)]
            }
            for i in range(chapters_count)
        ]

    verified_json = {
        "verified_facts": [f"Evaluated {len(raw_data)} sources for '{query}'."],
        "key_insights": [sec.get("title", "") for sec in plan],
        "sections": plan,
        "summary": f"Formulated a {len(plan)}-chapter technical structure based on gathered web intelligence."
    }

    return {
        "plan": plan,
        "verified_data": verified_json,
        "status": "analysis_completed",
        "logs": logs
    }
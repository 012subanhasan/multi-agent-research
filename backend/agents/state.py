from typing import Any, Dict, List, TypedDict


class AgentState(TypedDict):
    """State definition for the DeepSearch multi-agent pipeline."""
    query: str
    plan: List[Dict[str, Any]]  # Added: 10-12 chapters ka research plan store karne ke liye
    raw_data: List[Dict[str, Any]]
    verified_data: Dict[str, Any]
    final_report: Dict[str, Any]
    status: str
    logs: List[str]
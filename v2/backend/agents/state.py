from typing import Any, Dict, List, TypedDict


class AgentState(TypedDict):
    """State definition for the DeepSearch multi-agent pipeline."""
    query: str
    chapters_count: int
    plan: List[Dict[str, Any]]
    raw_data: List[Dict[str, Any]]
    verified_data: Dict[str, Any]
    final_report: Dict[str, Any]
    status: str
    logs: List[str]
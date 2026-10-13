from langgraph.graph import StateGraph, START, END

from .state import AgentState
from .researcher import researcher_node
from .analyst import analyst_node
from .designer import designer_node


def create_agent_graph():
    """Builds and compiles the LangGraph state graph linking researcher -> analyst -> designer."""
    workflow = StateGraph(AgentState)

    # Add agent nodes
    workflow.add_node("researcher", researcher_node)
    workflow.add_node("analyst", analyst_node)
    workflow.add_node("designer", designer_node)

    # Wire execution graph: START -> researcher -> analyst -> designer -> END
    workflow.add_edge(START, "researcher")
    workflow.add_edge("researcher", "analyst")
    workflow.add_edge("analyst", "designer")
    workflow.add_edge("designer", END)

    return workflow.compile()


agent_graph = create_agent_graph()
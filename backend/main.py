import logging
import os
import sys
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure project directory in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from backend.agents.graph import agent_graph
from backend.database import init_db, save_report, get_report

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup DB connection initialization
    await init_db()
    yield


app = FastAPI(
    title="DeepSearch AI API",
    description="Multi-Agent Deep Research Pipeline Powered by Groq Cloud API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for Next.js frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Topic or research query")
    force_refresh: bool = Field(default=False, description="Bypass cache if true")


class ResearchResponse(BaseModel):
    query: str
    status: str
    logs: List[str]
    report: Dict[str, Any]
    cached: bool = False


@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "service": "DeepSearch AI Backend",
        "groq_configured": bool(os.getenv("GROQ_API_KEY"))
    }


@app.post("/api/research", response_model=ResearchResponse)
async def run_research(request: ResearchRequest):
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # Check cache unless force_refresh is requested
    if not request.force_refresh:
        cached_data = await get_report(query)
        if cached_data and "report" in cached_data:
            logger.info(f"Returning cached report for query: '{query}'")
            return ResearchResponse(
                query=query,
                status="completed",
                logs=cached_data.get("logs", []) + ["[Cache] Returned cached research report."],
                report=cached_data["report"],
                cached=True
            )

    logger.info(f"Executing DeepSearch agent pipeline for query: '{query}'")
    
    initial_state = {
        "query": query,
        "raw_data": [],
        "verified_data": {},
        "final_report": {},
        "status": "started",
        "logs": [f"[System] DeepSearch pipeline triggered for query: '{query}'"]
    }

    try:
        final_state = agent_graph.invoke(initial_state)
        report = final_state.get("final_report", {})
        logs = final_state.get("logs", [])
        status = final_state.get("status", "completed")

        # Save to database cache
        await save_report(query, report, logs)

        return ResearchResponse(
            query=query,
            status=status,
            logs=logs,
            report=report,
            cached=False
        )
    except Exception as e:
        logger.error(f"Error running agent pipeline: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Pipeline execution error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)

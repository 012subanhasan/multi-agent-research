import logging
import os
import sys
import json
import asyncio
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
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
    await init_db()
    yield


app = FastAPI(
    title="DeepSearch AI API",
    description="Multi-Agent Deep Research Pipeline Powered by Groq Cloud API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Topic or research query")
    chapters_count: int = Field(default=5, ge=1, le=10, description="Number of chapters to generate (1-10)")
    force_refresh: bool = Field(default=False, description="Bypass cache if true")


@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "service": "DeepSearch AI Backend",
        "groq_configured": bool(os.getenv("GROQ_API_KEY"))
    }


@app.get("/api/report")
async def get_cached_report(query: str):
    """Retrieves the completed research report from the database cache."""
    data = await get_report(query)
    if not data:
        raise HTTPException(status_code=404, detail="Report not found in cache.")
    return data


@app.post("/api/research")
async def run_research(request: ResearchRequest):
    query = request.query.strip()
    chapters_count = request.chapters_count
    
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # 1. Check cache unless force_refresh is requested
    if not request.force_refresh:
        cached_data = await get_report(query)
        if cached_data and "report" in cached_data:
            logger.info(f"Returning cached report for query: '{query}'")
            cached_logs = cached_data.get("logs", []) + ["[Cache] Returned cached research report."]
            
            async def cached_generator():
                yield f"data: {json.dumps({'logs': cached_logs, 'status': 'completed', 'cached': True})}\n\n"
            
            return StreamingResponse(cached_generator(), media_type="text/event-stream")

    logger.info(f"Executing DeepSearch agent pipeline stream for query: '{query}' ({chapters_count} chapters)")
    
    queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    async def run_pipeline():
        initial_state = {
            "query": query,
            "chapters_count": chapters_count,
            "plan": [],
            "raw_data": [],
            "verified_data": {},
            "final_report": {},
            "status": "started",
            "logs": [f"[System] DeepSearch pipeline triggered for query: '{query}' ({chapters_count} chapters)"]
        }
        
        await queue.put({
            "logs": initial_state["logs"],
            "status": "started",
            "cached": False
        })

        def worker():
            current_logs = list(initial_state["logs"])
            final_report_data = {}
            try:
                for event in agent_graph.stream(initial_state, stream_mode="updates"):
                    for node_name, node_output in event.items():
                        if "logs" in node_output:
                            current_logs = node_output["logs"]
                        
                        report_payload = node_output.get("final_report")
                        if report_payload:
                            final_report_data = report_payload
                            
                        status_val = node_output.get("status", "running")
                        
                        asyncio.run_coroutine_threadsafe(
                            queue.put({
                                "logs": list(current_logs),
                                "status": status_val,
                                "cached": False
                            }),
                            loop
                        )
                
                if final_report_data:
                    asyncio.run_coroutine_threadsafe(
                        save_report(query, final_report_data, current_logs),
                        loop
                    )

            except Exception as exc:
                err_msg = f"Pipeline execution error: {str(exc)}"
                logger.error(err_msg, exc_info=True)
                current_logs.append(f"[Error] {err_msg}")
                asyncio.run_coroutine_threadsafe(
                    queue.put({
                        "logs": list(current_logs),
                        "status": "error",
                        "cached": False
                    }),
                    loop
                )
            finally:
                asyncio.run_coroutine_threadsafe(queue.put(None), loop)

        await asyncio.to_thread(worker)

    asyncio.create_task(run_pipeline())

    async def event_generator():
        while True:
            item = await queue.get()
            if item is None:
                break
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
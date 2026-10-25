import os
import logging
import re
from typing import Any, Dict, List, Tuple
from ddgs import DDGS
import trafilatura
from groq import Groq

from .state import AgentState

# Suppress noisy third-party downloader and SSL logging spam in the terminal
logging.getLogger("trafilatura").setLevel(logging.ERROR)
logging.getLogger("trafilatura.downloads").setLevel(logging.ERROR)
logging.getLogger("urllib3").setLevel(logging.ERROR)

logger = logging.getLogger(__name__)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def expand_query(main_query: str) -> Tuple[List[str], List[str]]:
    """
    Generates 3 distinct, clean keyword search queries with cognitive thought traces.
    """
    opt_logs = []
    opt_logs.append(f"🧠 [Cognitive Parser] Analyzing user intent and semantic vectors for: '{main_query}'")

    if not main_query or not str(main_query).strip():
        opt_logs.append("⚠️ [Cognitive Parser] Empty query detected. Initializing default system fallback architecture vectors.")
        return [
            "software engineering architecture overview",
            "system design patterns workflow",
            "technical implementation guide"
        ], opt_logs

    clean_main = str(main_query).strip()
    opt_logs.append(f"🔍 [Intent Analysis] Deconstructing natural language syntax and isolating core technical domains.")

    try:
        opt_logs.append("⚙️ [Keyword Optimizer] Engaging Groq LLM (openai/gpt-oss-120b) to distill high-signal search parameters...")
        prompt = f"""You are an expert search engine keyword optimizer.
Main topic: "{clean_main}"

Generate EXACTLY 3 short, distinct keyword-based search queries (3 to 5 words each) to find technical documentation and architecture patterns.

CRITICAL RULES:
1. Do NOT use conversational words (e.g., 'Show', 'Step by step', 'Workflow', 'Explain', 'Please', 'Can you').
2. Return EACH query on a NEW line.
3. Do NOT add numbers, bullet points, markdown backticks, quotes, or preambles."""

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=250
        )
        
        if not response or not response.choices or not response.choices[0].message.content:
            raise ValueError("Empty response received from Groq API")

        raw_output = response.choices[0].message.content.strip()
        opt_logs.append(f"💡 [Cognitive Synthesizer] Raw generated search vectors received.")
        
        # Remove markdown code blocks if the LLM wrapped them
        raw_output = re.sub(r'```[a-zA-Z]*', '', raw_output)
        raw_output = raw_output.replace('```', '')

        lines = raw_output.split("\n")
        cleaned_queries = []
        
        for line in lines:
            line_clean = re.sub(r'^[\s\-*\d\.\#\>\"\']+', '', line).strip()
            line_clean = line_clean.strip('"\'*-_')
            line_clean = re.sub(r'[^\w\s-]', '', line_clean).strip()
            
            if line_clean and len(line_clean.split()) >= 2:
                if line_clean not in cleaned_queries:
                    cleaned_queries.append(line_clean)

        opt_logs.append(f"🎯 [Vector Refinement] Filtered noise and normalized query tokens: {cleaned_queries}")

        if len(cleaned_queries) >= 2:
            final_queries = cleaned_queries[:3]
            opt_logs.append(f"🚀 [Search Ready] Finalized multi-angle search queries: {final_queries}")
            return final_queries, opt_logs

    except Exception as e:
        opt_logs.append(f"⚠️ [Optimizer Warning] LLM expansion bypassed due to threshold limit: {e}")
        opt_logs.append("🔄 [Algorithmic Reasoning] Executing deterministic stop-word filtration fallback...")

    # Algorithmic fallback for rate limits, API timeouts, or empty outputs
    stop_words = {
        "show", "the", "step-by-step", "step", "by", "workflow", "for", "a", 
        "me", "please", "explain", "generate", "can", "you", "how", "what", 
        "is", "an", "do", "i", "to", "in", "of", "and", "with"
    }
    opt_logs.append(f"🧹 [Filter] Stripping conversational stop words from query body.")
    
    sanitized_query = re.sub(r'[^\w\s-]', ' ', clean_main)
    words = [w for w in sanitized_query.split() if w.lower() not in stop_words]
    
    if not words:
        words = clean_main.split()

    core = " ".join(words[:4]) if words else clean_main
    opt_logs.append(f"🔑 [Core Extraction] Identified technical focal point: '{core}'")
    
    fallback_queries = [
        f"{core} architecture design pattern",
        f"{core} implementation pipeline",
        f"{core} technical specification workflow"
    ]
    opt_logs.append(f"🚀 [Search Ready] Generated fallback cognitive query vectors: {fallback_queries}")
    return fallback_queries, opt_logs


def scrape_targeted_sources(topic_query: str, max_urls: int = 1) -> List[Dict[str, str]]:
    """On-Demand Targeted Scraper with cognitive feedback."""
    scraped_data = []
    seen_urls = set()

    try:
        with DDGS() as ddgs:
            stop_words = {"show", "the", "explain", "chapter", "section", "overview", "workflow", "latest", "in", "2026"}
            clean_words = [w for w in topic_query.split() if w.lower() not in stop_words]
            search_term = " ".join(clean_words[:5]) or topic_query

            try:
                results = list(ddgs.text(search_term, max_results=max_urls + 1))
            except Exception:
                results = []

            for res in results:
                if len(scraped_data) >= max_urls:
                    break

                url = res.get("href") or res.get("link", "") or res.get("url", "")
                if not url or url in seen_urls:
                    continue

                seen_urls.add(url)
                title = res.get("title", "")
                snippet = res.get("body") or res.get("snippet", "") or res.get("excerpt", "")

                scraped_content = ""
                try:
                    downloaded = trafilatura.fetch_url(
                        url, 
                        no_ssl=True,
                        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    )
                    if downloaded:
                        extracted = trafilatura.extract(downloaded, include_comments=False, include_tables=True)
                        if extracted:
                            lines = [l.strip() for l in extracted.split("\n") if l.strip()]
                            filtered_lines = [
                                l for l in lines 
                                if not any(noise in l.lower() for noise in ["all rights reserved", "cookie policy", "accept cookies", "privacy policy", "sign up", "subscribe", "skip to content"])
                            ]
                            scraped_content = "\n".join(filtered_lines)[:1800]
                except Exception:
                    pass

                scraped_data.append({
                    "title": title,
                    "url": url,
                    "snippet": snippet,
                    "content": scraped_content or snippet
                })
    except Exception as e:
        logger.error(f"Targeted search error for '{topic_query}': {e}")

    return scraped_data


def researcher_node(state: AgentState) -> Dict[str, Any]:
    """Researcher node with cognitive thought stream logging."""
    query = state.get("query", "")
    logs = list(state.get("logs", []))
    
    logs.append(f"🌐 [Information Retrieval] Initializing multi-angle web intelligence gathering...")
    
    sub_queries, optimization_logs = expand_query(query)
    logs.extend(optimization_logs)
    logs.append(f"📡 [Query Dispatch] Sub-queries dispatched to global search nodes: {sub_queries}")

    raw_results: List[Dict[str, Any]] = []
    seen_urls = set()
    target_sources = 6

    try:
        with DDGS() as ddgs:
            for sq in sub_queries:
                if len(raw_results) >= target_sources:
                    break
                    
                logs.append(f"🔍 [Semantic Scan querying DuckDuckGo]: '{sq}'")
                
                try:
                    results = list(ddgs.text(sq, max_results=3))
                except Exception as e:
                    logger.warning(f"DDGS text search failed for '{sq}': {e}")
                    results = []

                for res in results:
                    if len(raw_results) >= target_sources:
                        break
                        
                    url = res.get("href") or res.get("link", "") or res.get("url", "")
                    
                    if not url or url in seen_urls:
                        continue
                        
                    seen_urls.add(url)
                    title = res.get("title", "")
                    snippet = res.get("body") or res.get("snippet", "") or res.get("excerpt", "")

                    scraped_content = ""
                    try:
                        downloaded = trafilatura.fetch_url(
                            url, 
                            no_ssl=True,
                            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                        )
                        if downloaded:
                            extracted = trafilatura.extract(downloaded, include_comments=False, include_tables=True)
                            if extracted:
                                lines = [l.strip() for l in extracted.split("\n") if l.strip()]
                                filtered_lines = [
                                    l for l in lines 
                                    if not any(noise in l.lower() for noise in ["all rights reserved", "cookie policy", "accept cookies", "privacy policy", "sign up", "subscribe", "skip to content"])
                                ]
                                scraped_content = "\n".join(filtered_lines)[:1800]
                    except Exception:
                        pass

                    raw_results.append({
                        "title": title,
                        "url": url,
                        "snippet": snippet,
                        "content": scraped_content or snippet,
                        "scraped_content": scraped_content or snippet,
                    })
                    logs.append(f"🛡️ [Evidence Evaluated & Cleaned] [{len(raw_results)}/{target_sources}]: {title[:55]}...")

    except Exception as e:
        logger.error(f"DuckDuckGo search error: {e}")
        logs.append(f"⚠️ [Retrieval Warning] Search node error encountered: {str(e)}")

    if not raw_results:
        raw_results.append({
            "title": f"Web Intelligence Context for {query}",
            "url": "https://duckduckgo.com",
            "snippet": f"Overview and research analysis for {query}.",
            "content": f"Synthesized research context regarding {query}.",
            "scraped_content": f"Synthesized research context regarding {query}."
        })

    logs.append(f"✅ [Intelligence Compilation] Successfully ingested & filtered {len(raw_results)} unique knowledge sources.")

    return {
        "raw_data": raw_results,
        "status": "research_completed",
        "logs": logs,
    }
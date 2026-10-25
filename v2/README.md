# Multi-Agent Research Pipeline (Version 2 - Query Optimized)

This directory contains **v2** of the Multi-Agent Research Pipeline, upgraded with enhanced query optimization, cognitive thought streaming, improved content extraction, and resilient UI visualization.

---

## 🚀 Key Improvements in v2

1. **Intelligent Query Expansion & Optimization**:
   - Automatic extraction of core technical concepts from user queries.
   - LLM-assisted generation of targeted multi-angle search queries with robust fallback vectors.
   - Elimination of redundant or generic query noise for higher quality search hits.

2. **Cleaned Web Ingestion & Anti-Noise Filtering**:
   - Upgraded scraper integration with custom headers and resilient HTTP handling.
   - Automatic removal of cookie notices, boilerplate, navigation bars, and marketing noise before context ingestion.
   - Optimized source count for fast, high-signal context synthesis without LLM context bloat.

3. **Cognitive Thought Stream Logging**:
   - Structured step-by-step audit logs capturing the agent's internal reasoning, query dispatches, evidence evaluations, and synthesis stages.

4. **Resilient Frontend & Visualizations**:
   - Enhanced Mermaid diagram parsing, sanitization, and fallback rendering.
   - Smooth real-time research progress tracking and streamlined tab navigation for research artifacts.

---

## 🛠️ Getting Started

### 1. Backend Setup

```bash
cd v2/backend

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and supply your GROQ_API_KEY and other required keys

# Run the FastAPI server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd v2/frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

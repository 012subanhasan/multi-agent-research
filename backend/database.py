import logging
import os
from typing import Any, Dict, Optional, List
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# In-memory storage fallback if MongoDB is not accessible
_in_memory_db: Dict[str, Dict[str, Any]] = {}

mongo_client = None
db = None

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/deepsearch")


async def init_db():
    global mongo_client, db
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        # Verify connection
        await mongo_client.admin.command('ping')
        db = mongo_client.get_default_database()
        logger.info("Connected to MongoDB successfully.")
    except Exception as e:
        logger.warning(f"MongoDB connection failed: {e}. Falling back to in-memory cache storage.")
        mongo_client = None
        db = None


async def save_report(query: str, report: Dict[str, Any], logs: List[str]) -> str:
    record = {
        "query": query,
        "report": report,
        "logs": logs,
        "created_at": os.popen('echo %DATE% %TIME%').read().strip() if os.name == 'nt' else ''
    }
    if db is not None:
        try:
            result = await db.reports.insert_one(record)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error saving to MongoDB: {e}")

    # Fallback to in-memory DB
    _in_memory_db[query.lower().strip()] = record
    return f"mem_{len(_in_memory_db)}"


async def get_report(query: str) -> Optional[Dict[str, Any]]:
    key = query.lower().strip()
    if db is not None:
        try:
            doc = await db.reports.find_one({"query": query})
            if doc:
                doc["_id"] = str(doc["_id"])
                return doc
        except Exception as e:
            logger.error(f"Error reading from MongoDB: {e}")

    return _in_memory_db.get(key)

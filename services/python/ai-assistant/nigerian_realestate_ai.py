"""
Nigerian Real Estate AI Assistant
===================================
Session-aware conversational AI for Nigerian property search and advisory.

Features:
  - Ollama-first LLM (llama3.2, mistral, or gemma2) with OpenAI fallback
  - Persistent conversation sessions (Redis TTL-backed)
  - Nigerian market context injection (city prices, LGA data, market trends)
  - Intent classification (search, valuation, legal, financing, investment)
  - Structured property search extraction from natural language
  - Multi-language support (English, Yoruba, Hausa, Igbo)
  - CBN/FCCPC regulatory guardrails

API endpoints:
  POST /chat          — Send a message, get a response
  POST /session/new   — Create a new conversation session
  GET  /session/{id}  — Get session history
  DELETE /session/{id} — Clear session
  GET  /health        — Health check
"""

import json
import logging
import os
import re
import sys
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import redis
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nigerian_ai")

# ── Config ────────────────────────────────────────────────────────────────────
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "3600"))  # 1 hour
MAX_HISTORY_MESSAGES = int(os.getenv("MAX_HISTORY_MESSAGES", "20"))

# ── Nigerian Market Context ───────────────────────────────────────────────────
NIGERIAN_MARKET_CONTEXT = """
You are a knowledgeable Nigerian real estate assistant. You have deep expertise in:

MARKET KNOWLEDGE:
- Lagos property market: Victoria Island (₦2.5M-₦3.5M/sqm), Ikoyi (₦2.2M/sqm), 
  Lekki Phase 1 (₦1.8M/sqm), Banana Island (₦3.5M/sqm+), Ikeja GRA (₦1.2M/sqm),
  Magodo (₦900K/sqm), Surulere (₦600K/sqm), Yaba (₦550K/sqm)
- Abuja market: Maitama (₦1.5M/sqm), Asokoro (₦1.4M/sqm), Wuse 2 (₦1.2M/sqm),
  Gwarinpa (₦700K/sqm), Jabi (₦900K/sqm)
- Port Harcourt: GRA Phase 1 & 2 (₦800K/sqm), Trans Amadi (₦600K/sqm)
- Current USD/NGN rate: approximately ₦1,600/USD (check for latest)

LEGAL & REGULATORY:
- C of O (Certificate of Occupancy): The gold standard title document in Nigeria
- Governor's Consent: Required for land transfers in Lagos State
- Deed of Assignment: Common for property transfers
- Survey Plan: Required for all land transactions
- FCCPC (Federal Competition and Consumer Protection Commission): Consumer protection
- CBN regulations: All property transactions above ₦5M require BVN/NIN verification
- NIESV: Nigerian Institution of Estate Surveyors and Valuers — professional body for agents

PROPERTY TYPES (Nigerian context):
- Detached duplex, semi-detached duplex, terrace/townhouse
- Flat/apartment (self-contained, 1-bed, 2-bed, 3-bed, penthouse)
- Bungalow, storey building
- Land (residential, commercial, industrial)
- Short-let apartments (Airbnb-style)

FINANCING:
- Mortgage rates in Nigeria: typically 15-25% per annum (very high vs. global)
- Federal Mortgage Bank of Nigeria (FMBN): Government-backed mortgages at lower rates
- National Housing Fund (NHF): Contributory scheme for Nigerians
- Most transactions are cash or bank transfer — mortgages are uncommon (<5% of transactions)

DIASPORA CONSIDERATIONS:
- Many Nigerians in the UK, US, Canada buy property in Nigeria as investment
- Typical diaspora investment: ₦30M-₦200M range
- Key concerns: title verification, trusted agent, escrow, remote management

IMPORTANT GUARDRAILS:
- Always recommend professional legal advice for transactions
- Never guarantee property prices or investment returns
- Recommend title verification (C of O check) before any purchase
- Flag suspicious listings (prices far below market)
- Recommend NIESV-registered agents
"""

INTENT_PATTERNS = {
    "property_search": [
        r"\b(find|search|looking for|want|need|show me|list)\b.*\b(property|house|flat|apartment|land|duplex|bungalow)\b",
        r"\b(3|4|5|6)\s*bed(room)?s?\b",
        r"\b(buy|rent|lease)\b.*\b(in|at|around|near)\b",
        r"\bhow much.*\b(property|house|flat|land)\b",
    ],
    "valuation": [
        r"\b(worth|value|price|cost|how much)\b.*\b(property|house|land|flat)\b",
        r"\b(valuation|appraisal|estimate|AVM)\b",
        r"\bprice per sqm\b",
    ],
    "legal": [
        r"\b(C of O|certificate of occupancy|deed|title|governor.?s consent|survey plan)\b",
        r"\b(legal|lawyer|solicitor|documentation|due diligence)\b",
        r"\b(fraud|scam|fake|verify|verification)\b",
    ],
    "financing": [
        r"\b(mortgage|loan|financing|NHF|FMBN|interest rate|down payment)\b",
        r"\b(afford|budget|installment|payment plan)\b",
    ],
    "investment": [
        r"\b(invest|ROI|return|yield|rental income|appreciation|capital gain)\b",
        r"\b(diaspora|overseas|abroad|UK|US|Canada)\b.*\b(buy|invest|property)\b",
        r"\b(best area|hotspot|emerging|up and coming)\b",
    ],
    "agent_search": [
        r"\b(agent|realtor|broker|NIESV)\b",
        r"\b(recommend|find me|need a)\b.*\b(agent|realtor)\b",
    ],
}

LANGUAGE_PATTERNS = {
    "yo": [r"\b(ẹ|ọ|àbí|bẹẹni|rara|ilé|ilú|owó)\b", r"\b(Yoruba|Yorùbá)\b"],
    "ha": [r"\b(gida|kudi|birnin|Hausa|Arewa)\b"],
    "ig": [r"\b(ụlọ|ego|obodo|Igbo|Ibo)\b"],
}

LANGUAGE_SYSTEM_ADDONS = {
    "yo": "\n\nRespond in Yoruba (Yorùbá). Use proper Yoruba diacritical marks.",
    "ha": "\n\nRespond in Hausa. Use standard written Hausa.",
    "ig": "\n\nRespond in Igbo. Use standard written Igbo.",
    "en": "",
}


# ── Models ────────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    user_id: Optional[str] = None
    language: Optional[str] = None  # "en" | "yo" | "ha" | "ig"
    context: Optional[str] = None   # "property_search" | "valuation" | etc.


class ChatResponse(BaseModel):
    session_id: str
    message: str
    intent: Optional[str]
    language: str
    extracted_search: Optional[Dict[str, Any]]
    suggested_actions: List[str]
    response_time_ms: int


class SessionInfo(BaseModel):
    session_id: str
    user_id: Optional[str]
    message_count: int
    created_at: str
    last_active: str
    detected_language: str
    primary_intent: Optional[str]


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Nigerian Real Estate AI", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Redis client (graceful fallback to in-memory)
_redis_client: Optional[redis.Redis] = None
_memory_sessions: Dict[str, Any] = {}  # Fallback when Redis unavailable


def get_redis() -> Optional[redis.Redis]:
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
            _redis_client.ping()
            logger.info("Redis connected")
        except Exception as e:
            logger.warning(f"Redis unavailable ({e}), using in-memory sessions")
            _redis_client = None
    return _redis_client


# ── Session management ────────────────────────────────────────────────────────
def session_key(session_id: str) -> str:
    return f"ai_session:{session_id}"


def load_session(session_id: str) -> Dict[str, Any]:
    r = get_redis()
    if r:
        raw = r.get(session_key(session_id))
        if raw:
            return json.loads(raw)
    else:
        return _memory_sessions.get(session_id, {})
    return {}


def save_session(session_id: str, data: Dict[str, Any]):
    r = get_redis()
    serialized = json.dumps(data)
    if r:
        r.setex(session_key(session_id), SESSION_TTL_SECONDS, serialized)
    else:
        _memory_sessions[session_id] = data


def create_session(user_id: Optional[str] = None) -> Dict[str, Any]:
    session = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "messages": [],
        "created_at": datetime.utcnow().isoformat(),
        "last_active": datetime.utcnow().isoformat(),
        "detected_language": "en",
        "primary_intent": None,
        "extracted_preferences": {},
    }
    save_session(session["session_id"], session)
    return session


# ── Intent classification ─────────────────────────────────────────────────────
def classify_intent(text: str) -> Optional[str]:
    text_lower = text.lower()
    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return intent
    return None


def detect_language(text: str) -> str:
    for lang, patterns in LANGUAGE_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return lang
    return "en"


def extract_search_params(text: str) -> Optional[Dict[str, Any]]:
    """Extract structured property search parameters from natural language."""
    params: Dict[str, Any] = {}

    # Bedrooms
    bed_match = re.search(r"(\d+)\s*(?:bed(?:room)?s?|BR)", text, re.IGNORECASE)
    if bed_match:
        params["bedrooms"] = int(bed_match.group(1))

    # Bathrooms
    bath_match = re.search(r"(\d+)\s*(?:bath(?:room)?s?|toilet)", text, re.IGNORECASE)
    if bath_match:
        params["bathrooms"] = int(bath_match.group(1))

    # City
    cities = ["Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan", "Enugu",
              "Benin City", "Kaduna", "Warri", "Calabar", "Owerri", "Uyo"]
    for city in cities:
        if city.lower() in text.lower():
            params["city"] = city
            break

    # Neighbourhoods
    neighbourhoods = [
        "Victoria Island", "Ikoyi", "Lekki Phase 1", "Lekki Phase 2", "Banana Island",
        "Ikeja GRA", "Magodo", "Surulere", "Yaba", "Ajah", "Sangotedo",
        "Maitama", "Asokoro", "Wuse 2", "Gwarinpa", "Jabi", "Garki",
        "GRA", "Trans Amadi", "Rumuola",
    ]
    for nb in neighbourhoods:
        if nb.lower() in text.lower():
            params["neighbourhood"] = nb
            break

    # Listing type
    if re.search(r"\brent\b|\blease\b|\bshort.?let\b", text, re.IGNORECASE):
        params["listingType"] = "rent"
    elif re.search(r"\bbuy\b|\bpurchase\b|\bfor sale\b", text, re.IGNORECASE):
        params["listingType"] = "sale"

    # Property type
    type_map = {
        "duplex": "duplex", "apartment": "apartment", "flat": "apartment",
        "bungalow": "bungalow", "land": "land", "commercial": "commercial",
        "terrace": "terrace", "mansion": "mansion", "penthouse": "penthouse",
    }
    for keyword, ptype in type_map.items():
        if keyword in text.lower():
            params["propertyType"] = ptype
            break

    # Budget
    budget_patterns = [
        (r"₦\s*([\d,]+)\s*M(?:illion)?", 1_000_000),
        (r"([\d,]+)\s*M(?:illion)?\s*(?:naira|NGN|₦)?", 1_000_000),
        (r"₦\s*([\d,]+)(?:,000)?(?!\s*M)", 1),
        (r"\$\s*([\d,]+)\s*K", 1000 * 1600),  # USD to NGN
        (r"\$\s*([\d,]+)\s*M", 1_000_000 * 1600),
    ]
    for pattern, multiplier in budget_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(",", "")
            try:
                params["maxPrice"] = int(float(amount_str) * multiplier)
                break
            except ValueError:
                pass

    return params if params else None


def build_suggested_actions(intent: Optional[str], extracted: Optional[Dict]) -> List[str]:
    """Generate contextual action suggestions based on intent."""
    actions = []
    if intent == "property_search":
        actions = ["Search properties", "Set price alert", "Save search", "View on map"]
        if extracted and extracted.get("city"):
            actions.insert(0, f"Search in {extracted['city']}")
    elif intent == "valuation":
        actions = ["Get AI valuation", "View comparable sales", "Request agent appraisal"]
    elif intent == "legal":
        actions = ["Find a solicitor", "Request title verification", "Download C of O checklist"]
    elif intent == "financing":
        actions = ["Calculate mortgage", "Check NHF eligibility", "Compare lenders"]
    elif intent == "investment":
        actions = ["View investment hotspots", "Calculate rental yield", "Talk to investment advisor"]
    elif intent == "agent_search":
        actions = ["Find verified agents", "View agent ratings", "Request agent callback"]
    else:
        actions = ["Search properties", "Get valuation", "Talk to an agent"]
    return actions[:4]


# ── LLM Integration ───────────────────────────────────────────────────────────
def call_ollama(messages: List[Dict], model: str = OLLAMA_MODEL) -> str:
    """Call local Ollama instance."""
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "top_p": 0.9,
            "num_ctx": 4096,
        },
    }
    resp = requests.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=60)
    resp.raise_for_status()
    return resp.json()["message"]["content"]


def call_openai(messages: List[Dict]) -> str:
    """Fallback to OpenAI-compatible API."""
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "gpt-4o-mini",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1024,
    }
    resp = requests.post(
        f"{OPENAI_BASE_URL}/chat/completions",
        json=payload, headers=headers, timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def generate_response(
    messages: List[Dict],
    language: str = "en",
) -> str:
    """Generate AI response, Ollama-first with OpenAI fallback."""
    # Inject language instruction into system message
    lang_addon = LANGUAGE_SYSTEM_ADDONS.get(language, "")
    if lang_addon and messages and messages[0]["role"] == "system":
        messages[0]["content"] += lang_addon

    # Try Ollama first
    try:
        response = call_ollama(messages)
        logger.info(f"Ollama response ({len(response)} chars)")
        return response
    except Exception as e:
        logger.warning(f"Ollama failed ({e}), falling back to OpenAI")

    # Fallback to OpenAI
    if OPENAI_API_KEY:
        try:
            response = call_openai(messages)
            logger.info(f"OpenAI response ({len(response)} chars)")
            return response
        except Exception as e:
            logger.error(f"OpenAI also failed: {e}")

    # Final fallback: rule-based response
    return _rule_based_response(messages[-1]["content"] if messages else "")


def _rule_based_response(user_message: str) -> str:
    """Minimal rule-based fallback when all LLMs are unavailable."""
    intent = classify_intent(user_message)
    if intent == "property_search":
        return ("I can help you find properties in Nigeria. Please tell me: "
                "Which city? How many bedrooms? What is your budget? "
                "Are you looking to buy or rent?")
    elif intent == "valuation":
        return ("For property valuation in Nigeria, I need: the address, "
                "property type, size in sqm, and number of bedrooms. "
                "Our AI will compare with recent sales in the area.")
    elif intent == "legal":
        return ("For Nigerian property legal matters, always verify: "
                "1) Certificate of Occupancy (C of O), "
                "2) Governor's Consent (Lagos), "
                "3) Survey Plan. "
                "Always engage a licensed solicitor before any transaction.")
    elif intent == "financing":
        return ("Nigerian mortgage rates are typically 15-25% per annum. "
                "Consider the Federal Mortgage Bank of Nigeria (FMBN) for "
                "lower-rate government-backed mortgages. Most Nigerian "
                "property transactions are cash-based.")
    else:
        return ("Welcome to the Nigerian Real Estate AI Assistant. "
                "I can help you search for properties, get valuations, "
                "understand legal requirements, or find financing options. "
                "What would you like to know?")


# ── API Endpoints ─────────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    start_time = time.time()

    # Load or create session
    session_id = request.session_id
    if session_id:
        session = load_session(session_id)
        if not session:
            session = create_session(request.user_id)
            session_id = session["session_id"]
    else:
        session = create_session(request.user_id)
        session_id = session["session_id"]

    # Detect language
    language = request.language or detect_language(request.message)
    session["detected_language"] = language

    # Classify intent
    intent = classify_intent(request.message) or request.context
    if intent and not session.get("primary_intent"):
        session["primary_intent"] = intent

    # Extract search parameters
    extracted_search = None
    if intent == "property_search":
        extracted_search = extract_search_params(request.message)
        if extracted_search:
            session["extracted_preferences"].update(extracted_search)

    # Build message history for LLM
    system_message = {
        "role": "system",
        "content": NIGERIAN_MARKET_CONTEXT,
    }

    # Trim history to MAX_HISTORY_MESSAGES
    history = session.get("messages", [])[-MAX_HISTORY_MESSAGES:]

    llm_messages = [system_message] + history + [
        {"role": "user", "content": request.message}
    ]

    # Generate response
    ai_response = generate_response(llm_messages, language=language)

    # Update session
    session["messages"].append({"role": "user", "content": request.message})
    session["messages"].append({"role": "assistant", "content": ai_response})
    session["last_active"] = datetime.utcnow().isoformat()
    save_session(session_id, session)

    # Build suggested actions
    suggested_actions = build_suggested_actions(intent, extracted_search)

    response_time_ms = int((time.time() - start_time) * 1000)
    logger.info(f"Chat response: session={session_id}, intent={intent}, lang={language}, {response_time_ms}ms")

    return ChatResponse(
        session_id=session_id,
        message=ai_response,
        intent=intent,
        language=language,
        extracted_search=extracted_search,
        suggested_actions=suggested_actions,
        response_time_ms=response_time_ms,
    )


@app.post("/session/new")
async def new_session(user_id: Optional[str] = None):
    session = create_session(user_id)
    return {"session_id": session["session_id"], "created_at": session["created_at"]}


@app.get("/session/{session_id}", response_model=SessionInfo)
async def get_session(session_id: str):
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionInfo(
        session_id=session_id,
        user_id=session.get("user_id"),
        message_count=len(session.get("messages", [])),
        created_at=session.get("created_at", ""),
        last_active=session.get("last_active", ""),
        detected_language=session.get("detected_language", "en"),
        primary_intent=session.get("primary_intent"),
    )


@app.get("/session/{session_id}/history")
async def get_history(session_id: str):
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session_id,
        "messages": session.get("messages", []),
        "extracted_preferences": session.get("extracted_preferences", {}),
    }


@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    r = get_redis()
    if r:
        r.delete(session_key(session_id))
    else:
        _memory_sessions.pop(session_id, None)
    return {"success": True, "session_id": session_id}


@app.get("/health")
async def health():
    # Check Ollama
    ollama_ok = False
    ollama_models = []
    try:
        resp = requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        if resp.ok:
            ollama_ok = True
            ollama_models = [m["name"] for m in resp.json().get("models", [])]
    except Exception:
        pass

    # Check Redis
    redis_ok = False
    try:
        r = get_redis()
        if r:
            r.ping()
            redis_ok = True
    except Exception:
        pass

    return {
        "status": "healthy",
        "ollama": {"available": ollama_ok, "models": ollama_models, "preferred": OLLAMA_MODEL},
        "redis": {"available": redis_ok},
        "openai_fallback": bool(OPENAI_API_KEY),
        "session_ttl_seconds": SESSION_TTL_SECONDS,
        "max_history_messages": MAX_HISTORY_MESSAGES,
    }


@app.get("/models")
async def list_models():
    """List available Ollama models."""
    try:
        resp = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if resp.ok:
            models = resp.json().get("models", [])
            return {"models": models, "current": OLLAMA_MODEL}
    except Exception:
        pass
    return {"models": [], "current": OLLAMA_MODEL, "error": "Ollama unavailable"}


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5100"))
    logger.info(f"Starting Nigerian Real Estate AI on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

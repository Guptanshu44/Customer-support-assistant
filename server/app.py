"""
server/app.py — Flask + Socket.IO backend server with Session History, Custom Customer creation & Deletion.

Endpoints:
  GET    /                        — Serve the frontend
  GET    /api/status              — Health check & active engine
  GET    /api/sessions            — List all conversation sessions/tickets
  GET    /api/session/<id>        — Get full transcript & turns for a session
  POST   /api/session/new         — Create a new session/ticket (custom or preset)
  DELETE /api/session/<id>        — Delete a specific session
  POST   /api/session/reset       — Clear turns for a session
  POST   /api/coach               — Process turn & return coaching
  POST   /api/knowledge/search    — Search knowledge base
  GET    /api/supervisor/stats    — Supervisor metrics
  GET    /api/history             — Full persistent session history (all sessions + turns)
"""

import os
import sys
import time
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, send_from_directory, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from coaching_assistant.models import ConversationState
from server.knowledge_base import get_knowledge_base
from server.database import (
    init_db, save_session, save_turn, update_session_meta,
    delete_session as db_delete_session, clear_turns,
    load_all_sessions, load_turns, load_full_history, get_session_count,
    # Novel Feature DB helpers
    save_fingerprint, load_all_fingerprints,
    log_agent_turn, load_agent_habit_history,
)

# Novel Feature modules
from coaching_assistant.burnout_detector import AgentBurnoutDetector
from coaching_assistant.momentum_forecaster import ConversationMomentumForecaster
from coaching_assistant.habit_coach import MicroHabitCoach
from coaching_assistant.clv_risk import CLVRiskScorer
from coaching_assistant.dna_fingerprint import ConversationDNAMatcher, build_fingerprint

_frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
_frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
_static_folder = _frontend_dist if os.path.isdir(_frontend_dist) else _frontend_dir

app = Flask(__name__, static_folder=_static_folder, static_url_path="")
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "coaching-secret-2024")

CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# ------------------------------------------------------------------ #
# Session Storage & Management                                        #
# ------------------------------------------------------------------ #

session_counter = 8492
customer_pool = [
    {"name": "Alex Morgan", "email": "alex.morgan@company.io", "plan": "Pro Annual", "value": "$1,240 / yr", "initial_msg": "Hello, I just noticed my account was debited twice for the renewal subscription! Please fix this immediately."},
    {"name": "Jessica Taylor", "email": "j.taylor@techhub.net", "plan": "Enterprise Plus", "value": "$3,600 / yr", "initial_msg": "Hi, I wanted to ask if you offer volume discounts on additional user seats for our team."},
    {"name": "Liam Vance", "email": "liam.vance@gmail.com", "plan": "Starter Monthly", "value": "$240 / yr", "initial_msg": "My package tracking shows delivered, but I have not received it yet. Can someone check?"},
    {"name": "Elena Rostova", "email": "elena.r@innovate.co", "plan": "Pro Annual", "value": "$1,450 / yr", "initial_msg": "Thank you so much for the prompt refund! Everything looks resolved now."}
]

sessions_store: dict = {}
supervisor_stats = {
    "total_turns": 0,
    "avg_tone": 0,
    "avg_empathy": 0,
    "avg_clarity": 0,
    "escalations": 0,
    "score_history": []
}


def _create_initial_session():
    """Create the default welcome session only if no sessions exist in DB yet."""
    sess_id = f"TK-{session_counter}"
    cust = customer_pool[0]
    entry = {
        "id": sess_id,
        "title": "Duplicate Renewal Charge Resolution",
        "customer": cust,
        "created_at": datetime.now().strftime("%I:%M %p"),
        "updated_at": datetime.now().strftime("%I:%M %p"),
        "state": ConversationState(),
        "turns": [],
        "last_sentiment": "negative",
        "last_urgency": "high",
        # Novel Feature instances (per session)
        "burnout_detector":   AgentBurnoutDetector(),
        "momentum_forecaster": ConversationMomentumForecaster(sess_id),
    }
    sessions_store[sess_id] = entry
    save_session(entry)          # persist to SQLite
    return sess_id


def _bootstrap_from_db():
    """
    On startup: load all previously-saved sessions from SQLite.
    Rebuilds ConversationState from stored turns so multi-turn
    LLM context is preserved across restarts.
    """
    global session_counter
    saved = load_all_sessions()
    for s in saved:
        turns = load_turns(s["id"])
        state = ConversationState()
        for t in turns:
            state.add_message("customer", t["customer_message"])
            state.add_message("agent",    t["agent_message"])

        # Track highest session counter so new IDs don't collide
        try:
            num = int(s["id"].split("-")[1])
            if num > session_counter:
                session_counter = num
        except (IndexError, ValueError):
            pass

        sessions_store[s["id"]] = {
            "id":            s["id"],
            "title":         s["title"],
            "customer":      s["customer"],
            "created_at":    s["created_at"],
            "updated_at":    s["updated_at"],
            "state":         state,
            "turns":         turns,
            "last_sentiment": s["last_sentiment"],
            "last_urgency":   s["last_urgency"],
            # Novel Feature instances (re-created per session on bootstrap)
            "burnout_detector":    AgentBurnoutDetector(),
            "momentum_forecaster": ConversationMomentumForecaster(s["id"]),
        }
    return len(saved)


# ── Startup: init DB → load saved sessions → create default if empty ───────
init_db()
loaded_count = _bootstrap_from_db()
print(f"  [DB] Loaded {loaded_count} session(s) from history")

if loaded_count == 0:
    default_session_id = _create_initial_session()
else:
    default_session_id = next(iter(sessions_store.keys()))


def get_coach():
    """Get the AI coach (Groq, Claude, or HuggingFace fallback)."""
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    kb = get_knowledge_base()

    if groq_key and groq_key not in ("your_groq_api_key_here", "your_api_key_here"):
        try:
            from coaching_assistant.coach import AICoach
            coach = AICoach(knowledge_base=kb, provider="groq")
            return coach, "groq"
        except Exception as e:
            print(f"Groq init failed: {e}")

    if anthropic_key and anthropic_key not in ("your_anthropic_api_key_here", "your_api_key_here"):
        try:
            from coaching_assistant.coach import AICoach
            coach = AICoach(knowledge_base=kb, provider="claude")
            return coach, "claude"
        except Exception as e:
            print(f"Claude init failed: {e}")

    from coaching_assistant.hf_coach import HFCoach
    return HFCoach(), "hf"


_coach, _coach_type = get_coach()


# ------------------------------------------------------------------ #
# HTTP Endpoints                                                      #
# ------------------------------------------------------------------ #

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/status")
def status():
    return jsonify({
        "status": "running",
        "coach_type": _coach_type,
        "provider": _coach_type,
        "knowledge_base": "loaded" if get_knowledge_base()._loaded else "not loaded"
    })


@app.route("/api/sessions", methods=["GET"])
def list_sessions():
    """List all active sessions/tickets."""
    summary_list = []
    for s_id, s in sessions_store.items():
        summary_list.append({
            "id": s_id,
            "title": s.get("title", f"Ticket #{s_id}"),
            "customer_name": s["customer"]["name"],
            "customer_plan": s["customer"]["plan"],
            "turns_count": len(s["turns"]),
            "last_sentiment": s.get("last_sentiment", "neutral"),
            "last_urgency": s.get("last_urgency", "low"),
            "updated_at": s.get("updated_at", "")
        })
    return jsonify({"sessions": summary_list})


@app.route("/api/session/<session_id>", methods=["GET"])
def get_session(session_id):
    """Get full details for a session."""
    if session_id not in sessions_store:
        return jsonify({"error": "Session not found"}), 404
    
    s = sessions_store[session_id]
    return jsonify({
        "id": s["id"],
        "title": s["title"],
        "customer": s["customer"],
        "created_at": s["created_at"],
        "turns": s["turns"],
        "last_sentiment": s.get("last_sentiment", "neutral"),
        "last_urgency": s.get("last_urgency", "low")
    })


@app.route("/api/session/new", methods=["POST"])
def new_session():
    """Create a new ticket/session with preset or custom customer info."""
    global session_counter
    session_counter += 1
    new_id = f"TK-{session_counter}"

    data = request.get_json() or {}
    custom_name = data.get("name", "").strip()
    custom_email = data.get("email", "").strip()
    custom_plan = data.get("plan", "").strip()
    custom_msg = data.get("initial_message", "").strip()
    custom_title = data.get("title", "").strip()

    if custom_name:
        cust = {
            "name": custom_name,
            "email": custom_email or f"{custom_name.lower().replace(' ', '.')}@domain.com",
            "plan": custom_plan or "Pro Tier",
            "value": "$1,200 / yr",
            "initial_msg": custom_msg or "Hello, I need help with my account."
        }
    else:
        cust_idx = (session_counter - 8492) % len(customer_pool)
        cust = customer_pool[cust_idx]

    entry = {
        "id":            new_id,
        "title":         custom_title or f"Support Inquiry #{session_counter}",
        "customer":      cust,
        "created_at":    datetime.now().strftime("%I:%M %p"),
        "updated_at":    datetime.now().strftime("%I:%M %p"),
        "state":         ConversationState(),
        "turns":         [],
        "last_sentiment": "neutral",
        "last_urgency":   "low",
        # Novel Feature instances (per new session)
        "burnout_detector":    AgentBurnoutDetector(),
        "momentum_forecaster": ConversationMomentumForecaster(new_id),
    }
    sessions_store[new_id] = entry
    save_session(entry)          # ← persist to SQLite

    return jsonify({
        "status": "created",
        "session": {
            "id":             new_id,
            "title":          entry["title"],
            "customer":       cust,
            "created_at":     entry["created_at"],
            "initial_message": cust["initial_msg"]
        }
    })


@app.route("/api/session/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    """Delete a session from memory and SQLite."""
    if session_id in sessions_store:
        del sessions_store[session_id]
        db_delete_session(session_id)   # ← persist deletion to SQLite
        next_id = next(iter(sessions_store.keys()), None)
        return jsonify({
            "status": "deleted",
            "deleted_id": session_id,
            "next_id": next_id
        })
    return jsonify({"error": "Session not found"}), 404


@app.route("/api/session/reset", methods=["POST"])
def reset_session():
    data = request.get_json() or {}
    s_id = data.get("session_id", default_session_id)
    if s_id in sessions_store:
        sessions_store[s_id]["turns"] = []
        sessions_store[s_id]["state"] = ConversationState()
        clear_turns(s_id)               # ← delete turns from SQLite
    return jsonify({"status": "reset", "session_id": s_id})


@app.route("/api/coach", methods=["POST"])
def coach():
    """Process conversation turn and save to session history."""
    data = request.get_json() or {}
    agent_message = data.get("agent_message", "").strip()
    customer_message = data.get("customer_message", "").strip()
    session_id = data.get("session_id", default_session_id)

    if not agent_message or not customer_message:
        return jsonify({"error": "Both customer_message and agent_message are required"}), 400

    if session_id not in sessions_store:
        sessions_store[session_id] = {
            "id": session_id,
            "title": "Customer Support Conversation",
            "customer": customer_pool[0],
            "created_at": datetime.now().strftime("%I:%M %p"),
            "updated_at": datetime.now().strftime("%I:%M %p"),
            "state": ConversationState(),
            "turns": [],
            "last_sentiment": "neutral",
            "last_urgency": "low"
        }

    session = sessions_store[session_id]
    state = session["state"]

    try:
        if _coach_type in ("groq", "claude"):
            result = _coach.process_turn(agent_message, customer_message, state)
        else:
            feedback_list = _coach.generate_coaching_feedback(agent_message, customer_message)
            sentiment = _coach.analyze_sentiment(customer_message)
            intent = _coach.classify_intent(customer_message)
            result = {
                "analysis": {
                    "sentiment": sentiment["label"].lower(),
                    "urgency": "high" if sentiment["label"] == "NEGATIVE" else "low",
                    "escalation_risk": "high" if sentiment["label"] == "NEGATIVE" else "low",
                    "key_issue": intent
                },
                "feedback": {
                    "tone_score": 7,
                    "empathy_score": 6 if "sorry" not in agent_message.lower() else 9,
                    "clarity_score": 8,
                    "coaching_tip": feedback_list[0] if feedback_list else "Clear response provided.",
                    "knowledge_suggestion": feedback_list[1] if len(feedback_list) > 1 else ""
                },
                "compliance": {"violation": False, "issue": "", "suggestion": ""},
                "faq_results": [],
                "latency_seconds": 0.05,
                "provider": "huggingface"
            }
            state.add_message("customer", customer_message)
            state.add_message("agent", agent_message)

        # ── Update in-memory session record ───────────────────────────
        now_str = datetime.now().strftime("%I:%M %p")
        session["updated_at"]    = now_str
        session["last_sentiment"] = result["analysis"].get("sentiment", "neutral")
        session["last_urgency"]   = result["analysis"].get("urgency", "low")

        turn_record = {
            "customer_message": customer_message,
            "agent_message":    agent_message,
            "result":           result,
            "timestamp":        now_str,
        }
        session["turns"].append(turn_record)

        # ── Persist to SQLite ─────────────────────────────────────────
        save_turn(session_id, turn_record)
        update_session_meta(
            session_id,
            now_str,
            session["last_sentiment"],
            session["last_urgency"]
        )

        _update_supervisor_stats(result["feedback"])

        # ── Novel Feature 1: Burnout Detection ───────────────────────────
        burnout_detector = session.get("burnout_detector")
        if burnout_detector:
            burnout_detector.observe(agent_message)
            burnout = burnout_detector.analyze()
            result["burnout"] = burnout

        # ── Novel Feature 2: Momentum Forecast ───────────────────────────
        momentum_forecaster = session.get("momentum_forecaster")
        if momentum_forecaster:
            momentum_forecaster.record_turn(
                result["analysis"],
                result["feedback"]
            )
            result["momentum"] = momentum_forecaster.forecast()

        # ── Novel Feature 4: CLV Risk Score ──────────────────────────────
        clv = CLVRiskScorer.score(
            customer=session["customer"],
            analysis=result["analysis"],
            turns=session["turns"],
            key_issue=result["analysis"].get("key_issue", ""),
            customer_message=customer_message,
        )
        result["clv_risk"] = clv

        # ── Novel Feature 5: Update DNA Fingerprint ───────────────────────
        try:
            fp = build_fingerprint(session["turns"])
            if fp:
                save_fingerprint(session_id, fp, {
                    "title":          session.get("title", ""),
                    "customer_name":  session["customer"].get("name", ""),
                    "last_sentiment": session["last_sentiment"],
                    "last_urgency":   session["last_urgency"],
                    "turns_count":    len(session["turns"]),
                    "summary":        result["analysis"].get("key_issue", ""),
                })
        except Exception as fp_err:
            print(f"DNA fingerprint save warning: {fp_err}")

        # ── Novel Feature 3: Log agent turn to habit log ─────────────────
        try:
            agent_id = data.get("agent_id", "default_agent")
            fb = result["feedback"]
            log_agent_turn(
                agent_id=agent_id,
                session_id=session_id,
                tone_score=fb.get("tone_score", 5),
                empathy_score=fb.get("empathy_score", 5),
                clarity_score=fb.get("clarity_score", 5),
                coaching_tip=fb.get("coaching_tip", ""),
                timestamp=now_str,
            )
        except Exception as habit_err:
            print(f"Habit log warning: {habit_err}")

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/supervisor/stats")
def supervisor_stats_endpoint():
    return jsonify(supervisor_stats)


@app.route("/api/history", methods=["GET"])
def full_history():
    """
    GET /api/history
    Returns every persisted session with its complete turn history,
    ordered newest-first. Useful for analytics, export, or history panel.
    """
    history = load_full_history()
    # Enrich each session with a turn count
    for s in history:
        s["turns_count"] = len(s.get("turns", []))
    return jsonify({
        "total_sessions": len(history),
        "sessions": history
    })



# ─────────────────────────────────────────────────────────────────────────────
# Novel Feature Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/session/<session_id>/burnout", methods=["GET"])
def session_burnout(session_id):
    """
    GET /api/session/<id>/burnout
    Feature 1 — Agent Burnout & Stress Detector.
    Returns the current burnout index and risk for the agent handling this session.

    Response:
        burnout_index    : 0-100 composite stress score
        burnout_risk     : "low" | "moderate" | "high" | "critical"
        signals          : breakdown of each contributing signal
        supervisor_action: recommended action for the supervisor
    """
    if session_id not in sessions_store:
        return jsonify({"error": "Session not found"}), 404
    session = sessions_store[session_id]
    detector = session.get("burnout_detector")
    if not detector:
        return jsonify({"error": "Burnout detector not initialized for this session"}), 500
    return jsonify(detector.analyze())


@app.route("/api/session/<session_id>/momentum", methods=["GET"])
def session_momentum(session_id):
    """
    GET /api/session/<id>/momentum
    Feature 2 — Conversation Momentum Forecaster.
    Predicts whether this conversation will resolve, escalate, or stalemate.

    Response:
        outcome_prediction  : "resolution" | "escalation" | "stalemate" | "too_early"
        confidence          : 0-100 percentage
        turns_until_outcome : estimated turns until the predicted outcome
        momentum_signals    : per-axis slope breakdown
        reasoning           : human-readable explanation
    """
    if session_id not in sessions_store:
        return jsonify({"error": "Session not found"}), 404
    session = sessions_store[session_id]
    forecaster = session.get("momentum_forecaster")
    if not forecaster:
        return jsonify({"error": "Momentum forecaster not initialized for this session"}), 500
    return jsonify(forecaster.forecast())


@app.route("/api/agent/habits", methods=["GET"])
def agent_habits():
    """
    GET /api/agent/habits?agent_id=default_agent
    Feature 3 — Micro-Habit Coach.
    Analyses the agent's full coaching history and returns a personalized
    micro-habit card targeting their most persistent weak dimension.

    Response:
        agent_id             : str
        turns_analysed       : int
        weakest_dimension    : "tone" | "empathy" | "clarity"
        avg_scores           : { tone, empathy, clarity }
        top_coaching_themes  : list of recurring keywords from coaching tips
        habit                : { habit, exercise, success_criterion }
    """
    agent_id = request.args.get("agent_id", "default_agent")
    history = load_agent_habit_history(agent_id=agent_id, limit=200)
    coach = MicroHabitCoach(agent_id=agent_id)
    card = coach.generate_habit_card(history)
    return jsonify(card)


@app.route("/api/session/<session_id>/clv-risk", methods=["GET"])
def session_clv_risk(session_id):
    """
    GET /api/session/<id>/clv-risk
    Feature 4 — Customer Lifetime Value Risk Scorer.
    Estimates the dollar-value business risk of mishandling this conversation.

    Response:
        clv_risk          : "low" | "medium" | "high" | "critical"
        churn_probability : 0.0-1.0
        revenue_at_risk   : "$X,XXX"
        annual_plan_value : "$X,XXX"
        issue_type        : detected category
        priority_flag     : bool — whether this ticket should be surfaced to supervisor
        risk_factors      : list of active risk drivers
        retention_tip     : specific retention action for this issue type
    """
    if session_id not in sessions_store:
        return jsonify({"error": "Session not found"}), 404
    session = sessions_store[session_id]
    state = session.get("state", ConversationState())

    # Build a synthetic analysis from latest session state
    analysis = {
        "sentiment":       state.sentiment,
        "urgency":         state.urgency,
        "escalation_risk": state.escalation_risk,
        "key_issue":       state.key_issue,
    }

    result = CLVRiskScorer.score(
        customer=session["customer"],
        analysis=analysis,
        turns=session["turns"],
        key_issue=state.key_issue,
        customer_message=session["turns"][-1]["customer_message"] if session["turns"] else "",
    )
    return jsonify(result)


@app.route("/api/session/<session_id>/similar", methods=["GET"])
def session_similar(session_id):
    """
    GET /api/session/<id>/similar?top_k=3
    Feature 5 — Conversation DNA Fingerprinting.
    Finds the most similar past conversations from history using cosine similarity
    on 30-dimensional behavioral fingerprint vectors.

    Response:
        current_session_id  : str
        fingerprint_dims    : int (30)
        similar_sessions    : list of top-k matches:
            - session_id, title, customer_name
            - similarity (0-100%)
            - match_label
            - last_sentiment, last_urgency, turns_count
            - summary (key issue from that session)
        interpretation      : profile of the current session DNA
    """
    if session_id not in sessions_store:
        return jsonify({"error": "Session not found"}), 404

    top_k = int(request.args.get("top_k", 3))
    session = sessions_store[session_id]

    # Build fingerprint for the current session
    current_fp = build_fingerprint(session["turns"])
    if not current_fp:
        return jsonify({
            "current_session_id": session_id,
            "similar_sessions": [],
            "message": "Not enough turns yet to build a DNA fingerprint (need at least 1 turn).",
        })

    # Load all other stored fingerprints
    stored = load_all_fingerprints(exclude_session_id=session_id)

    matcher = ConversationDNAMatcher()
    similar = matcher.find_similar(current_fp, stored, top_k=top_k)
    interpretation = matcher.interpret(current_fp)

    return jsonify({
        "current_session_id": session_id,
        "fingerprint_dims":   len(current_fp),
        "similar_sessions":   similar,
        "interpretation":     interpretation,
    })


def _update_supervisor_stats(feedback: dict):
    supervisor_stats["total_turns"] += 1
    supervisor_stats["score_history"].append({
        "tone": feedback.get("tone_score", 0),
        "empathy": feedback.get("empathy_score", 0),
        "clarity": feedback.get("clarity_score", 0)
    })
    if len(supervisor_stats["score_history"]) > 100:
        supervisor_stats["score_history"] = supervisor_stats["score_history"][-100:]

    history = supervisor_stats["score_history"]
    supervisor_stats["avg_tone"] = round(sum(h["tone"] for h in history) / len(history), 1)
    supervisor_stats["avg_empathy"] = round(sum(h["empathy"] for h in history) / len(history), 1)
    supervisor_stats["avg_clarity"] = round(sum(h["clarity"] for h in history) / len(history), 1)


if __name__ == "__main__":
    kb = get_knowledge_base()
    kb.load()
    port = int(os.getenv("PORT", 5000))
    print(f"\n[Web] CareBot Server running at http://localhost:{port}\n")
    socketio.run(app, host="0.0.0.0", port=port, debug=False, allow_unsafe_werkzeug=True)
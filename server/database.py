"""
server/database.py — SQLite persistence layer for CareBot.

Persists all sessions and conversation turns to a local SQLite database
(sessions.db) so history is never lost across server restarts.

Tables:
    sessions             — session metadata (id, title, customer info, timestamps)
    turns                — individual conversation turns linked to sessions
    session_fingerprints — DNA fingerprint vectors for Conversation DNA Matching (Feature 5)
    agent_habit_log      — per-agent coaching score history for Micro-Habit Coach (Feature 3)
"""

import sqlite3
import json
import os

# ── DB file lives at project root (next to main.py) ───────────────────────
DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "sessions.db"
)


def _connect() -> sqlite3.Connection:
    """Open a DB connection with row_factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ─────────────────────────────────────────────────────────────────────────────
# Schema
# ─────────────────────────────────────────────────────────────────────────────

def init_db():
    """Create tables if they do not already exist."""
    conn = _connect()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id            TEXT PRIMARY KEY,
            title         TEXT,
            customer_json TEXT NOT NULL,
            created_at    TEXT,
            updated_at    TEXT,
            last_sentiment TEXT DEFAULT 'neutral',
            last_urgency   TEXT DEFAULT 'low'
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS turns (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id       TEXT NOT NULL,
            customer_message TEXT,
            agent_message    TEXT,
            result_json      TEXT,
            timestamp        TEXT,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS session_fingerprints (
            session_id   TEXT PRIMARY KEY,
            fingerprint  TEXT NOT NULL,
            title        TEXT,
            customer_name TEXT,
            last_sentiment TEXT DEFAULT 'neutral',
            last_urgency   TEXT DEFAULT 'low',
            turns_count    INTEGER DEFAULT 0,
            summary        TEXT DEFAULT ''
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS agent_habit_log (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id     TEXT NOT NULL DEFAULT 'default_agent',
            session_id   TEXT NOT NULL,
            tone_score   REAL,
            empathy_score REAL,
            clarity_score REAL,
            coaching_tip  TEXT,
            timestamp     TEXT
        )
    """)

    # Enable cascade deletes via foreign keys
    c.execute("PRAGMA foreign_keys = ON")
    conn.commit()
    conn.close()
    print("  [OK] SQLite database initialised:", DB_PATH)


# ─────────────────────────────────────────────────────────────────────────────
# Write operations
# ─────────────────────────────────────────────────────────────────────────────

def save_session(session: dict):
    """
    Insert or replace a session record.
    Expects: id, title, customer (dict), created_at, updated_at,
             last_sentiment, last_urgency.
    """
    conn = _connect()
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("""
        INSERT OR REPLACE INTO sessions
            (id, title, customer_json, created_at, updated_at, last_sentiment, last_urgency)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        session["id"],
        session.get("title", f"Ticket #{session['id']}"),
        json.dumps(session.get("customer", {})),
        session.get("created_at", ""),
        session.get("updated_at", session.get("created_at", "")),
        session.get("last_sentiment", "neutral"),
        session.get("last_urgency", "low"),
    ))
    conn.commit()
    conn.close()


def save_turn(session_id: str, turn: dict):
    """
    Append a new conversation turn to the turns table.
    Expects: customer_message, agent_message, result (dict), timestamp.
    """
    conn = _connect()
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("""
        INSERT INTO turns (session_id, customer_message, agent_message, result_json, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, (
        session_id,
        turn.get("customer_message", ""),
        turn.get("agent_message", ""),
        json.dumps(turn.get("result", {})),
        turn.get("timestamp", ""),
    ))
    conn.commit()
    conn.close()


def update_session_meta(session_id: str, updated_at: str, last_sentiment: str, last_urgency: str):
    """Update only the mutable metadata fields after each coaching turn."""
    conn = _connect()
    conn.execute("""
        UPDATE sessions
        SET updated_at = ?, last_sentiment = ?, last_urgency = ?
        WHERE id = ?
    """, (updated_at, last_sentiment, last_urgency, session_id))
    conn.commit()
    conn.close()


def delete_session(session_id: str):
    """Delete a session and all its turns (cascade)."""
    conn = _connect()
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()


def clear_turns(session_id: str):
    """Delete all turns for a session (reset without deleting the session itself)."""
    conn = _connect()
    conn.execute("DELETE FROM turns WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# Read operations
# ─────────────────────────────────────────────────────────────────────────────

def load_all_sessions() -> list:
    """
    Return all sessions ordered newest first.
    Each entry is a plain dict (no turns — call load_turns separately).
    """
    conn = _connect()
    rows = conn.execute(
        "SELECT * FROM sessions ORDER BY updated_at DESC"
    ).fetchall()
    conn.close()

    sessions = []
    for row in rows:
        sessions.append({
            "id":             row["id"],
            "title":          row["title"],
            "customer":       json.loads(row["customer_json"]),
            "created_at":     row["created_at"],
            "updated_at":     row["updated_at"],
            "last_sentiment": row["last_sentiment"],
            "last_urgency":   row["last_urgency"],
        })
    return sessions


def load_turns(session_id: str) -> list:
    """Return all turns for a session in chronological order."""
    conn = _connect()
    rows = conn.execute(
        "SELECT * FROM turns WHERE session_id = ? ORDER BY id ASC",
        (session_id,)
    ).fetchall()
    conn.close()

    turns = []
    for row in rows:
        turns.append({
            "customer_message": row["customer_message"],
            "agent_message":    row["agent_message"],
            "result":           json.loads(row["result_json"]),
            "timestamp":        row["timestamp"],
        })
    return turns


def load_full_history() -> list:
    """
    Return every session with its complete turn history.
    Used by the /api/history endpoint.
    """
    sessions = load_all_sessions()
    for s in sessions:
        s["turns"] = load_turns(s["id"])
    return sessions


def get_session_count() -> int:
    """Return total number of stored sessions."""
    conn = _connect()
    count = conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
    conn.close()
    return count


# ─────────────────────────────────────────────────────────────────────────────
# Feature 5 — Conversation DNA Fingerprints
# ─────────────────────────────────────────────────────────────────────────────

def save_fingerprint(session_id: str, fingerprint: list, meta: dict):
    """
    Upsert a DNA fingerprint for a session.
    meta should contain: title, customer_name, last_sentiment, last_urgency,
                         turns_count, summary
    """
    import json
    conn = _connect()
    conn.execute("""
        INSERT OR REPLACE INTO session_fingerprints
            (session_id, fingerprint, title, customer_name,
             last_sentiment, last_urgency, turns_count, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session_id,
        json.dumps(fingerprint),
        meta.get("title", ""),
        meta.get("customer_name", ""),
        meta.get("last_sentiment", "neutral"),
        meta.get("last_urgency", "low"),
        meta.get("turns_count", 0),
        meta.get("summary", ""),
    ))
    conn.commit()
    conn.close()


def load_all_fingerprints(exclude_session_id: str = None) -> list:
    """
    Load all stored DNA fingerprints.
    Optionally exclude the current session (so it doesn't match itself).
    """
    import json
    conn = _connect()
    if exclude_session_id:
        rows = conn.execute(
            "SELECT * FROM session_fingerprints WHERE session_id != ?",
            (exclude_session_id,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM session_fingerprints").fetchall()
    conn.close()

    results = []
    for row in rows:
        try:
            fp = json.loads(row["fingerprint"])
        except (TypeError, ValueError):
            fp = []
        results.append({
            "session_id":    row["session_id"],
            "fingerprint":   fp,
            "title":         row["title"],
            "customer_name": row["customer_name"],
            "last_sentiment": row["last_sentiment"],
            "last_urgency":  row["last_urgency"],
            "turns_count":   row["turns_count"],
            "summary":       row["summary"],
        })
    return results


# ─────────────────────────────────────────────────────────────────────────────
# Feature 3 — Agent Habit Log
# ─────────────────────────────────────────────────────────────────────────────

def log_agent_turn(
    agent_id: str,
    session_id: str,
    tone_score: float,
    empathy_score: float,
    clarity_score: float,
    coaching_tip: str,
    timestamp: str,
):
    """Append one scored turn to the agent's habit log."""
    conn = _connect()
    conn.execute("""
        INSERT INTO agent_habit_log
            (agent_id, session_id, tone_score, empathy_score, clarity_score, coaching_tip, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (agent_id, session_id, tone_score, empathy_score, clarity_score, coaching_tip, timestamp))
    conn.commit()
    conn.close()


def load_agent_habit_history(agent_id: str = "default_agent", limit: int = 200) -> list:
    """
    Return the most recent N turns for an agent from the habit log.
    Formatted as a list of dicts compatible with MicroHabitCoach.generate_habit_card().
    """
    conn = _connect()
    rows = conn.execute("""
        SELECT tone_score, empathy_score, clarity_score, coaching_tip, timestamp, session_id
        FROM agent_habit_log
        WHERE agent_id = ?
        ORDER BY id DESC
        LIMIT ?
    """, (agent_id, limit)).fetchall()
    conn.close()

    results = []
    for row in rows:
        results.append({
            "result": {
                "feedback": {
                    "tone_score":    row["tone_score"],
                    "empathy_score": row["empathy_score"],
                    "clarity_score": row["clarity_score"],
                    "coaching_tip":  row["coaching_tip"] or "",
                }
            },
            "timestamp":  row["timestamp"],
            "session_id": row["session_id"],
        })
    return results

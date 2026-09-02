"""
dna_fingerprint.py — Conversation DNA Fingerprinting

Creates a unique behavioral fingerprint for each conversation using
statistical signal patterns, then finds the most similar PAST RESOLVED
conversation and surfaces its resolution strategy.

Novel Logic — Case-Based Reasoning for Customer Support:
  1. Per-turn feature vector: [sentiment, urgency, escalation, empathy, clarity, tone] (6 dims)
  2. Session DNA = column-wise statistics across all turn vectors:
       [mean, std, min, max, trend_slope] per dimension = 30-dim fingerprint
  3. Cosine similarity between current session fingerprint and all stored fingerprints
  4. Returns Top-3 most similar past sessions with their outcome context

Zero LLM cost. Gets smarter the more sessions are stored — self-improving system.
"""

import math
from typing import List, Dict, Optional, Tuple


# ── Feature axis definitions ───────────────────────────────────────────────
_SENTIMENT_MAP = {"positive": 1.0, "neutral": 0.5, "negative": 0.0, "unknown": 0.5}
_URGENCY_MAP   = {"low": 0.0, "medium": 0.5, "high": 1.0, "unknown": 0.5}
_RISK_MAP      = {"low": 0.0, "medium": 0.5, "high": 1.0, "unknown": 0.5}


def _turn_to_vector(turn: Dict) -> List[float]:
    """
    Convert a stored turn dict into a 6-dimensional feature vector.
    All values normalized to [0.0, 1.0].
    """
    result   = turn.get("result", {})
    analysis = result.get("analysis", {})
    feedback = result.get("feedback", {})

    sentiment  = _SENTIMENT_MAP.get(analysis.get("sentiment",  "neutral"), 0.5)
    urgency    = _URGENCY_MAP.get(analysis.get("urgency",    "low"),     0.0)
    escalation = _RISK_MAP.get(analysis.get("escalation_risk", "low"),  0.0)
    empathy    = feedback.get("empathy_score", 5) / 10.0
    clarity    = feedback.get("clarity_score", 5) / 10.0
    tone       = feedback.get("tone_score",    5) / 10.0

    return [sentiment, urgency, escalation, empathy, clarity, tone]


def _slope(values: List[float]) -> float:
    """Simple linear slope: (last - first) / max(n-1, 1)."""
    if len(values) < 2:
        return 0.0
    return (values[-1] - values[0]) / (len(values) - 1)


def _column_stats(matrix: List[List[float]]) -> List[float]:
    """
    Given a list of equal-length vectors (rows), compute per-column
    [mean, std, min, max, slope] statistics.
    Returns a flat vector of length = n_cols * 5.
    """
    if not matrix:
        return []

    n_cols = len(matrix[0])
    result = []

    for col in range(n_cols):
        col_vals = [row[col] for row in matrix]
        n = len(col_vals)
        mean = sum(col_vals) / n
        variance = sum((v - mean) ** 2 for v in col_vals) / n
        std = math.sqrt(variance)
        col_min = min(col_vals)
        col_max = max(col_vals)
        slope = _slope(col_vals)

        result.extend([mean, std, col_min, col_max, slope])

    return result


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """
    Cosine similarity between two equal-length vectors.
    Returns 0.0 if either vector is zero.
    """
    if len(a) != len(b) or not a:
        return 0.0

    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))

    if mag_a == 0.0 or mag_b == 0.0:
        return 0.0
    return dot / (mag_a * mag_b)


def build_fingerprint(turns: List[Dict]) -> Optional[List[float]]:
    """
    Build a 30-dimensional fingerprint vector from a session's turn list.
    Returns None if the session has no turns.
    """
    if not turns:
        return None

    matrix = [_turn_to_vector(t) for t in turns]
    return _column_stats(matrix)


class ConversationDNAMatcher:
    """
    Computes a session DNA fingerprint and matches it against stored fingerprints.

    Usage:
        matcher = ConversationDNAMatcher()
        # Build fingerprint for current session
        fp = matcher.build(current_session_turns)
        # Find similar past sessions
        matches = matcher.find_similar(fp, stored_fingerprints, top_k=3)
    """

    @staticmethod
    def build(turns: List[Dict]) -> Optional[List[float]]:
        """Build a DNA fingerprint for the given turns list."""
        return build_fingerprint(turns)

    @staticmethod
    def find_similar(
        current_fingerprint: List[float],
        stored_sessions: List[Dict],
        top_k: int = 3
    ) -> List[Dict]:
        """
        Find the most similar past sessions using cosine similarity.

        Args:
            current_fingerprint : 30-dim vector for the current session
            stored_sessions     : list of dicts, each must have:
                                  'session_id', 'fingerprint' (List[float]),
                                  'title', 'customer_name', 'last_sentiment',
                                  'last_urgency', 'turns_count', 'summary'
            top_k               : number of similar sessions to return

        Returns:
            List of top-k match dicts sorted by similarity (highest first).
        """
        if not current_fingerprint or not stored_sessions:
            return []

        scored = []
        for session in stored_sessions:
            fp = session.get("fingerprint")
            if not fp or len(fp) != len(current_fingerprint):
                continue
            similarity = _cosine_similarity(current_fingerprint, fp)
            scored.append((similarity, session))

        scored.sort(key=lambda x: x[0], reverse=True)

        results = []
        for similarity, session in scored[:top_k]:
            results.append({
                "session_id":    session.get("session_id", "unknown"),
                "title":         session.get("title", "Past Conversation"),
                "customer_name": session.get("customer_name", "Unknown"),
                "similarity":    round(similarity * 100, 1),    # as percentage
                "last_sentiment": session.get("last_sentiment", "neutral"),
                "last_urgency":  session.get("last_urgency", "low"),
                "turns_count":   session.get("turns_count", 0),
                "summary":       session.get("summary", "No summary available."),
                "match_label":   _match_label(similarity),
            })

        return results

    @staticmethod
    def interpret(fingerprint: List[float]) -> Dict:
        """
        Human-readable interpretation of a DNA fingerprint.
        Extracts the dominant patterns from the 30-dim vector.
        """
        if not fingerprint or len(fingerprint) < 30:
            return {"summary": "Fingerprint unavailable."}

        # Each dimension is [mean, std, min, max, slope] for:
        # [sentiment, urgency, escalation, empathy, clarity, tone]
        labels = ["sentiment", "urgency", "escalation", "empathy", "clarity", "tone"]
        stats = ["mean", "std", "min", "max", "slope"]

        interpretation = {}
        for i, label in enumerate(labels):
            base = i * 5
            interpretation[label] = {
                s: round(fingerprint[base + j], 3)
                for j, s in enumerate(stats)
            }

        # Derive high-level characterization
        sent_mean  = interpretation["sentiment"]["mean"]
        esc_mean   = interpretation["escalation"]["mean"]
        emp_slope  = interpretation["empathy"]["slope"]
        esc_slope  = interpretation["escalation"]["slope"]

        if sent_mean > 0.6 and esc_mean < 0.3:
            profile = "Smooth Resolution — Customer was positive, low escalation throughout."
        elif sent_mean < 0.35 and esc_mean > 0.55:
            profile = "High-Tension Session — Customer distressed, escalation risk elevated."
        elif emp_slope > 0.05 and esc_slope < -0.05:
            profile = "Successful De-escalation — Agent improved empathy and reduced risk over time."
        elif esc_slope > 0.05:
            profile = "Deteriorating Session — Escalation risk increased over conversation."
        else:
            profile = "Neutral Pattern — Mixed signals, no clear dominant trend."

        return {
            "profile":           profile,
            "dimension_details": interpretation,
        }


def _match_label(similarity: float) -> str:
    """Convert a cosine similarity score to a human-readable match label."""
    if similarity > 0.92:
        return "Highly Similar"
    elif similarity > 0.78:
        return "Very Similar"
    elif similarity > 0.60:
        return "Somewhat Similar"
    else:
        return "Loosely Similar"

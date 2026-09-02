"""
momentum_forecaster.py — Conversation Momentum Forecaster

Predicts whether a conversation will RESOLVE positively or ESCALATE
to a human manager within the next 1-3 turns, with a confidence score.

Novel Logic (linear regression on per-turn signal time-series):
  - Builds a rolling multi-axis Momentum Vector per session
  - Applies SciPy linregress to detect slope on each signal axis
  - Cross-references slope patterns against empirical decision rules
  - Outputs: outcome prediction + confidence + turns_until_outcome

Signal Axes (all normalized to 0.0 - 1.0):
  sentiment_score   : positive=1.0, neutral=0.5, negative=0.0
  urgency_score     : low=0.0, medium=0.5, high=1.0
  escalation_score  : low=0.0, medium=0.5, high=1.0
  empathy_score     : 0.0 - 1.0  (from feedback / 10)
  clarity_score     : 0.0 - 1.0  (from feedback / 10)
"""

from typing import List, Dict, Optional, Tuple

# SciPy is a standard scientific Python package (likely already in requirements)
# If not present, fall back to a manual slope calculator
try:
    from scipy import stats as _scipy_stats
    _USE_SCIPY = True
except ImportError:
    _USE_SCIPY = False


# ── Normalization helpers ──────────────────────────────────────────────────

_SENTIMENT_MAP = {"positive": 1.0, "neutral": 0.5, "negative": 0.0, "unknown": 0.5}
_URGENCY_MAP   = {"low": 0.0, "medium": 0.5, "high": 1.0, "unknown": 0.5}
_RISK_MAP      = {"low": 0.0, "medium": 0.5, "high": 1.0, "unknown": 0.5}


def _linear_slope(values: List[float]) -> float:
    """
    Compute the slope of a linear regression line through the values.
    Positive = improving / worsening trend depending on axis.
    Falls back to a simple first-to-last delta if scipy unavailable.
    """
    n = len(values)
    if n < 2:
        return 0.0
    if _USE_SCIPY:
        slope, _, _, _, _ = _scipy_stats.linregress(range(n), values)
        return float(slope)
    # Manual fallback: (last - first) / (n - 1)
    return (values[-1] - values[0]) / (n - 1)


class ConversationMomentumForecaster:
    """
    Stateful momentum tracker for one conversation session.
    Call .record_turn(analysis, feedback) after each coach API call.
    Call .forecast() to get the outcome prediction.
    """

    def __init__(self, session_id: str = "unknown"):
        self.session_id = session_id
        self.turns: List[Dict] = []   # list of normalized per-turn vectors

    def record_turn(self, analysis: Dict, feedback: Dict) -> None:
        """
        Register one turn worth of signal data.

        Args:
            analysis : dict from process_turn() — must have sentiment, urgency, escalation_risk
            feedback : dict from process_turn() — must have empathy_score, clarity_score
        """
        vector = {
            "sentiment":  _SENTIMENT_MAP.get(analysis.get("sentiment", "neutral"), 0.5),
            "urgency":    _URGENCY_MAP.get(analysis.get("urgency", "low"), 0.5),
            "escalation": _RISK_MAP.get(analysis.get("escalation_risk", "low"), 0.5),
            "empathy":    feedback.get("empathy_score", 5) / 10.0,
            "clarity":    feedback.get("clarity_score", 5) / 10.0,
        }
        self.turns.append(vector)

    def forecast(self) -> Dict:
        """
        Predict conversation outcome based on accumulated signal trajectories.

        Returns:
            {
                "outcome_prediction": "resolution" | "escalation" | "stalemate" | "too_early",
                "confidence": 0-100,
                "turns_until_outcome": 1-5,
                "momentum_signals": { slope breakdown },
                "reasoning": "human-readable explanation"
            }
        """
        n = len(self.turns)

        if n == 0:
            return self._result("too_early", 0, 3, {}, "No turns recorded yet.")
        if n < 2:
            return self._result("too_early", 30, 3, {}, "Need at least 2 turns for prediction.")

        # ── Extract per-axis time series ────────────────────────────────────
        sentiment_series  = [t["sentiment"]  for t in self.turns]
        urgency_series    = [t["urgency"]    for t in self.turns]
        escalation_series = [t["escalation"] for t in self.turns]
        empathy_series    = [t["empathy"]    for t in self.turns]
        clarity_series    = [t["clarity"]    for t in self.turns]

        # ── Compute slopes ──────────────────────────────────────────────────
        s_slope  = _linear_slope(sentiment_series)    # positive = customer calming down
        u_slope  = _linear_slope(urgency_series)      # negative = urgency decreasing = good
        e_slope  = _linear_slope(escalation_series)   # negative = risk decreasing = good
        em_slope = _linear_slope(empathy_series)      # positive = agent getting more empathetic
        cl_slope = _linear_slope(clarity_series)      # positive = agent improving clarity

        # ── Latest absolute values ──────────────────────────────────────────
        last_sentiment  = sentiment_series[-1]
        last_urgency    = urgency_series[-1]
        last_escalation = escalation_series[-1]
        last_empathy    = empathy_series[-1]

        # ── Decision Logic (empirically tuned rules) ────────────────────────
        # Resolution signals: sentiment up, urgency/escalation down, empathy up
        resolution_score = (
            max(s_slope, 0) * 30          +   # sentiment improving
            max(-u_slope, 0) * 25          +   # urgency decreasing
            max(-e_slope, 0) * 25          +   # escalation risk dropping
            max(em_slope, 0) * 10          +   # agent empathy growing
            max(cl_slope, 0) * 10              # agent clarity growing
        )

        # Escalation signals: sentiment down, urgency/escalation up, empathy low & flat
        escalation_score = (
            max(-s_slope, 0) * 30          +
            max(u_slope, 0) * 25           +
            max(e_slope, 0) * 25           +
            (last_escalation > 0.65) * 15  +   # currently in high-risk zone
            (last_empathy < 0.4) * 5           # agent not showing empathy
        )

        # Stalemate: no meaningful slope in any direction
        max_abs_slope = max(abs(s_slope), abs(u_slope), abs(e_slope))
        stalemate_score = 30 if max_abs_slope < 0.05 else 0

        # ── Determine outcome ───────────────────────────────────────────────
        total = max(resolution_score + escalation_score + stalemate_score, 0.001)
        r_conf = resolution_score / total
        e_conf = escalation_score / total
        st_conf = stalemate_score / total

        if r_conf >= e_conf and r_conf >= st_conf:
            outcome = "resolution"
            confidence = round(min(r_conf * 100, 95))
            # Fewer turns remaining when strong positive trend
            turns_left = 1 if r_conf > 0.7 else (2 if r_conf > 0.5 else 3)
            reasoning = (
                f"Customer sentiment is {'improving' if s_slope > 0 else 'stable'}, "
                f"urgency is {'decreasing' if u_slope < 0 else 'holding'}, "
                f"agent empathy is {'growing' if em_slope > 0 else 'consistent'}. "
                f"Conversation is trending toward resolution."
            )
        elif e_conf > r_conf and e_conf >= st_conf:
            outcome = "escalation"
            confidence = round(min(e_conf * 100, 95))
            turns_left = 1 if e_conf > 0.7 else (2 if e_conf > 0.5 else 3)
            reasoning = (
                f"Customer sentiment is {'worsening' if s_slope < 0 else 'not improving'}, "
                f"escalation risk is {'rising' if e_slope > 0 else 'elevated'}, "
                f"empathy score is {'too low' if last_empathy < 0.5 else 'insufficient'}. "
                f"Manager escalation likely within {turns_left} turn(s)."
            )
        else:
            outcome = "stalemate"
            confidence = round(min(st_conf * 100 + 20, 75))
            turns_left = 3
            reasoning = (
                "Conversation signals are flat — no clear improvement or deterioration. "
                "Agent should introduce a proactive resolution offer to break the stalemate."
            )

        momentum_signals = {
            "sentiment_slope":  round(s_slope, 3),
            "urgency_slope":    round(u_slope, 3),
            "escalation_slope": round(e_slope, 3),
            "empathy_slope":    round(em_slope, 3),
            "clarity_slope":    round(cl_slope, 3),
            "current_sentiment":  round(last_sentiment, 2),
            "current_urgency":    round(last_urgency, 2),
            "current_escalation": round(last_escalation, 2),
        }

        return self._result(outcome, confidence, turns_left, momentum_signals, reasoning)

    @staticmethod
    def _result(outcome, confidence, turns, signals, reasoning):
        return {
            "outcome_prediction":   outcome,
            "confidence":           confidence,
            "turns_until_outcome":  turns,
            "momentum_signals":     signals,
            "reasoning":            reasoning,
        }

    def reset(self):
        self.turns.clear()

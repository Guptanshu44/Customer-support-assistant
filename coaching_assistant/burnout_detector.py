"""
burnout_detector.py — Agent Burnout & Stress Detector

Tracks agent writing patterns ACROSS turns within a session to detect
early signs of cognitive fatigue or emotional burnout in real-time.

Novel Logic (zero LLM calls — pure statistical NLP):
  1. Lexical Richness (Type-Token Ratio)  — declining richness = repetitive/copy-paste
  2. Empathy Keyword Density              — drop from baseline = emotional withdrawal
  3. Sentence Brevity Score              — increasingly short blunt replies = burnout
  4. Response Consistency Index          — high variance in reply length = distraction
  5. Composite Burnout Index (0–100)     — weighted sum, threshold-tagged as risk level

Output:
    {
        "burnout_index": 0-100,
        "burnout_risk": "low|moderate|high|critical",
        "signals": { ... breakdown of each signal },
        "supervisor_action": "string recommendation"
    }
"""

import re
import math
from typing import List, Dict, Optional


# ── Known empathy / acknowledgment marker words ────────────────────────────
EMPATHY_MARKERS = {
    "sorry", "apologize", "apologies", "understand", "hear you",
    "frustrating", "inconvenience", "concern", "feel", "appreciate",
    "absolutely", "certainly", "of course", "right away", "immediately",
    "important", "valued", "priority", "help you", "assist you",
    "acknowledge", "empathize", "recognize"
}


def _tokenize(text: str) -> List[str]:
    """Simple whitespace + punctuation tokenizer."""
    return re.findall(r"\b[a-zA-Z']+\b", text.lower())


def _type_token_ratio(tokens: List[str]) -> float:
    """
    Lexical Richness = unique_words / total_words.
    Range: 0.0 (all repeated) → 1.0 (all unique).
    """
    if not tokens:
        return 1.0
    return len(set(tokens)) / len(tokens)


def _empathy_density(text: str) -> float:
    """
    Empathy marker density = empathy_hits / 100 words.
    Normalized to 0.0–1.0 (capped at 1.0).
    """
    tokens = _tokenize(text)
    if not tokens:
        return 0.0
    hits = sum(1 for marker in EMPATHY_MARKERS if marker in text.lower())
    return min(hits / max(len(tokens) / 100, 1), 1.0)


def _brevity_score(text: str) -> float:
    """
    Sentence Brevity Score = 1.0 for very short blunt replies, 0.0 for long warm ones.
    Uses average words per sentence.
    """
    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    if not sentences:
        return 1.0
    avg_words = sum(len(_tokenize(s)) for s in sentences) / len(sentences)
    # < 5 words/sentence = very blunt (score near 1.0); > 20 = warm (score near 0.0)
    return max(0.0, min(1.0, 1.0 - (avg_words - 5) / 15))


class AgentBurnoutDetector:
    """
    Stateful burnout detector for a single agent session.
    Call .observe(agent_message) after each agent turn.
    Call .analyze() to get the current burnout assessment.
    """

    def __init__(self, agent_id: str = "default_agent"):
        self.agent_id = agent_id
        self.turn_signals: List[Dict] = []   # one dict per observed agent turn
        self._baseline_empathy: Optional[float] = None
        self._baseline_ttr: Optional[float] = None

    def observe(self, agent_message: str) -> Dict:
        """
        Register one agent message. Returns per-turn signal dict.
        Call this every time the agent sends a reply.
        """
        tokens = _tokenize(agent_message)
        ttr = _type_token_ratio(tokens)
        empathy = _empathy_density(agent_message)
        brevity = _brevity_score(agent_message)
        word_count = len(tokens)

        # Set baselines from the first observed turn
        if self._baseline_ttr is None:
            self._baseline_ttr = ttr
        if self._baseline_empathy is None:
            self._baseline_empathy = max(empathy, 0.05)   # avoid division by zero

        signal = {
            "turn": len(self.turn_signals) + 1,
            "ttr": round(ttr, 3),
            "empathy_density": round(empathy, 3),
            "brevity_score": round(brevity, 3),
            "word_count": word_count,
        }
        self.turn_signals.append(signal)
        return signal

    def analyze(self) -> Dict:
        """
        Compute the composite Burnout Index from all observed turns.
        Returns a full assessment dict.
        """
        n = len(self.turn_signals)
        if n == 0:
            return self._build_result(0, "low", {}, "No agent turns observed yet.")

        # ── Signal 1: TTR decay (compared to baseline) ─────────────────────
        current_ttr = self.turn_signals[-1]["ttr"]
        ttr_drop = max(0.0, self._baseline_ttr - current_ttr)
        ttr_penalty = min(ttr_drop / 0.3, 1.0)   # 30% drop = max penalty

        # ── Signal 2: Empathy drop (compared to baseline) ──────────────────
        current_empathy = self.turn_signals[-1]["empathy_density"]
        empathy_drop = max(0.0, self._baseline_empathy - current_empathy)
        empathy_penalty = min(empathy_drop / self._baseline_empathy, 1.0)

        # ── Signal 3: Brevity trend (are replies getting shorter?) ─────────
        avg_brevity = sum(s["brevity_score"] for s in self.turn_signals) / n
        recent_brevity = self.turn_signals[-1]["brevity_score"]
        brevity_penalty = recent_brevity   # already 0-1; high = blunt = bad

        # ── Signal 4: Word count variance (inconsistency = distraction) ────
        counts = [s["word_count"] for s in self.turn_signals]
        if n > 1:
            mean_wc = sum(counts) / n
            variance = sum((c - mean_wc) ** 2 for c in counts) / n
            cv = math.sqrt(variance) / max(mean_wc, 1)   # coefficient of variation
            consistency_penalty = min(cv / 1.0, 1.0)
        else:
            consistency_penalty = 0.0

        # ── Composite Burnout Index (weighted sum, scaled to 0-100) ────────
        # Weights chosen so empathy matters most (40%), then TTR (30%), brevity (20%), consistency (10%)
        burnout_index = round(
            (ttr_penalty * 30 + empathy_penalty * 40 + brevity_penalty * 20 + consistency_penalty * 10),
            1
        )
        burnout_index = min(100.0, burnout_index)

        signals_breakdown = {
            "lexical_richness_drop_pct": round(ttr_drop * 100, 1),
            "empathy_density_drop_pct": round(empathy_drop * 100, 1),
            "recent_brevity_score": round(recent_brevity, 2),
            "reply_inconsistency_cv": round(consistency_penalty, 2),
            "turns_observed": n,
        }

        # ── Risk Level Thresholds ───────────────────────────────────────────
        if burnout_index < 20:
            risk = "low"
            action = "Agent is performing well. No intervention needed."
        elif burnout_index < 40:
            risk = "moderate"
            action = "Suggest a 2-minute mindfulness break between tickets."
        elif burnout_index < 65:
            risk = "high"
            action = "Supervisor should check in with the agent. Consider reassigning this ticket."
        else:
            risk = "critical"
            action = "Immediate supervisor intervention recommended. Agent shows signs of emotional exhaustion."

        return self._build_result(burnout_index, risk, signals_breakdown, action)

    @staticmethod
    def _build_result(index, risk, signals, action):
        return {
            "burnout_index": index,
            "burnout_risk": risk,
            "signals": signals,
            "supervisor_action": action,
        }

    def reset(self):
        """Reset for a new session."""
        self.turn_signals.clear()
        self._baseline_empathy = None
        self._baseline_ttr = None

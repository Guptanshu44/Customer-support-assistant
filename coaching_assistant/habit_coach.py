"""
habit_coach.py — Micro-Habit Coach (Personalized Agent Improvement Engine)

Analyses an agent s complete coaching history across ALL sessions to find
their single most persistent weak pattern, then generates one ultra-specific
behavior change (a "micro-habit") to practice.

Novel Logic:
  1. Aggregates per-turn scores (tone, empathy, clarity) from history
  2. Identifies the consistently lowest-performing dimension
  3. Extracts recurring themes from coaching_tip text using TF-IDF keyword scoring
  4. Maps the top theme to a concrete 30-second practice habit
  5. Provides a measurable success criterion for the next session

Zero LLM calls — pure statistics + a curated habit lookup table.
"""

import re
import math
from typing import List, Dict, Optional
from collections import Counter


# ── Stop-words to exclude from TF-IDF ────────────────────────────────────
_STOP_WORDS = {
    "the", "a", "an", "is", "in", "to", "of", "and", "or", "for",
    "with", "on", "at", "by", "this", "that", "it", "be", "as", "are",
    "was", "were", "has", "have", "had", "not", "no", "from", "use",
    "more", "also", "can", "you", "your", "their", "them", "they",
    "when", "while", "should", "would", "could", "will", "may", "might",
    "response", "customer", "agent", "message", "reply", "provide",
    "ensure", "make", "consider", "try", "help", "improve", "better",
    "clear", "specific", "one", "tip"
}

# ── Micro-Habit Library (keyword → habit card) ────────────────────────────
# Keys are theme keywords detected from coaching tips.
# Each habit is a dict with: habit, exercise, success_criterion
_HABIT_LIBRARY = {
    "empathy": {
        "dimension": "Empathy",
        "habit": "Start every reply with an explicit acknowledgment sentence.",
        "exercise": (
            "Before writing your next reply, pause 10 seconds and write ONE sentence "
            "that names the customer's emotion: 'I can hear how frustrating this is, [Name].'"
        ),
        "success_criterion": "Empathy score >= 7 in 4 of your next 5 turns.",
    },
    "acknowledge": {
        "dimension": "Empathy",
        "habit": "Mirror the customer's specific language before offering a solution.",
        "exercise": (
            "Re-read the customer's message and extract their exact key phrase "
            "(e.g. 'double charge'). Include it verbatim in your opening acknowledgment."
        ),
        "success_criterion": "Empathy score improves by 2+ points vs. your current session average.",
    },
    "tone": {
        "dimension": "Tone",
        "habit": "Replace robotic filler phrases with warm, conversational alternatives.",
        "exercise": (
            "Create a personal banned-words list: 'as per', 'please note', 'kindly'. "
            "Every time you catch yourself typing one, rewrite the sentence in plain English."
        ),
        "success_criterion": "Tone score >= 7 in 3 consecutive turns.",
    },
    "professional": {
        "dimension": "Tone",
        "habit": "Use the customer's first name at least once per reply.",
        "exercise": (
            "After drafting any reply, scan it — if you don't see the customer's name, "
            "insert it naturally in the opening or closing sentence."
        ),
        "success_criterion": "Tone score >= 7 in your next full session.",
    },
    "clarity": {
        "dimension": "Clarity",
        "habit": "End every reply with one explicit next-step sentence.",
        "exercise": (
            "After writing your reply, add the sentence: "
            "'Here is exactly what happens next: [action] within [timeframe].'"
        ),
        "success_criterion": "Clarity score >= 7 in 4 of your next 5 turns.",
    },
    "concise": {
        "dimension": "Clarity",
        "habit": "Apply the 3-sentence rule: acknowledgment + solution + next step.",
        "exercise": (
            "Draft your reply, then count your sentences. If you have more than 5, "
            "cut until you have exactly 3 core sentences."
        ),
        "success_criterion": "Clarity score improves by 1.5+ points vs. your baseline.",
    },
    "solution": {
        "dimension": "Clarity",
        "habit": "Lead with the solution, not the explanation.",
        "exercise": (
            "Swap your reply structure: put the fix in sentence 1, "
            "the reason in sentence 2, the timeline in sentence 3."
        ),
        "success_criterion": "Clarity score >= 7 in 3 consecutive turns.",
    },
    "resolution": {
        "dimension": "Clarity",
        "habit": "Always state ownership: use 'I will' instead of 'we will' or 'it will'.",
        "exercise": (
            "Scan every draft for 'we' or 'it'. Replace with 'I personally will' "
            "to create accountability in the customer's mind."
        ),
        "success_criterion": "Both clarity and empathy scores improve next session.",
    },
    "frustrat": {
        "dimension": "Empathy",
        "habit": "Validate before problem-solving — never jump straight to a fix.",
        "exercise": (
            "If a customer message contains negative words, your first sentence MUST "
            "be validation only ('That is completely understandable'). No solution yet."
        ),
        "success_criterion": "Empathy score >= 8 in your next 3 high-risk turns.",
    },
    "urgent": {
        "dimension": "Tone",
        "habit": "Match the customer's urgency in your opening, then de-escalate.",
        "exercise": (
            "For high-urgency messages, start with 'I am treating this as a priority right now.' "
            "Drill this sentence until it is automatic."
        ),
        "success_criterion": "Escalation risk drops from high to medium within 2 turns.",
    },
}

_DEFAULT_HABIT = {
    "dimension": "Overall",
    "habit": "Review your last 3 coaching tips before starting each shift.",
    "exercise": (
        "Spend 5 minutes reading your coaching history. Write down the ONE word "
        "that appears most often. Focus on fixing only that word's theme today."
    ),
    "success_criterion": "All three scores (tone, empathy, clarity) >= 6 in your next session.",
}


def _tokenize(text: str) -> List[str]:
    """Lowercase word tokens, excluding stop-words and single-char tokens."""
    words = re.findall(r"\b\w{2,}\b", text.lower(), re.UNICODE)
    return [w for w in words if w not in _STOP_WORDS]


def _tfidf_top_keywords(documents: List[str], top_n: int = 5) -> List[str]:
    """
    Compute TF-IDF scores across a list of short coaching tip strings.
    Returns the top N keywords by aggregate TF-IDF weight.
    """
    if not documents:
        return []

    # Term frequency per document
    doc_tokens = [_tokenize(d) for d in documents]
    doc_count = len(doc_tokens)

    # Document frequency (how many docs contain the term)
    df: Counter = Counter()
    for tokens in doc_tokens:
        for word in set(tokens):
            df[word] += 1

    # Aggregate TF-IDF score per term (sum across all documents)
    tfidf_scores: Counter = Counter()
    for tokens in doc_tokens:
        tf: Counter = Counter(tokens)
        total = max(len(tokens), 1)
        for word, count in tf.items():
            tf_score = count / total
            idf_score = math.log((doc_count + 1) / (df[word] + 1)) + 1
            tfidf_scores[word] += tf_score * idf_score

    return [word for word, _ in tfidf_scores.most_common(top_n)]


def _find_habit(keywords: List[str]) -> Dict:
    """
    Match the highest-priority keyword to a habit card.
    Iterates keywords in TF-IDF rank order.
    """
    for kw in keywords:
        # Partial match — e.g. "frustrated" matches "frustrat"
        for trigger, habit in _HABIT_LIBRARY.items():
            if trigger in kw or kw in trigger:
                return habit
    return _DEFAULT_HABIT


class MicroHabitCoach:
    """
    Analyses a history list of turn records and returns a personalized micro-habit.

    Usage:
        coach = MicroHabitCoach(agent_id="agent_001")
        card = coach.generate_habit_card(history)
    """

    def __init__(self, agent_id: str = "default_agent"):
        self.agent_id = agent_id

    def generate_habit_card(self, history: List[Dict]) -> Dict:
        """
        Args:
            history: list of turn dicts from the DB.
                     Each dict must have a nested result → feedback dict with
                     tone_score, empathy_score, clarity_score, coaching_tip.

        Returns:
            {
                "agent_id": str,
                "turns_analysed": int,
                "weakest_dimension": str,
                "avg_scores": { tone, empathy, clarity },
                "top_coaching_themes": [str, ...],
                "habit": { habit, exercise, success_criterion },
            }
        """
        tone_scores, empathy_scores, clarity_scores = [], [], []
        coaching_tips = []

        for turn in history:
            result = turn.get("result", {})
            feedback = result.get("feedback", {})

            t = feedback.get("tone_score")
            e = feedback.get("empathy_score")
            c = feedback.get("clarity_score")
            tip = feedback.get("coaching_tip", "")

            if t is not None:
                tone_scores.append(float(t))
            if e is not None:
                empathy_scores.append(float(e))
            if c is not None:
                clarity_scores.append(float(c))
            if tip:
                coaching_tips.append(tip)

        n = len(tone_scores)
        if n == 0:
            return {
                "agent_id": self.agent_id,
                "turns_analysed": 0,
                "weakest_dimension": "unknown",
                "avg_scores": {"tone": 0, "empathy": 0, "clarity": 0},
                "top_coaching_themes": [],
                "habit": _DEFAULT_HABIT,
                "message": "No history available yet. Complete at least one session to get a personalized habit."
            }

        avg_tone    = round(sum(tone_scores) / len(tone_scores), 1) if tone_scores else 0.0
        avg_empathy = round(sum(empathy_scores) / len(empathy_scores), 1) if empathy_scores else 0.0
        avg_clarity = round(sum(clarity_scores) / len(clarity_scores), 1) if clarity_scores else 0.0

        # Identify consistently weakest dimension
        dim_scores = {"tone": avg_tone, "empathy": avg_empathy, "clarity": avg_clarity}
        weakest = min(dim_scores, key=dim_scores.get)

        # TF-IDF keyword extraction from coaching tips
        top_keywords = _tfidf_top_keywords(coaching_tips, top_n=8)

        # Find the most relevant habit card
        habit_card = _find_habit(top_keywords)

        # If the habit dimension doesn't match the weakest, search by dimension
        if habit_card["dimension"].lower() != weakest:
            dim_keywords = {"tone": ["tone", "professional", "urgent"],
                            "empathy": ["empathy", "acknowledge", "frustrat"],
                            "clarity": ["clarity", "solution", "concise"]}
            habit_card = _find_habit(dim_keywords.get(weakest, []) + top_keywords)

        return {
            "agent_id":            self.agent_id,
            "turns_analysed":      n,
            "weakest_dimension":   weakest,
            "avg_scores":          {"tone": avg_tone, "empathy": avg_empathy, "clarity": avg_clarity},
            "top_coaching_themes": top_keywords[:5],
            "habit":               habit_card,
        }

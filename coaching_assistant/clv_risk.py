"""
clv_risk.py — Customer Lifetime Value Risk Scorer (CLV-Risk)

Estimates the BUSINESS COST of mishandling a specific conversation.
Answers the question: "How many dollars are at risk if this agent
fails to de-escalate this customer?"

Novel Logic — Churn Probability Model:
  1. Base churn rate from issue category (billing, shipping, technical, other)
  2. Tier multiplier (Enterprise customers churn differently from Starter)
  3. Sentiment penalty (negative sentiment × number of negative turns)
  4. Escalation amplifier (each high-risk turn increases churn probability)
  5. Revenue at risk = annual plan value × churn probability

Zero LLM calls — pure actuarial-style formula with industry-calibrated constants.

Output:
    {
        "clv_risk": "low|medium|high|critical",
        "churn_probability": 0.0-1.0,
        "revenue_at_risk": "$X,XXX",
        "revenue_at_risk_raw": float,
        "priority_flag": bool,
        "risk_factors": [ list of active risk drivers ],
        "retention_tip": str,
    }
"""

import re
from typing import List, Dict, Optional


# ── Industry-calibrated base churn rates by issue type ────────────────────
# Source: industry averages from Zendesk/HBR research on SaaS churn by issue category
_BASE_CHURN_RATES = {
    "billing":    0.35,   # Double-charges, refund disputes — highest churn trigger
    "shipping":   0.18,   # Delivery / tracking issues
    "technical":  0.22,   # Login, access, product bugs
    "refund":     0.40,   # Explicit refund requests — very high intent to leave
    "cancel":     0.60,   # Cancellation requests — nearly certain churn if not handled
    "complaint":  0.28,   # General dissatisfaction
    "inquiry":    0.05,   # Simple informational questions — very low risk
    "other":      0.12,   # Default
}

# ── Tier multipliers (premium customers churn faster when unhappy) ─────────
# Enterprise clients have more leverage but also more alternatives
_TIER_MULTIPLIERS = {
    "enterprise": 1.4,
    "pro":        1.1,
    "starter":    0.85,
    "free":       0.70,
    "basic":      0.80,
    "monthly":    1.2,    # Month-to-month = easier to cancel
    "annual":     0.90,   # Annual contract = slightly stickier
}

# ── Sentiment penalty weights ──────────────────────────────────────────────
_SENTIMENT_PENALTY = {"negative": 0.20, "neutral": 0.0, "positive": -0.10}

# ── Escalation amplifier per high-risk turn ───────────────────────────────
_ESCALATION_AMPLIFIER = 0.08   # +8% churn probability per unresolved high-risk turn

# ── Risk thresholds ────────────────────────────────────────────────────────
_RISK_LEVELS = [
    (0.10, "low",      False),
    (0.25, "medium",   False),
    (0.45, "high",     True),
    (1.01, "critical", True),
]

# ── Retention tips per issue ───────────────────────────────────────────────
_RETENTION_TIPS = {
    "billing":   "Offer an immediate credit or one-month fee waiver to signal accountability.",
    "refund":    "Proactively initiate the refund before the customer asks again — speed is retention.",
    "cancel":    "Escalate immediately to a senior agent or retention specialist. Do NOT process cancellation without a save attempt.",
    "shipping":  "Provide a real-time tracking update AND a goodwill gesture (discount or expedited re-ship).",
    "technical": "Give the customer a direct phone number or screen-share offer — personal touch reduces churn for tech issues.",
    "complaint": "Acknowledge the root cause explicitly. A named apology ('I am personally sorry') retains better than a generic one.",
    "inquiry":   "Respond fully in one turn — incomplete answers on inquiries create unnecessary follow-ups.",
    "other":     "Personalize your response with the customer's name and plan tier to show you know their account.",
}


def _detect_issue_type(key_issue: str, customer_message: str) -> str:
    """
    Detect the issue category from the key_issue summary and raw customer message.
    Supports English and Indic multilingual keywords.
    """
    combined = (key_issue + " " + customer_message).lower()
    patterns = {
        "cancel":   r"(cancel|cancell|termina|exit|quit|कैंसिल|रद्द|बंद करो|ரத்து|రద్దు)",
        "refund":   r"(refund|refunded|money back|reimburse|रिफंड|वापस|पैसे वापस|ரீபண்ட்|రీఫండ్)",
        "billing":  r"(charged|charge|bill|double|duplicate|invoice|payment|debit|credit card|पैसे|कट गए|कट गया|दो बार|बिल|चार्ज|பணம்|డబ్బులు)",
        "shipping": r"(ship|deliver|track|package|parcel|order|arrival|dispatch|ऑर्डर|डिलीवरी|पार्सल|ट्रैकिंग|कब आएगा|नहीं मिला|ஆர்டர்|ఆర్డర్)",
        "technical":r"(login|password|access|bug|error|crash|broken|not working|feature|account|लॉगिन|पासवर्ड|खराब|काम नहीं|समस्या|பிரச்சனை|సమస్య)",
        "complaint":r"(disappoint|unacceptable|terrible|awful|worst|horrible|angry|upset|बकवास|खराब)",
        "inquiry":  r"(how|what|when|where|do you|can i|is there|pricing|plan|छूट|दाम|कीमत)",
    }
    for category, pattern in patterns.items():
        if re.search(pattern, combined, re.IGNORECASE):
            return category
    return "other"


def _parse_plan_value(value_str: str) -> float:
    """
    Parse a value string like '$1,240 / yr' or '$3,600 / yr' into a float.
    Defaults to 1,200.0 if parsing yields 0 (e.g. for 'Active Account').
    """
    if not value_str:
        return 1200.0
    cleaned = re.sub(r"[^\d.]", "", value_str.replace(",", ""))
    try:
        val = float(cleaned)
        return val if val > 0 else 1200.0
    except ValueError:
        return 1200.0


def _detect_tier(plan_str: str) -> str:
    """
    Extract tier from a plan string like 'Enterprise Plus', 'Pro Annual', 'Starter Monthly'.
    Returns the matching tier key.
    """
    plan_lower = plan_str.lower()
    for tier in _TIER_MULTIPLIERS:
        if tier in plan_lower:
            return tier
    return "other"


def _get_tier_multiplier(plan_str: str) -> float:
    """Get the combined tier multiplier for a plan string."""
    plan_lower = plan_str.lower()
    multiplier = 1.0
    for tier, value in _TIER_MULTIPLIERS.items():
        if tier in plan_lower:
            multiplier *= value
    # Cap the combined multiplier to a sensible range
    return min(max(multiplier, 0.5), 2.5)


class CLVRiskScorer:
    """
    Stateless CLV risk calculator.
    Call .score() with the current session data to get a risk assessment.
    """

    @staticmethod
    def score(
        customer: Dict,
        analysis: Dict,
        turns: List[Dict],
        key_issue: str = "",
        customer_message: str = ""
    ) -> Dict:
        """
        Calculate the CLV risk for this conversation.

        Args:
            customer        : customer dict with 'plan' and 'value' fields
            analysis        : latest analysis dict (sentiment, urgency, escalation_risk)
            turns           : list of all session turn dicts
            key_issue       : short description of the main issue
            customer_message: raw latest customer message (for issue detection)

        Returns:
            CLV risk assessment dict.
        """
        # ── Step 1: Detect issue type ───────────────────────────────────────
        issue_type = _detect_issue_type(key_issue, customer_message)
        base_churn = _BASE_CHURN_RATES.get(issue_type, 0.12)

        # ── Step 2: Tier multiplier ─────────────────────────────────────────
        plan = customer.get("plan", "Pro")
        tier_mult = _get_tier_multiplier(plan)

        # ── Step 3: Sentiment penalty ───────────────────────────────────────
        sentiment = analysis.get("sentiment", "neutral")
        sentiment_penalty = _SENTIMENT_PENALTY.get(sentiment, 0.0)

        # ── Step 4: Escalation amplifier (count high-risk turns) ────────────
        high_risk_turns = 0
        for turn in turns:
            turn_analysis = turn.get("result", {}).get("analysis", {})
            if turn_analysis.get("escalation_risk", "low") == "high":
                high_risk_turns += 1
        escalation_penalty = high_risk_turns * _ESCALATION_AMPLIFIER

        # ── Step 5: Compose churn probability ──────────────────────────────
        raw_churn = (base_churn + sentiment_penalty + escalation_penalty) * tier_mult
        churn_prob = round(min(max(raw_churn, 0.01), 0.99), 3)

        # ── Step 6: Revenue at risk ─────────────────────────────────────────
        annual_value = _parse_plan_value(customer.get("value", "$0 / yr"))
        revenue_at_risk_raw = round(annual_value * churn_prob, 2)
        revenue_at_risk_str = f"${revenue_at_risk_raw:,.0f}"

        # ── Step 7: Risk level ──────────────────────────────────────────────
        risk_label = "low"
        priority_flag = False
        for threshold, label, priority in _RISK_LEVELS:
            if churn_prob < threshold:
                risk_label = label
                priority_flag = priority
                break

        # ── Step 8: Risk factor narrative ──────────────────────────────────
        risk_factors = []
        if issue_type in ("cancel", "refund", "billing"):
            risk_factors.append(f"High-churn issue category: {issue_type} ({int(base_churn*100)}% base rate)")
        if tier_mult > 1.1:
            risk_factors.append(f"Elevated tier multiplier for plan '{plan}'")
        if sentiment == "negative":
            risk_factors.append("Customer sentiment is currently negative")
        if high_risk_turns > 1:
            risk_factors.append(f"{high_risk_turns} high-risk turn(s) unresolved in this session")
        if not risk_factors:
            risk_factors.append("No major churn risk factors detected")

        return {
            "clv_risk":            risk_label,
            "churn_probability":   churn_prob,
            "revenue_at_risk":     revenue_at_risk_str,
            "revenue_at_risk_raw": revenue_at_risk_raw,
            "annual_plan_value":   f"${annual_value:,.0f}",
            "issue_type":          issue_type,
            "priority_flag":       priority_flag,
            "risk_factors":        risk_factors,
            "retention_tip":       _RETENTION_TIPS.get(issue_type, _RETENTION_TIPS["other"]),
        }

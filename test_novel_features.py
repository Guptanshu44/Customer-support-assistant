"""
test_novel_features.py - Smoke tests for all 5 novel features.
Run: python test_novel_features.py
"""
from coaching_assistant.burnout_detector import AgentBurnoutDetector
from coaching_assistant.momentum_forecaster import ConversationMomentumForecaster
from coaching_assistant.habit_coach import MicroHabitCoach
from coaching_assistant.clv_risk import CLVRiskScorer
from coaching_assistant.dna_fingerprint import ConversationDNAMatcher, build_fingerprint

print("=" * 60)
print("  omniDesk-copilot — Novel Feature Smoke Tests")
print("=" * 60)

# --- Feature 1: Agent Burnout Detector ---
print("\n[1] Agent Burnout Detector")
bd = AgentBurnoutDetector(agent_id="agent_001")
bd.observe("I completely understand your frustration and I sincerely apologize for the inconvenience this has caused you.")
bd.observe("Let me fix that.")
bd.observe("Ok.")
result = bd.analyze()
print("  burnout_index   :", result["burnout_index"])
print("  burnout_risk    :", result["burnout_risk"])
print("  supervisor_action:", result["supervisor_action"])
assert "burnout_index" in result
print("  PASS")

# --- Feature 2: Momentum Forecaster ---
print("\n[2] Conversation Momentum Forecaster")
mf = ConversationMomentumForecaster("TK-test")
mf.record_turn({"sentiment": "negative", "urgency": "high", "escalation_risk": "high"},
               {"empathy_score": 3, "clarity_score": 4})
mf.record_turn({"sentiment": "neutral",  "urgency": "medium", "escalation_risk": "medium"},
               {"empathy_score": 6, "clarity_score": 7})
mf.record_turn({"sentiment": "positive", "urgency": "low", "escalation_risk": "low"},
               {"empathy_score": 9, "clarity_score": 8})
forecast = mf.forecast()
print("  outcome_prediction  :", forecast["outcome_prediction"])
print("  confidence          :", forecast["confidence"], "%")
print("  turns_until_outcome :", forecast["turns_until_outcome"])
print("  reasoning           :", forecast["reasoning"][:80], "...")
assert forecast["outcome_prediction"] in ("resolution", "escalation", "stalemate", "too_early")
print("  PASS")

# --- Feature 3: Micro-Habit Coach ---
print("\n[3] Micro-Habit Coach")
hc = MicroHabitCoach(agent_id="agent_001")
fake_history = [
    {"result": {"feedback": {"tone_score": 5, "empathy_score": 4, "clarity_score": 7,
                              "coaching_tip": "Acknowledge customer feelings before giving a solution."}}},
    {"result": {"feedback": {"tone_score": 6, "empathy_score": 4, "clarity_score": 8,
                              "coaching_tip": "Show more empathy and acknowledge the frustration."}}},
    {"result": {"feedback": {"tone_score": 5, "empathy_score": 3, "clarity_score": 7,
                              "coaching_tip": "Your response lacked empathy. Use warmer language."}}},
]
card = hc.generate_habit_card(fake_history)
print("  weakest_dimension   :", card["weakest_dimension"])
print("  avg_scores          :", card["avg_scores"])
print("  top_coaching_themes :", card["top_coaching_themes"])
print("  habit               :", card["habit"]["habit"])
print("  exercise            :", card["habit"]["exercise"][:80], "...")
assert "habit" in card
print("  PASS")

# --- Feature 4: CLV Risk Scorer ---
print("\n[4] CLV Risk Scorer")
clv = CLVRiskScorer.score(
    customer={"plan": "Enterprise Plus", "value": "$3,600 / yr"},
    analysis={"sentiment": "negative", "urgency": "high", "escalation_risk": "high"},
    turns=[
        {"result": {"analysis": {"escalation_risk": "high"}}},
        {"result": {"analysis": {"escalation_risk": "high"}}},
    ],
    key_issue="billing dispute double charge",
    customer_message="I was charged twice and I want a refund now!"
)
print("  clv_risk            :", clv["clv_risk"])
print("  churn_probability   :", clv["churn_probability"])
print("  revenue_at_risk     :", clv["revenue_at_risk"])
print("  priority_flag       :", clv["priority_flag"])
print("  issue_type          :", clv["issue_type"])
print("  retention_tip       :", clv["retention_tip"][:80], "...")
assert clv["clv_risk"] in ("low", "medium", "high", "critical")
print("  PASS")

# --- Feature 5: Conversation DNA Fingerprinting ---
print("\n[5] Conversation DNA Fingerprinting")
session_turns = [
    {"result": {"analysis": {"sentiment": "negative", "urgency": "high", "escalation_risk": "high"},
                "feedback": {"empathy_score": 4, "clarity_score": 5, "tone_score": 5}}},
    {"result": {"analysis": {"sentiment": "neutral",  "urgency": "medium", "escalation_risk": "medium"},
                "feedback": {"empathy_score": 7, "clarity_score": 7, "tone_score": 7}}},
]
fp = build_fingerprint(session_turns)
print("  fingerprint length  :", len(fp))
assert len(fp) == 30, f"Expected 30-dim, got {len(fp)}"

matcher = ConversationDNAMatcher()
interpretation = matcher.interpret(fp)
print("  profile             :", interpretation["profile"])

# Test similarity with a stored fingerprint
stored = [{"session_id": "TK-0001", "fingerprint": fp[:],
           "title": "Test Past Session", "customer_name": "Test User",
           "last_sentiment": "neutral", "last_urgency": "low",
           "turns_count": 2, "summary": "Test issue"}]
similar = matcher.find_similar(fp, stored, top_k=1)
print("  similar sessions    :", len(similar))
if similar:
    print("  top match similarity:", similar[0]["similarity"], "%")
print("  PASS")

print("\n" + "=" * 60)
print("  ALL 5 FEATURE SMOKE TESTS PASSED")
print("=" * 60)

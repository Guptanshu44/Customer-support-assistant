"""
test_novel_features.py - Smoke tests for coaching intelligence modules.
Run: python test_novel_features.py
"""
from coaching_assistant.burnout_detector import AgentBurnoutDetector
from coaching_assistant.momentum_forecaster import ConversationMomentumForecaster
from coaching_assistant.habit_coach import MicroHabitCoach

print("=" * 60)
print("  omniDesk-copilot — Coaching Intelligence Tests")
print("=" * 60)

# Agent Burnout Detector
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

# Momentum Forecaster
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

# Micro-Habit Coach
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

print("\n" + "=" * 60)
print("  ALL 3 ACTIVE FEATURE SMOKE TESTS PASSED")
print("=" * 60)


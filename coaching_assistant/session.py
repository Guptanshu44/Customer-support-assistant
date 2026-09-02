"""
session.py - RealTimeCoachingSession

Orchestrates a live customer-support coaching session by tying together
the AICoach methods into a clean per-message interface.

Usage:
    session = RealTimeCoachingSession()

    # Called when a customer sends a message
    result = session.on_customer_message("My order never arrived!")
    # result: {sentiment, urgency, escalation_risk, key_issue, suggested_reply}

    # Called when the agent sends a reply
    feedback = session.on_agent_message("I am so sorry to hear that...")
    # feedback: {tone_score, empathy_score, clarity_score, coaching_tip}
"""

from .models import ConversationState
from .coach import AICoach


class RealTimeCoachingSession:
    """
    Manages one live customer-support conversation with real-time AI coaching.

    Flow:
        on_customer_message() - analyzes sentiment / urgency / escalation risk,
                                optionally generates a suggested reply for high-risk cases.
        on_agent_message()    - evaluates the agent draft and returns coaching scores.
    """

    def __init__(self, knowledge_base=None, provider=None):
        self.state = ConversationState()
        self.coach = AICoach(knowledge_base=knowledge_base, provider=provider)

        # Keep the last customer message so the agent reply can be evaluated
        self.last_customer_message: str = ""

    # ==========================================
    # CUSTOMER MESSAGE
    # ==========================================

    def on_customer_message(self, message: str) -> dict:
        """
        Process an inbound customer message.

        Returns a dict with:
            - sentiment       : "positive" | "neutral" | "negative"
            - urgency         : "low" | "medium" | "high"
            - escalation_risk : "low" | "medium" | "high"
            - key_issue       : short description of the main issue
            - suggested_reply : str | None  (only when escalation_risk == "high")
        """
        # Add customer message to conversation history
        self.state.add_message("customer", message)

        # Remember for evaluating the next agent reply
        self.last_customer_message = message

        # Analyze the customer message
        analysis = self.coach.analyze_customer_message(message)

        # Update conversation state
        self.state.sentiment = analysis["sentiment"]
        self.state.urgency = analysis["urgency"]
        self.state.escalation_risk = analysis["escalation_risk"]
        self.state.key_issue = analysis["key_issue"]

        # Generate a suggested reply when escalation risk is high
        suggested_reply = None
        if self.state.escalation_risk.lower() == "high":
            suggested_reply = self.coach.suggest_reply(
                customer_message=message,
                conversation_history=self.state.history
            )

        return {
            "sentiment": self.state.sentiment,
            "urgency": self.state.urgency,
            "escalation_risk": self.state.escalation_risk,
            "key_issue": self.state.key_issue,
            "suggested_reply": suggested_reply
        }

    # ==========================================
    # AGENT MESSAGE
    # ==========================================

    def on_agent_message(self, message: str) -> dict:
        """
        Process an outbound agent message.

        Returns a dict with:
            - tone_score      : int (1-10)
            - empathy_score   : int (1-10)
            - clarity_score   : int (1-10)
            - coaching_tip    : str
        """
        # Add agent message to conversation history
        self.state.add_message("agent", message)

        # Evaluate the agent response against the last customer message
        feedback = self.coach.generate_coaching_feedback(
            agent_message=message,
            customer_message=self.last_customer_message,
            conversation_state=self.state
        )

        return {
            "tone_score": feedback.tone_score,
            "empathy_score": feedback.empathy_score,
            "clarity_score": feedback.clarity_score,
            "coaching_tip": feedback.coaching_tip
        }

"""
coaching_assistant package
AI-powered Real-time Customer Support Coaching Assistant
"""

from .coach import AICoach
from .models import ConversationState, CoachingFeedback, Message
from .session import RealTimeCoachingSession

# Novel Features
from .burnout_detector import AgentBurnoutDetector
from .momentum_forecaster import ConversationMomentumForecaster
from .habit_coach import MicroHabitCoach
from .clv_risk import CLVRiskScorer
from .dna_fingerprint import ConversationDNAMatcher, build_fingerprint

__all__ = [
    # Core
    "AICoach",
    "ConversationState",
    "CoachingFeedback",
    "Message",
    "RealTimeCoachingSession",
    # Novel Features
    "AgentBurnoutDetector",
    "ConversationMomentumForecaster",
    "MicroHabitCoach",
    "CLVRiskScorer",
    "ConversationDNAMatcher",
    "build_fingerprint",
]

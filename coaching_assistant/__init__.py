"""
coaching_assistant package
AI-powered Real-time Customer Support Coaching Assistant
"""

from .coach import AICoach
from .models import ConversationState, CoachingFeedback, Message
from .session import RealTimeCoachingSession

from .burnout_detector import AgentBurnoutDetector
from .momentum_forecaster import ConversationMomentumForecaster
from .habit_coach import MicroHabitCoach

__all__ = [
    "AICoach",
    "ConversationState",
    "CoachingFeedback",
    "Message",
    "RealTimeCoachingSession",
    "AgentBurnoutDetector",
    "ConversationMomentumForecaster",
    "MicroHabitCoach",
]

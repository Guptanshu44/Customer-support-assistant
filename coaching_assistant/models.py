"""
models.py — Data models for the coaching assistant.
Source: Cells 15 of Anshu (1).ipynb
"""

from dataclasses import dataclass, field
from typing import List


@dataclass
class Message:
    """Represents one message in the conversation."""
    speaker: str   # "agent" or "customer"
    text: str


@dataclass
class ConversationState:
    """Stores the complete conversation and current customer risk."""
    history: List[Message] = field(default_factory=list)
    sentiment: str = "unknown"
    urgency: str = "unknown"
    escalation_risk: str = "unknown"
    key_issue: str = ""

    def add_message(self, speaker: str, text: str):
        """Add a new message to the conversation history."""
        self.history.append(
            Message(
                speaker=speaker,
                text=text
            )
        )

    def get_transcript(self) -> str:
        """Return the conversation as a readable transcript string."""
        lines = []
        for msg in self.history:
            lines.append(f"[{msg.speaker.upper()}]: {msg.text}")
        return "\n".join(lines)


@dataclass
class CoachingFeedback:
    """Stores feedback about the agent's response."""
    tone_score: int        # 1-10
    empathy_score: int     # 1-10
    clarity_score: int     # 1-10
    coaching_tip: str
    knowledge_suggestion: str = ""  # Relevant FAQ to share with customer

    def summary(self) -> str:
        return (
            f"Tone: {self.tone_score}/10 | "
            f"Empathy: {self.empathy_score}/10 | "
            f"Clarity: {self.clarity_score}/10\n"
            f"Tip: {self.coaching_tip}"
        )

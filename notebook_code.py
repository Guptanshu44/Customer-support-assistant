# === CELL 1 ===

import queue
import threading
import time
from transformers import pipeline

# Load AI Models
sentiment_analyzer = pipeline("sentiment-analysis")
intent_classifier = pipeline("zero-shot-classification")

# Define Coaching Logic
def generate_coaching_feedback(agent_message, customer_message):
    feedback = []

    # Sentiment check
    sentiment = sentiment_analyzer(customer_message)[0]
    if sentiment['label'] == "NEGATIVE":
        feedback.append("Customer seems upset. Use empathy and reassure them.")

    # Intent detection
    intents = ["complaint", "query", "purchase", "technical issue", "feedback"]
    intent_result = intent_classifier(customer_message, intents)
    top_intent = intent_result['labels'][0]

    if top_intent == "complaint":
        feedback.append("Acknowledge the issue clearly and offer a resolution path.")
    elif top_intent == "technical issue":
        feedback.append("Guide step-by-step troubleshooting, avoid jargon.")
    elif top_intent == "purchase":
        feedback.append("Highlight product benefits and reassure about value.")
    elif top_intent == "query":
        feedback.append("Answer concisely and check if customer needs more details.")
    elif top_intent == "feedback":
        feedback.append("Thank the customer and note their input.")

    # Agent coaching
    if "sorry" not in agent_message.lower() and sentiment['label'] == "NEGATIVE":
        feedback.append("Consider apologizing to show empathy.")

    return feedback

# === CELL 2 ===

import queue
import threading
import time
from transformers import pipeline

# Load AI Models
sentiment_analyzer = pipeline("sentiment-analysis")
intent_classifier = pipeline("zero-shot-classification")
customer_message = "I am very much disappointed with your service."

# Define Coaching Logic
def generate_coaching_feedback(agent_message, customer_message):
    feedback = []

    # Sentiment check
    sentiment = sentiment_analyzer(customer_message)[0]
    if sentiment['label'] == "NEGATIVE":
        feedback.append("Customer seems upset. Use empathy and reassure them.")

    # Intent detection
    intents = ["complaint", "query", "purchase", "technical issue", "feedback"]
    intent_result = intent_classifier(customer_message, intents)
    top_intent = intent_result['labels'][0]

    if top_intent == "complaint":
        feedback.append("Acknowledge the issue clearly and offer a resolution path.")
    elif top_intent == "technical issue":
        feedback.append("Guide step-by-step troubleshooting, avoid jargon.")

    elif top_intent == "purchase":
        feedback.append("Highlight product benefits and reassure about value.")

    elif top_intent == "query":
        feedback.append("Answer concisely and check if customer needs more details.")

    elif top_intent == "feedback":
        feedback.append("Thank the customer and note their input.")

    # Agent coaching
    if "sorry" not in agent_message.lower() and sentiment['label'] == "NEGATIVE":
        feedback.append("Consider apologizing to show empathy.")

    return feedback

# === CELL 3 ===

pip install transformers

# === CELL 4 ===

pip install pandas transformers

# === CELL 5 ===

pip install torch torchvision torchaudio


# === CELL 6 ===

import queue
import threading
import time
from transformers import pipeline

# Load AI Models
sentiment_analyzer = pipeline("sentiment-analysis")
intent_classifier = pipeline("zero-shot-classification")

# Define Coaching Logic
def generate_coaching_feedback(agent_message, customer_message):
    feedback = []

    # Sentiment check
    sentiment = sentiment_analyzer(customer_message)[0]
    if sentiment['label'] == "NEGATIVE":
        feedback.append("Customer seems upset. Use empathy and reassure them.")

    # Intent detection
    intents = ["complaint", "query", "purchase", "technical issue", "feedback"]
    intent_result = intent_classifier(customer_message, intents)
    top_intent = intent_result['labels'][0]

    if top_intent == "complaint":
        feedback.append("Acknowledge the issue clearly and offer a resolution path.")

    elif top_intent == "technical issue":
        feedback.append("Guide step-by-step troubleshooting, avoid jargon.")

    elif top_intent == "purchase":
        feedback.append("Highlight product benefits and reassure about value.")

    elif top_intent == "query":
        feedback.append("Answer concisely and check if customer needs more details.")

    elif top_intent == "feedback":
        feedback.append("Thank the customer and note their input.")

    # Agent coaching
    if "sorry" not in agent_message.lower() and sentiment['label'] == "NEGATIVE":
        feedback.append("Consider apologizing to show empathy.")

    return feedback

# === CELL 7 ===

import queue
import threading
import time
from transformers import pipeline

sentiment_analyzer = pipeline("sentiment-analysis")
intent_classifier = pipeline("zero-shot-classification")
customer_message = "i am very much disspointed with your service"
result = sentiment_analyzer(customer_message)
print(result)

# === CELL 8 ===

def generate_coaching_feedback(agent_message, customer_message):
    feedback = []

    feedback.append("Customer seems upset.")
    feedback.append("Offer empathy.")

    return feedback


result = generate_coaching_feedback(
    "How may I help you?",
    "My internet has stopped working."
)

print(result)

# === CELL 9 ===

intent_classifier = pipeline("zero-shot-classification")

labels = ["complaint", "purchase", "query"]

result = intent_classifier(
    "my internet is not working.",
    labels
)

print(result)

# === CELL 10 ===

# Real-time Simulation

def coaching_assistant(conversation_queue):
    while True:
        if not conversation_queue.empty():
            agent_msg, customer_msg = conversation_queue.get()

            print(f"\n[Agent]: {agent_msg}")
            print(f"[Customer]: {customer_msg}")

            feedback = generate_coaching_feedback(agent_msg, customer_msg)

            print("\n--- Coaching Suggestions ---")
            for tip in feedback:
                print(f"✓ {tip}")

        time.sleep(1)

# === CELL 11 ===

def generate_coaching_feedback(agent_message, customer_message):
    feedback = []

    # Sentiment check
    sentiment = sentiment_analyzer(customer_message)[0]

    if sentiment["label"] == "NEGATIVE":
        feedback.append("Customer seems upset. Use empathy and reassure them.")

    # Intent detection
    intents = ["complaint","query","purchase","technical issue","feedback"]

    intent_result = intent_classifier(customer_message, intents)
    top_intent = intent_result["labels"][0]

    if top_intent == "complaint":
        feedback.append("Acknowledge the issue clearly and offer a resolution path.")

    elif top_intent == "technical issue":
        feedback.append("Guide step-by-step troubleshooting, avoid jargon.")

    elif top_intent == "purchase":
        feedback.append("Highlight product benefits and reassure about value.")

    elif top_intent == "query":
        feedback.append("Answer concisely and check if customer needs more details.")

    elif top_intent == "feedback":
        feedback.append("Thank the customer and note their input.")

    # Agent coaching
    if "sorry" not in agent_message.lower() and sentiment["label"] == "NEGATIVE":
        feedback.append("Consider apologizing to show empathy.")

    return feedback

# === CELL 12 ===

intent_result = {
    "labels": ["technical issue", "complaint", "query", "purchase"]
}

top_intent = intent_result["labels"][0]

feedback = []

if top_intent == "complaint":
    feedback.append("Show empathy and apologize sincerely.")

elif top_intent == "technical issue":
    feedback.append("Guide step-by-step troubleshooting, avoid jargon.")

elif top_intent == "purchase":
    feedback.append("Highlight product benefits and assist with checkout.")

elif top_intent == "query":
    feedback.append("Provide clear and concise information.")

else:
    feedback.append("Ask clarifying questions to better understand the issue.")

print("Top Intent:", top_intent)
print("Feedback:", feedback)

# === CELL 13 ===

pip install anthropic


# === CELL 14 ===

pip show anthropic

# === CELL 15 ===

import os
import json
from dataclasses import dataclass, field
from typing import List

# 1. DATA MODELS

@dataclass
class Message:
    """Represents one message in the conversation."""
    speaker: str
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


@dataclass
class CoachingFeedback:
    """Stores feedback about the agent's response."""
    tone_score: int
    empathy_score: int
    clarity_score: int
    coaching_tip: str

# === CELL 16 ===

class AICoach:
    def __init__(self):
        """
        Create the Anthropic client.
        """
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError(
                "ANTHROPIC_API_KEY environment variable is not set."
            )
        self.client = Anthropic(api_key=api_key)
        # You can change this through an environment variable.
        self.model = os.getenv(
            "ANTHROPIC_MODEL",
            "claude-sonnet-4-20250514"
        )

    # Helper function
    def _parse_json(self, text: str) -> dict:
        """
        Safely convert Claude's response into a Python dictionary.

        Handles responses such as:

        {
            "sentiment": "negative"
        }

        and also:

        ```json
        {
            "sentiment": "negative"
        }
        ```
        """
        text = text.strip()
        # Remove Markdown code fences if Claude adds them
        if text.startswith("```"):
            lines = text.splitlines()

            if lines[0].startswith("```"):
                lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            text = "\n".join(lines).strip()

        # Sometimes the response may contain "json" before JSON
        if text.lower().startswith("json"):
            text = text[4:].strip()

        try:
            return json.loads(text)

        except json.JSONDecodeError as e:
            print("\nCould not parse Claude response as JSON.")
            print("Raw response:")
            print(text)

            raise ValueError(
                f"Invalid JSON returned by Claude: {e}"
            )

# === CELL 17 ===

import json


def parse_json(text: str):
    # Remove Markdown code fences if Claude adds them
    if text.startswith("```"):
        lines = text.splitlines()

        if lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        text = "\n".join(lines).strip()

    # Sometimes the response may contain "json" before JSON
    if text.lower().startswith("json"):
        text = text[4:].strip()

    try:
        return json.loads(text)

    except json.JSONDecodeError as e:
        print("\nCould not parse Claude response as JSON.")
        print("Raw response:")
        print(text)

        raise ValueError(
            f"Invalid JSON returned by Claude: {e}"
        )
"""
hf_coach.py — HuggingFace-based coaching (free, offline fallback).
Source: Cells 1-11 of Anshu (1).ipynb

No API key needed. Uses local transformer models.
"""

import queue
import threading
import time


class HFCoach:
    """
    Real-time coaching assistant powered by HuggingFace transformers.
    Works completely offline — no API key required.
    Note: Requires 'transformers' and 'torch' to be installed.
    """

    def __init__(self):
        try:
            from transformers import pipeline
        except ImportError:
            raise ImportError(
                "HuggingFace 'transformers' package is not installed.\n"
                "Install it with: pip install transformers torch\n"
                "Or set a GROQ_API_KEY to use the Groq LLM provider instead."
            )
        print("Loading HuggingFace models (first run may take a while)...")
        self.sentiment_analyzer = pipeline("sentiment-analysis")
        self.intent_classifier = pipeline("zero-shot-classification")
        print("Models loaded successfully!\n")

    def analyze_sentiment(self, message: str) -> dict:
        """Run sentiment analysis on a customer message."""
        result = self.sentiment_analyzer(message)[0]
        return result  # {"label": "POSITIVE"/"NEGATIVE", "score": float}

    def classify_intent(self, message: str) -> str:
        """Detect the top intent from customer message."""
        intents = ["complaint", "query", "purchase", "technical issue", "feedback"]
        result = self.intent_classifier(message, intents)
        return result["labels"][0]

    def generate_coaching_feedback(
        self,
        agent_message: str,
        customer_message: str
    ) -> list:
        """
        Generate coaching suggestions for the agent based on
        customer sentiment and intent.

        Returns a list of coaching tip strings.
        """
        feedback = []

        # --- Sentiment check ---
        sentiment = self.analyze_sentiment(customer_message)

        if sentiment["label"] == "NEGATIVE":
            feedback.append("Customer seems upset. Use empathy and reassure them.")

        # --- Intent detection ---
        top_intent = self.classify_intent(customer_message)

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

        # --- Agent empathy check ---
        if "sorry" not in agent_message.lower() and sentiment["label"] == "NEGATIVE":
            feedback.append("Consider apologizing to show empathy.")

        return feedback

    def coaching_assistant(self, conversation_queue: queue.Queue):
        """
        Real-time coaching loop. Runs in a background thread.
        Continuously reads from conversation_queue and prints feedback.
        """
        print("Coaching assistant started. Listening for conversations...\n")
        while True:
            if not conversation_queue.empty():
                agent_msg, customer_msg = conversation_queue.get()

                print(f"\n[Agent]:    {agent_msg}")
                print(f"[Customer]: {customer_msg}")

                feedback = self.generate_coaching_feedback(agent_msg, customer_msg)

                print("\n--- Coaching Suggestions ---")
                for tip in feedback:
                    print(f"  ✓ {tip}")
                print("----------------------------")

            time.sleep(1)

    def run_demo(self):
        """Run a quick demo with sample conversations."""
        demo_conversations = [
            (
                "How may I help you today?",
                "I am very much disappointed with your service!"
            ),
            (
                "Let me check that for you.",
                "My internet has been down for 3 days, this is unacceptable!"
            ),
            (
                "Thank you for reaching out.",
                "I want to know about your premium subscription plans."
            ),
            (
                "Sorry for the inconvenience. Let me escalate this.",
                "Nothing is working! I've called 5 times already!"
            ),
        ]

        print("=" * 60)
        print("HuggingFace Coaching Assistant — Demo Mode")
        print("=" * 60)

        for agent_msg, customer_msg in demo_conversations:
            print(f"\n[Agent]:    {agent_msg}")
            print(f"[Customer]: {customer_msg}")

            feedback = self.generate_coaching_feedback(agent_msg, customer_msg)

            print("\n  💡 Coaching Suggestions:")
            for tip in feedback:
                print(f"    ✓ {tip}")
            print("-" * 60)
            time.sleep(0.5)

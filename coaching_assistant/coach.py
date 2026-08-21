"""
coach.py — AI-powered Coaching Assistant with multi-provider LLM support (Groq & Claude).

Supports:
  - Groq (Free & Ultra-Fast <0.5s with llama-3.3-70b-versatile or llama-3.1-8b-instant)
  - Anthropic Claude (claude-sonnet-4-20250514)

Methods:
  - analyze_customer_message()      — sentiment, urgency, escalation risk
  - generate_coaching_feedback()    — tone/empathy/clarity scores + tips
  - get_knowledge_suggestions()     — relevant FAQ suggestions
  - check_compliance()              — policy violation detection
  - process_turn()                  — full conversation turn handler
"""

import os
import time

from .models import Message, ConversationState, CoachingFeedback
from .utils import parse_json


class AICoach:
    """
    AI-powered customer support coaching assistant.
    Supports Groq (default/recommended) and Anthropic Claude.
    """

    def __init__(self, knowledge_base=None, provider=None):
        """
        Initialize the LLM client.
        Automatically detects available API keys if provider is not explicitly set.
        """
        self.kb = knowledge_base
        self.provider = provider

        groq_key = os.getenv("GROQ_API_KEY", "").strip()
        anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()

        # Filter out placeholder values
        if groq_key in ("your_groq_api_key_here", "your_api_key_here"):
            groq_key = ""
        if anthropic_key in ("your_anthropic_api_key_here", "your_api_key_here"):
            anthropic_key = ""

        # Auto-detect provider if not specified
        if not self.provider:
            if groq_key:
                self.provider = "groq"
            elif anthropic_key:
                self.provider = "claude"
            else:
                raise ValueError(
                    "No API Key found!\n"
                    "Please set either GROQ_API_KEY or ANTHROPIC_API_KEY in your .env file.\n"
                    "Tip: Groq keys are free at https://console.groq.com/keys"
                )

        if self.provider == "groq":
            from groq import Groq
            if not groq_key:
                raise ValueError("GROQ_API_KEY is not set in .env")
            self.client = Groq(api_key=groq_key)
            self.model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
            print(f"🚀 AICoach initialized with Groq ({self.model})")

        elif self.provider == "claude":
            from anthropic import Anthropic
            if not anthropic_key:
                raise ValueError("ANTHROPIC_API_KEY is not set in .env")
            self.client = Anthropic(api_key=anthropic_key)
            self.model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
            print(f"🤖 AICoach initialized with Claude ({self.model})")

        else:
            raise ValueError(f"Unknown provider: {self.provider}")

    # ------------------------------------------------------------------ #
    # Unified LLM caller                                                  #
    # ------------------------------------------------------------------ #

    def _call_llm(self, prompt: str, max_tokens: int = 400) -> str:
        """Call either Groq or Claude depending on configured provider."""
        try:
            if self.provider == "groq":
                completion = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=max_tokens,
                    temperature=0.2
                )
                return completion.choices[0].message.content

            elif self.provider == "claude":
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=max_tokens,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text

        except Exception as e:
            err = str(e).lower()
            if "rate_limit" in err or "ratelimit" in err or "429" in err:
                raise RuntimeError(
                    "⚠️ Groq API rate limit reached. Please wait 10–15 seconds and try again. "
                    "Tip: Switch to model 'llama-3.1-8b-instant' for higher free-tier limits."
                ) from e
            raise

    def _parse_json(self, text: str) -> dict:
        """Safely parse JSON response from LLM."""
        return parse_json(text)

    # ------------------------------------------------------------------ #
    # 1. Analyze customer message                                         #
    # ------------------------------------------------------------------ #

    def analyze_customer_message(self, customer_message: str) -> dict:
        """
        Analyze a customer message for sentiment, urgency, escalation risk, key issue.
        """
        prompt = f"""You are an AI customer-support risk analyzer.

Analyze the following customer message.

Customer message:
{customer_message}

Return ONLY valid JSON with exactly this structure:

{{
    "sentiment": "positive|neutral|negative",
    "urgency": "low|medium|high",
    "escalation_risk": "low|medium|high",
    "key_issue": "concise plain text description of the main issue without any emojis"
}}

Do not add explanations or emojis outside the JSON.
"""
        text = self._call_llm(prompt, max_tokens=300)
        return self._parse_json(text)

    # ------------------------------------------------------------------ #
    # 2. Generate coaching feedback for agent                             #
    # ------------------------------------------------------------------ #

    def generate_coaching_feedback(
        self,
        agent_message: str,
        customer_message: str,
        conversation_state: ConversationState = None,
        knowledge_context: str = ""
    ) -> CoachingFeedback:
        """
        Evaluate the agent's response and return structured coaching feedback.
        """
        context = ""
        if conversation_state and conversation_state.history:
            context = f"\nConversation history:\n{conversation_state.get_transcript()}\n"

        kb_context = ""
        if knowledge_context:
            kb_context = f"\nRelevant knowledge for this issue:\n{knowledge_context}\n"

        prompt = f"""You are an expert customer service coach.
{context}{kb_context}
Latest customer message: "{customer_message}"
Agent's response: "{agent_message}"

Evaluate the agent and return ONLY valid JSON:

{{
    "tone_score": <1-10>,
    "empathy_score": <1-10>,
    "clarity_score": <1-10>,
    "coaching_tip": "One specific, actionable improvement suggestion in concise plain text without emojis",
    "knowledge_suggestion": "Relevant FAQ or information the agent should share in plain text (empty string if not applicable)"
}}

Scoring guide:
- tone_score: Professional and appropriate tone?
- empathy_score: Did the agent acknowledge customer feelings?
- clarity_score: Was the response clear and easy to understand?

Do not add explanations or emojis outside the JSON.
"""
        text = self._call_llm(prompt, max_tokens=500)
        data = self._parse_json(text)

        return CoachingFeedback(
            tone_score=int(data.get("tone_score", 5)),
            empathy_score=int(data.get("empathy_score", 5)),
            clarity_score=int(data.get("clarity_score", 5)),
            coaching_tip=data.get("coaching_tip", "No specific tip."),
            knowledge_suggestion=data.get("knowledge_suggestion", "")
        )

    # ------------------------------------------------------------------ #
    # 3. Compliance check                                                  #
    # ------------------------------------------------------------------ #

    def check_compliance(
        self,
        agent_message: str,
        policy_context: str = ""
    ) -> dict:
        """
        Check if the agent's response violates any company policies.
        Returns: {"violation": bool, "issue": str, "suggestion": str}
        """
        if not policy_context:
            return {"violation": False, "issue": "", "suggestion": ""}

        prompt = f"""You are a compliance officer reviewing a customer support agent's response.

Company policies:
{policy_context}

Agent's response:
"{agent_message}"

Check if the agent's response violates any policy. Return ONLY valid JSON:

{{
    "violation": true or false,
    "issue": "description of the policy violation (empty string if no violation)",
    "suggestion": "how to correct the response to comply with policy (empty string if no violation)"
}}

Do not add explanations outside the JSON.
"""
        text = self._call_llm(prompt, max_tokens=300)
        return self._parse_json(text)

    # ------------------------------------------------------------------ #
    # 4. Full conversation turn (Unified Single-Call Engine)              #
    # ------------------------------------------------------------------ #

    def process_turn(
        self,
        agent_message: str,
        customer_message: str,
        state: ConversationState
    ) -> dict:
        """
        Process one full conversation turn in a single unified ultra-fast LLM call.
        Retrieves knowledge base policies first, then evaluates customer signal,
        response quality scores, coaching guidance, and compliance in one shot.
        """
        start = time.time()

        # Step 1 — Knowledge base vector search
        knowledge_context = ""
        policy_context = ""
        faq_results = []
        policy_results = []

        if self.kb:
            try:
                faq_results = self.kb.search_faqs(customer_message, top_k=2)
                policy_results = self.kb.search_policies(customer_message, top_k=2)

                if faq_results:
                    knowledge_context = "\n".join(r["text"] for r in faq_results)
                if policy_results:
                    policy_context = "\n".join(r["text"] for r in policy_results)
            except Exception as e:
                print(f"KB Search error: {e}")

        # Step 2 — Unified Prompt
        history_context = ""
        if state and state.history:
            history_context = f"\nConversation History:\n{state.get_transcript()}\n"

        unified_prompt = f"""You are OmniDesk AI, an expert real-time customer support coach and compliance officer.
{history_context}
COMPANY POLICIES & FAQS:
{policy_context if policy_context else "Standard customer support guidelines apply."}
{knowledge_context}

LATEST INBOUND CUSTOMER MESSAGE:
"{customer_message}"

AGENT DRAFT RESPONSE:
"{agent_message}"

Analyze the customer message, evaluate the agent draft response, and check compliance.
Return ONLY a valid JSON object with EXACTLY this structure and no other text:

{{
    "analysis": {{
        "sentiment": "positive" or "neutral" or "negative",
        "urgency": "low" or "medium" or "high",
        "escalation_risk": "low" or "medium" or "high",
        "key_issue": "concise plain text summary of main customer issue without emojis"
    }},
    "feedback": {{
        "tone_score": <1-10 integer>,
        "empathy_score": <1-10 integer>,
        "clarity_score": <1-10 integer>,
        "coaching_tip": "One concise, actionable coaching tip for the agent without emojis",
        "knowledge_suggestion": "Relevant policy or FAQ information to share (or empty string)"
    }},
    "compliance": {{
        "violation": true or false,
        "issue": "description of policy violation if any, else empty string",
        "suggestion": "how to correct the draft if violation, else empty string"
    }}
}}"""

        try:
            raw_text = self._call_llm(unified_prompt, max_tokens=450)
            parsed = self._parse_json(raw_text)

            analysis = parsed.get("analysis", {
                "sentiment": "neutral",
                "urgency": "low",
                "escalation_risk": "low",
                "key_issue": "Customer inquiry"
            })
            feedback_data = parsed.get("feedback", {
                "tone_score": 7,
                "empathy_score": 7,
                "clarity_score": 7,
                "coaching_tip": "Clear response structure.",
                "knowledge_suggestion": ""
            })
            compliance = parsed.get("compliance", {
                "violation": False,
                "issue": "",
                "suggestion": ""
            })

        except Exception as e:
            err_str = str(e).lower()
            print(f"LLM Turn Processing Warning: {e}")
            
            # Graceful Fallback Analysis if rate limit or network issue occurs
            is_neg = any(w in customer_message.lower() for w in ["angry", "disappointed", "damaged", "refund", "unacceptable", "terrible", "twice", "charge"])
            analysis = {
                "sentiment": "negative" if is_neg else "neutral",
                "urgency": "high" if is_neg else "low",
                "escalation_risk": "high" if is_neg else "low",
                "key_issue": customer_message[:50] + ("..." if len(customer_message) > 50 else "")
            }
            has_empathy = any(w in agent_message.lower() for w in ["sorry", "apologize", "understand", "help", "resolve"])
            feedback_data = {
                "tone_score": 8 if has_empathy else 6,
                "empathy_score": 9 if has_empathy else 4,
                "clarity_score": 8,
                "coaching_tip": "Acknowledge customer feelings and state a clear resolution path." if not has_empathy else "Well structured and empathetic draft.",
                "knowledge_suggestion": knowledge_context[:100] if knowledge_context else ""
            }
            compliance = {"violation": False, "issue": "", "suggestion": ""}

        # Update conversation state
        state.sentiment = analysis.get("sentiment", "unknown")
        state.urgency = analysis.get("urgency", "unknown")
        state.escalation_risk = analysis.get("escalation_risk", "unknown")
        state.key_issue = analysis.get("key_issue", "")
        state.add_message("customer", customer_message)
        state.add_message("agent", agent_message)

        elapsed = round(time.time() - start, 2)

        return {
            "analysis": analysis,
            "feedback": {
                "tone_score": int(feedback_data.get("tone_score", 7)),
                "empathy_score": int(feedback_data.get("empathy_score", 7)),
                "clarity_score": int(feedback_data.get("clarity_score", 7)),
                "coaching_tip": str(feedback_data.get("coaching_tip", "Clear structure.")),
                "knowledge_suggestion": str(feedback_data.get("knowledge_suggestion", ""))
            },
            "compliance": compliance,
            "faq_results": [r["text"][:200] for r in faq_results],
            "latency_seconds": elapsed,
            "provider": self.provider,
            "model": self.model
        }

    # ------------------------------------------------------------------ #
    # 5. Demo                                                              #
    # ------------------------------------------------------------------ #

    def run_demo(self):
        """Run a demo with sample conversation turns."""
        from .models import ConversationState
        state = ConversationState()

        demo_turns = [
            ("How may I help you today?",
             "I am very disappointed! My order never arrived after 2 weeks!"),
            ("Let me check that for you right away.",
             "This is unacceptable! I want a full refund immediately!"),
            ("I'm sorry for the inconvenience. I'll escalate this right now.",
             "Please resolve this today. I need this urgently."),
        ]

        print("=" * 65)
        print(f"  AICoach ({self.provider.upper()} - {self.model}) — Demo Mode")
        print("=" * 65)

        for agent_msg, customer_msg in demo_turns:
            print(f"\n[Agent]:    {agent_msg}")
            print(f"[Customer]: {customer_msg}")
            print("  ⏳ Analyzing...")

            try:
                result = self.process_turn(agent_msg, customer_msg, state)
                a = result["analysis"]
                f = result["feedback"]
                c = result["compliance"]

                print(f"\n  📊 Analysis: sentiment={a['sentiment']} | "
                      f"urgency={a['urgency']} | escalation={a['escalation_risk']}")
                print(f"  🔑 Key issue: {a['key_issue']}")
                print(f"\n  🎯 Coaching:")
                print(f"     Tone={f['tone_score']}/10 | "
                      f"Empathy={f['empathy_score']}/10 | "
                      f"Clarity={f['clarity_score']}/10")
                print(f"     💡 {f['coaching_tip']}")
                if f['knowledge_suggestion']:
                    print(f"     📚 {f['knowledge_suggestion']}")
                if c['violation']:
                    print(f"     ⚠️  COMPLIANCE: {c['issue']}")

                print(f"  ⏱️  Latency: {result['latency_seconds']}s")

            except Exception as e:
                print(f"  ❌ Error: {e}")

            print("-" * 65)

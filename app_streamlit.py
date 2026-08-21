"""
app_streamlit.py — OmniDesk Copilot for Streamlit Cloud Deployment.

Matches the full-fidelity enterprise dark design of OmniDesk Copilot.
"""

import os
import time
import streamlit as st

# ------------------------------------------------------------------ #
# Load secrets: Streamlit Cloud (st.secrets) takes priority over .env #
# ------------------------------------------------------------------ #
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Inject Streamlit Cloud secrets into environment variables
for _key in ["GROQ_API_KEY", "GROQ_MODEL", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL"]:
    if hasattr(st, "secrets") and _key in st.secrets:
        os.environ[_key] = st.secrets[_key]

from coaching_assistant.models import ConversationState
from server.knowledge_base import get_knowledge_base

st.set_page_config(
    page_title="OmniDesk Copilot — Real-Time Agent Intelligence",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ------------------------------------------------------------------ #
# Custom CSS for Authentic Enterprise Product Styling                #
# ------------------------------------------------------------------ #
st.markdown("""
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
  
  html, body, [class*="css"] {
    font-family: 'Plus Jakarta Sans', -apple-system, sans-serif !important;
  }

  .stApp {
    background-color: #0b0f17;
    color: #f1f5f9;
  }

  /* Header styles */
  .od-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: #0f141f;
    border: 1px solid #1e293b;
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .brand-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 700;
    color: #f1f5f9;
  }

  .brand-logo {
    width: 26px;
    height: 26px;
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
  }

  .ticket-code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    background: #141b29;
    border: 1px solid #1e293b;
    padding: 2px 6px;
    border-radius: 4px;
    color: #60a5fa;
  }

  .priority-badge {
    font-size: 10.5px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 9999px;
    background: rgba(244, 63, 94, 0.12);
    color: #f43f5e;
    border: 1px solid rgba(244, 63, 94, 0.2);
  }

  /* Card Containers */
  .intel-card {
    background: #141b29;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 12px;
  }

  .intel-card-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748b;
    margin-bottom: 8px;
  }

  .intent-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 8px;
  }

  .intent-box {
    background: #0b0f17;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 8px;
  }

  .intent-lbl {
    font-size: 10px;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 600;
  }

  .intent-val {
    font-size: 13px;
    font-weight: 600;
    margin-top: 2px;
  }

  .val-positive { color: #10b981; }
  .val-negative { color: #f43f5e; }
  .val-neutral { color: #f59e0b; }

  /* Advice Box */
  .advice-box {
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.25);
    border-radius: 8px;
    padding: 12px 14px;
    color: #dbeafe;
    font-size: 13px;
    line-height: 1.45;
    margin-bottom: 12px;
  }

  .kb-box {
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.25);
    border-radius: 8px;
    padding: 12px 14px;
    color: #a7f3d0;
    font-size: 12.5px;
    line-height: 1.45;
    margin-bottom: 12px;
  }
</style>
""", unsafe_allow_html=True)


@st.cache_resource
def load_app_resources():
    """Initialize AI Coach and Vector Knowledge Base."""
    kb = get_knowledge_base()
    kb.load()

    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()

    if groq_key and groq_key not in ("your_groq_api_key_here", "your_api_key_here"):
        from coaching_assistant.coach import AICoach
        return AICoach(knowledge_base=kb, provider="groq"), "Groq Engine (Llama-3.3)", kb

    if anthropic_key and anthropic_key not in ("your_anthropic_api_key_here", "your_api_key_here"):
        from coaching_assistant.coach import AICoach
        return AICoach(knowledge_base=kb, provider="claude"), "Claude Engine (Sonnet)", kb

    from coaching_assistant.hf_coach import HFCoach
    return HFCoach(), "HuggingFace Local Pipeline", kb


coach, engine_name, kb = load_app_resources()

# Session State Initialization
if "sessions" not in st.session_state:
    st.session_state.sessions = {
        "TK-8492": {
            "customer": {"name": "Alex Morgan", "email": "alex.morgan@company.io", "plan": "Pro Annual", "value": "$1,240 / yr"},
            "title": "Duplicate Renewal Charge Resolution",
            "history": [
                {"role": "customer", "content": "Hello, I just checked my bank statement and noticed my account was debited twice for the renewal subscription! Please fix this immediately."}
            ],
            "last_result": None
        }
    }

if "active_session_id" not in st.session_state:
    st.session_state.active_session_id = "TK-8492"

if "conv_state" not in st.session_state:
    st.session_state.conv_state = ConversationState()

# Current Active Session Reference
current_sess = st.session_state.sessions.get(st.session_state.active_session_id)
if not current_sess:
    st.session_state.active_session_id = "TK-8492"
    current_sess = st.session_state.sessions["TK-8492"]

# ------------------------------------------------------------------ #
# Sidebar: Sessions History & Customer Context                       #
# ------------------------------------------------------------------ #
with st.sidebar:
    st.markdown("""
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
      <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #2563eb, #7c3aed); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 11px;">OD</div>
      <span style="font-size: 15px; font-weight: 700; color: #f1f5f9;">OmniDesk</span>
    </div>
    """, unsafe_allow_html=True)
    st.caption(f"Active: **{engine_name}**")

    st.divider()

    # Session Management
    st.markdown("<div style='font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px;'>Session Management</div>", unsafe_allow_html=True)
    
    col_s1, col_s2 = st.columns(2)
    with col_s1:
        if st.button("+ New Session", use_container_width=True):
            new_num = 8492 + len(st.session_state.sessions)
            new_id = f"TK-{new_num}"
            st.session_state.sessions[new_id] = {
                "customer": {"name": f"Customer #{new_num}", "email": f"user{new_num}@company.io", "plan": "Enterprise Plus", "value": "$2,400 / yr"},
                "title": f"Inquiry #{new_num}",
                "history": [{"role": "customer", "content": "Hello, I need assistance with our billing statement."}],
                "last_result": None
            }
            st.session_state.active_session_id = new_id
            st.rerun()

    with col_s2:
        if st.button("Delete Ticket", use_container_width=True):
            if len(st.session_state.sessions) > 1:
                del st.session_state.sessions[st.session_state.active_session_id]
                st.session_state.active_session_id = next(iter(st.session_state.sessions.keys()))
                st.rerun()
            else:
                st.warning("Cannot delete last remaining ticket.")

    # Sessions List
    session_options = list(st.session_state.sessions.keys())
    selected_sess = st.selectbox(
        "Select Active Ticket:",
        session_options,
        index=session_options.index(st.session_state.active_session_id) if st.session_state.active_session_id in session_options else 0
    )
    if selected_sess != st.session_state.active_session_id:
        st.session_state.active_session_id = selected_sess
        st.rerun()

    st.divider()

    # Customer Profile Box
    cust = current_sess["customer"]
    st.markdown(f"""
    <div style="background: #141b29; border: 1px solid #1e293b; border-radius: 8px; padding: 12px;">
      <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Customer Profile</div>
      <div style="font-size: 13.5px; font-weight: 600; color: #f1f5f9;">{cust['name']}</div>
      <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">{cust['email']}</div>
      <div style="display: flex; justify-content: space-between; font-size: 11.5px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px;">
        <span style="color: #64748b;">Plan:</span>
        <span style="color: #60a5fa; font-weight: 600;">{cust['plan']}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 11.5px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px;">
        <span style="color: #64748b;">Account Value:</span>
        <span style="color: #cbd5e1; font-weight: 600;">{cust['value']}</span>
      </div>
    </div>
    """, unsafe_allow_html=True)

# ------------------------------------------------------------------ #
# Main Top Bar                                                       #
# ------------------------------------------------------------------ #
st.markdown(f"""
<div class="od-topbar">
  <div class="brand-badge">
    <span class="brand-logo">OD</span>
    <span>Ticket</span>
    <span class="ticket-code">#{st.session_state.active_session_id}</span>
    <span>{current_sess['title']}</span>
    <span class="priority-badge">Priority High</span>
  </div>
  <div style="font-size: 11px; color: #10b981; font-weight: 600;">Live Session Active</div>
</div>
""", unsafe_allow_html=True)

# ------------------------------------------------------------------ #
# Two-Column Workbench (Conversation Timeline & AI Copilot)          #
# ------------------------------------------------------------------ #
col_chat, col_copilot = st.columns([1.15, 0.85], gap="large")

with col_chat:
    st.markdown("<div style='font-size: 12px; color: #64748b; margin-bottom: 8px;'>Conversation Timeline & Real-Time Transcript</div>", unsafe_allow_html=True)
    
    # Message Timeline
    for msg in current_sess["history"]:
        if msg["role"] == "customer":
            st.markdown(f"""
            <div style="display: flex; gap: 8px; margin-bottom: 10px; max-width: 90%;">
              <div style="width: 28px; height: 28px; border-radius: 9999px; background: #334155; color: #f8fafc; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; flex-shrink: 0;">AM</div>
              <div style="background: #141b29; border: 1px solid #1e293b; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #f1f5f9; line-height: 1.45;">
                <div style="font-size: 10.5px; font-weight: 600; color: #64748b; margin-bottom: 3px;">{cust['name']}</div>
                {msg['content']}
              </div>
            </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown(f"""
            <div style="display: flex; gap: 8px; margin-bottom: 10px; justify-content: flex-end;">
              <div style="background: #1e3a8a; border: 1px solid #2563eb; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #ffffff; line-height: 1.45; max-width: 90%;">
                <div style="font-size: 10.5px; font-weight: 600; color: #bfdbfe; margin-bottom: 3px; text-align: right;">Support Agent (You)</div>
                {msg['content']}
              </div>
              <div style="width: 28px; height: 28px; border-radius: 9999px; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; flex-shrink: 0;">AG</div>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("<hr style='border: none; border-top: 1px solid #1e293b; margin: 16px 0;'>", unsafe_allow_html=True)

    # Smart Composer
    st.markdown("<div style='font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;'>Smart Message Composer</div>", unsafe_allow_html=True)

    inbound_customer = st.text_area(
        "Customer Inbound Message:",
        placeholder="Type or paste inbound customer inquiry...",
        height=65,
        key="st_cust_input"
    )

    draft_agent = st.text_area(
        "Agent Response (Draft):",
        placeholder="Draft your proposed response to the customer...",
        height=65,
        key="st_agent_input"
    )

    if st.button("Analyze & Send Response", type="primary", use_container_width=True):
        if not inbound_customer.strip() or not draft_agent.strip():
            st.warning("Please provide both the customer message and agent draft.")
        else:
            with st.spinner("OmniDesk Copilot analyzing exchange in real-time..."):
                t0 = time.time()
                if hasattr(coach, "process_turn"):
                    result = coach.process_turn(draft_agent, inbound_customer, st.session_state.conv_state)
                else:
                    sentiment = coach.analyze_sentiment(inbound_customer)
                    intent = coach.classify_intent(inbound_customer)
                    feedback_list = coach.generate_coaching_feedback(draft_agent, inbound_customer)
                    result = {
                        "analysis": {
                            "sentiment": sentiment["label"].lower(),
                            "urgency": "high" if sentiment["label"] == "NEGATIVE" else "low",
                            "escalation_risk": "high" if sentiment["label"] == "NEGATIVE" else "low",
                            "key_issue": intent
                        },
                        "feedback": {
                            "tone_score": 8,
                            "empathy_score": 8,
                            "clarity_score": 8,
                            "coaching_tip": feedback_list[0] if feedback_list else "Well structured response.",
                            "knowledge_suggestion": feedback_list[1] if len(feedback_list) > 1 else ""
                        },
                        "compliance": {"violation": False, "issue": "", "suggestion": ""},
                        "latency_seconds": round(time.time() - t0, 3)
                    }

                current_sess["history"].append({"role": "customer", "content": inbound_customer})
                current_sess["history"].append({"role": "agent", "content": draft_agent})
                current_sess["last_result"] = result
                st.rerun()

with col_copilot:
    st.markdown("<div style='font-size: 13px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;'>Real-Time Coaching Copilot</div>", unsafe_allow_html=True)

    if current_sess["last_result"]:
        res = current_sess["last_result"]
        a = res.get("analysis", {})
        f = res.get("feedback", {})
        c = res.get("compliance", {})
        latency = res.get("latency_seconds", "0.4")

        # 1. Customer Signal Box
        sent = (a.get("sentiment") or "neutral").lower()
        sent_cls = "val-positive" if sent == "positive" else "val-negative" if sent == "negative" else "val-neutral"

        urg = (a.get("urgency") or "low").lower()
        urg_cls = "val-negative" if urg == "high" else "val-positive"

        risk = (a.get("escalation_risk") or "low").lower()
        risk_cls = "val-negative" if risk == "high" else "val-positive"

        clean_issue = (a.get("key_issue") or "Account Inquiry").replace("🔑", "").replace("🎯", "").strip()
        clean_tip = (f.get("coaching_tip") or "Clear response structure.").replace("🔑", "").replace("🎯", "").strip()

        st.markdown(f"""
        <div class="intel-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span class="intel-card-title">Customer Signal Analysis</span>
            <span style="font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #64748b; background: #0b0f17; padding: 2px 6px; border-radius: 4px;">{latency}s</span>
          </div>
          <div class="intent-grid">
            <div class="intent-box">
              <div class="intent-lbl">Sentiment</div>
              <div class="intent-val {sent_cls}">{sent.capitalize()}</div>
            </div>
            <div class="intent-box">
              <div class="intent-lbl">Urgency</div>
              <div class="intent-val {urg_cls}">{urg.capitalize()}</div>
            </div>
            <div class="intent-box" style="grid-column: 1/-1;">
              <div class="intent-lbl">Escalation Risk</div>
              <div class="intent-val {risk_cls}">{risk.capitalize()}</div>
            </div>
          </div>
          <div style="font-size: 12px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.04); padding-top: 6px;">
            <strong style="color: #cbd5e1;">Issue:</strong> {clean_issue}
          </div>
        </div>
        """, unsafe_allow_html=True)

        # 2. Quality Scores
        t_score = f.get("tone_score", 0)
        e_score = f.get("empathy_score", 0)
        c_score = f.get("clarity_score", 0)

        st.markdown("""
        <div class="intel-card">
          <div class="intel-card-title">Response Quality Scores</div>
        </div>
        """, unsafe_allow_html=True)

        st.write(f"Tone Alignment: **{t_score}/10**")
        st.progress(min(t_score / 10.0, 1.0))

        st.write(f"Customer Empathy: **{e_score}/10**")
        st.progress(min(e_score / 10.0, 1.0))

        st.write(f"Clarity & Directness: **{c_score}/10**")
        st.progress(min(c_score / 10.0, 1.0))

        # 3. Coaching Recommendation
        st.markdown(f"""
        <div class="advice-box">
          <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #60a5fa; margin-bottom: 4px;">Coaching Recommendation</div>
          <div>{clean_tip}</div>
        </div>
        """, unsafe_allow_html=True)

        # 4. Knowledge Base Match
        kb_sugg = f.get("knowledge_suggestion", "")
        if kb_sugg:
            st.markdown(f"""
            <div class="kb-box">
              <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #34d399; margin-bottom: 4px;">Relevant Knowledge Base Match</div>
              <div>{kb_sugg}</div>
            </div>
            """, unsafe_allow_html=True)

        # 5. Compliance Violation
        if c.get("violation"):
            st.error(f"⚠️ Compliance Alert: {c.get('issue')}\n\nRecommended fix: {c.get('suggestion')}")
    else:
        st.markdown("""
        <div style="background: #141b29; border: 1px solid #1e293b; border-radius: 8px; padding: 24px 16px; text-align: center; color: #64748b; font-size: 12.5px;">
          Send a conversation turn to generate live sentiment analysis, coaching guidance, and FAQ suggestions.
        </div>
        """, unsafe_allow_html=True)

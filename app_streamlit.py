"""
app_streamlit.py — OmniDesk Copilot for Streamlit Cloud Deployment.

100% Zero-Default Dynamic AI Customer Support Coaching Workspace.
No hardcoded initial sessions. Start fresh on demand.
"""

import os
import time
from datetime import datetime
import streamlit as st

# ------------------------------------------------------------------ #
# Load secrets: Streamlit Cloud (st.secrets) takes priority over .env #
# ------------------------------------------------------------------ #
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

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
# Master CSS: Enterprise Dark Design System                          #
# ------------------------------------------------------------------ #
st.markdown("""
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
  
  html, body, [class*="css"], .stApp {
    font-family: 'Plus Jakarta Sans', -apple-system, sans-serif !important;
    background-color: #0b0f17 !important;
    color: #f1f5f9 !important;
  }

  .block-container {
    padding-top: 1rem !important;
    padding-bottom: 2rem !important;
    max-width: 100% !important;
  }

  [data-testid="stSidebar"] {
    background-color: #0f141f !important;
    border-right: 1px solid #1e293b !important;
  }

  /* Top Navigation Bar */
  .od-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 18px;
    background: #0f141f;
    border: 1px solid #1e293b;
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .nav-left-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand-icon {
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11.5px;
    font-weight: 700;
    color: #fff;
  }

  .brand-title {
    font-size: 15px;
    font-weight: 700;
    color: #f1f5f9;
  }

  .ticket-crumb {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #64748b;
    border-left: 1px solid #1e293b;
    padding-left: 12px;
  }

  .ticket-code-pill {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    background: #141b29;
    border: 1px solid #1e293b;
    padding: 2px 7px;
    border-radius: 4px;
    color: #60a5fa;
    font-weight: 600;
  }

  .priority-badge-red {
    font-size: 10.5px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 9999px;
    background: rgba(244, 63, 94, 0.12);
    color: #f43f5e;
    border: 1px solid rgba(244, 63, 94, 0.25);
  }

  .engine-status-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #141b29;
    border: 1px solid #1e293b;
    padding: 4px 12px;
    border-radius: 9999px;
    font-size: 11.5px;
    color: #94a3b8;
    font-weight: 500;
  }

  .status-dot-green {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
  }

  /* History Cards */
  .pill-neg {
    font-size: 9.5px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 9999px;
    background: rgba(244, 63, 94, 0.15);
    color: #f43f5e;
  }

  .pill-neu {
    font-size: 9.5px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 9999px;
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
  }

  .pill-pos {
    font-size: 9.5px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 9999px;
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
  }

  /* Customer Context Card */
  .profile-box {
    background: #141b29;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 12px;
    margin-top: 14px;
  }

  .user-avatar-circle {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #334155;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 11.5px;
    color: #f8fafc;
    border: 1px solid #1e293b;
  }

  /* Copilot Intel Cards */
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
    padding: 8px 10px;
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

  /* Coaching Recommendation */
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

  /* Supervisor Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    margin-top: 8px;
  }

  .stat-box {
    background: #0b0f17;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 8px 6px;
    text-align: center;
  }

  .stat-val {
    font-size: 14px;
    font-weight: 700;
    color: #60a5fa;
  }

  .stat-lbl {
    font-size: 9.5px;
    color: #64748b;
    text-transform: uppercase;
    margin-top: 2px;
  }

  /* Welcome Banner */
  .welcome-hero {
    background: #141b29;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 36px 28px;
    text-align: center;
    margin-top: 20px;
  }

  .welcome-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(59, 130, 246, 0.12);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #60a5fa;
    font-size: 11.5px;
    font-weight: 600;
    padding: 3px 12px;
    border-radius: 9999px;
    margin-bottom: 16px;
  }

  /* Custom Buttons */
  div.stButton > button:first-child {
    background: #141b29;
    border: 1px solid #1e293b;
    color: #cbd5e1;
    font-weight: 600;
    border-radius: 6px;
    transition: all 0.15s ease;
  }

  div.stButton > button:first-child:hover {
    background: #1e293b;
    color: #fff;
    border-color: #3b82f6;
  }

  div.stButton > button[kind="primary"] {
    background: #2563eb !important;
    border: 1px solid #3b82f6 !important;
    color: #fff !important;
    font-weight: 600 !important;
  }

  div.stButton > button[kind="primary"]:hover {
    background: #1d4ed8 !important;
  }

  /* Text inputs styling */
  .stTextArea textarea {
    background-color: #0f141f !important;
    border: 1px solid #1e293b !important;
    color: #f1f5f9 !important;
    border-radius: 6px !important;
    font-size: 13px !important;
  }

  .stTextArea textarea:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 1px #3b82f6 !important;
  }
</style>
""", unsafe_allow_html=True)


# ------------------------------------------------------------------ #
# AI Engine Loader                                                   #
# ------------------------------------------------------------------ #
@st.cache_resource
def load_app_resources():
    """Initialize AI Coach and Vector Knowledge Base."""
    kb = get_knowledge_base()
    kb.load()

    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()

    if groq_key and groq_key not in ("your_groq_api_key_here", "your_api_key_here"):
        from coaching_assistant.coach import AICoach
        return AICoach(knowledge_base=kb, provider="groq"), "Groq Engine (Llama-3.1)", kb

    if anthropic_key and anthropic_key not in ("your_anthropic_api_key_here", "your_api_key_here"):
        from coaching_assistant.coach import AICoach
        return AICoach(knowledge_base=kb, provider="claude"), "Claude Engine (Sonnet)", kb

    from coaching_assistant.hf_coach import HFCoach
    return HFCoach(), "HuggingFace Local Pipeline", kb


coach, engine_name, kb = load_app_resources()

# Standard Customer Pool for Instant Dynamic Session Generation
CUSTOMER_POOL = [
    {
        "name": "Alex Morgan",
        "email": "alex.morgan@company.io",
        "plan": "Pro Annual",
        "value": "$1,240 / yr",
        "initial_msg": "Hello, I just noticed my account was debited twice for the renewal subscription! Please fix this immediately.",
        "title": "Duplicate Renewal Charge Resolution"
    },
    {
        "name": "Jessica Taylor",
        "email": "j.taylor@techhub.net",
        "plan": "Enterprise Plus",
        "value": "$3,600 / yr",
        "initial_msg": "Hi, I wanted to ask if you offer volume discounts on additional user seats for our engineering team.",
        "title": "Enterprise Seat Volume Discount"
    },
    {
        "name": "Liam Vance",
        "email": "liam.vance@gmail.com",
        "plan": "Starter Monthly",
        "value": "$240 / yr",
        "initial_msg": "My package tracking shows delivered, but I have not received it yet. Can someone investigate?",
        "title": "Missing Delivery Tracking Inquiry"
    },
    {
        "name": "Elena Rostova",
        "email": "elena.r@innovate.co",
        "plan": "Pro Annual",
        "value": "$1,450 / yr",
        "initial_msg": "Thank you for the update! I need assistance reviewing our annual SLA compliance report.",
        "title": "SLA Compliance Review Request"
    }
]

# ------------------------------------------------------------------ #
# Session State Initialization (100% Dynamic - Empty by Default)     #
# ------------------------------------------------------------------ #
if "session_counter" not in st.session_state:
    st.session_state.session_counter = 8491

# Empty by default — user creates sessions on demand!
if "sessions" not in st.session_state:
    st.session_state.sessions = {}

if "active_session_id" not in st.session_state:
    st.session_state.active_session_id = None

if "custom_modal_open" not in st.session_state:
    st.session_state.custom_modal_open = False

if "draft_prefill" not in st.session_state:
    st.session_state.draft_prefill = ""

if "supervisor_history" not in st.session_state:
    st.session_state.supervisor_history = []


def create_new_instant_session():
    """Dynamically spawn a new customer support ticket."""
    st.session_state.session_counter += 1
    new_num = st.session_state.session_counter
    new_id = f"TK-{new_num}"
    cust_idx = (new_num - 8492) % len(CUSTOMER_POOL)
    p_cust = CUSTOMER_POOL[cust_idx]
    inits = "".join([part[0] for part in p_cust["name"].split()[:2]]).upper()

    st.session_state.sessions[new_id] = {
        "customer": {
            "name": p_cust["name"],
            "email": p_cust["email"],
            "plan": p_cust["plan"],
            "value": p_cust["value"],
            "initials": inits
        },
        "title": p_cust["title"],
        "history": [{"role": "customer", "content": p_cust["initial_msg"]}],
        "last_result": None,
        "sentiment": "neutral",
        "time": datetime.now().strftime("%I:%M %p"),
        "conv_state": ConversationState()
    }
    st.session_state.active_session_id = new_id


current_sess = None
if st.session_state.active_session_id and st.session_state.active_session_id in st.session_state.sessions:
    current_sess = st.session_state.sessions[st.session_state.active_session_id]
elif len(st.session_state.sessions) > 0:
    st.session_state.active_session_id = next(iter(st.session_state.sessions.keys()))
    current_sess = st.session_state.sessions[st.session_state.active_session_id]
else:
    st.session_state.active_session_id = None


# ------------------------------------------------------------------ #
# Sidebar: Dynamic Sessions History & Active Customer Context        #
# ------------------------------------------------------------------ #
with st.sidebar:
    st.markdown("""
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
      <div class="brand-icon">OD</div>
      <span style="font-size: 15px; font-weight: 700; color: #f1f5f9;">OmniDesk</span>
    </div>
    """, unsafe_allow_html=True)

    col_btn1, col_btn2 = st.columns([1.4, 1])
    with col_btn1:
        if st.button("+ New Session", use_container_width=True, type="primary"):
            create_new_instant_session()
            st.rerun()

    with col_btn2:
        if st.button("Custom", use_container_width=True):
            st.session_state.custom_modal_open = not st.session_state.custom_modal_open
            st.rerun()

    # Dynamic Custom Ticket Creator Form (when toggled)
    if st.session_state.custom_modal_open:
        with st.expander("Create Custom Ticket", expanded=True):
            c_name = st.text_input("Customer Name:", value="David Kim")
            c_email = st.text_input("Email:", value="david.kim@acme.corp")
            c_plan = st.selectbox("Plan:", ["Starter ($240/yr)", "Pro ($1,200/yr)", "Enterprise ($3,600/yr)"])
            c_title = st.text_input("Ticket Title:", value="Billing & Invoicing Clarification")
            c_msg = st.text_area("Initial Customer Inquiry:", value="Hi team, could you please provide a breakdown of the recent invoice charges?")
            
            if st.button("Submit Ticket", type="primary", use_container_width=True):
                st.session_state.session_counter += 1
                new_num = st.session_state.session_counter
                new_id = f"TK-{new_num}"
                inits = "".join([part[0] for part in c_name.split()[:2]]).upper() or "CU"

                st.session_state.sessions[new_id] = {
                    "customer": {
                        "name": c_name,
                        "email": c_email,
                        "plan": c_plan.split("(")[0].strip(),
                        "value": c_plan.split("(")[-1].replace(")", "").strip() if "(" in c_plan else "$1,200 / yr",
                        "initials": inits
                    },
                    "title": c_title,
                    "history": [{"role": "customer", "content": c_msg}],
                    "last_result": None,
                    "sentiment": "neutral",
                    "time": datetime.now().strftime("%I:%M %p"),
                    "conv_state": ConversationState()
                }
                st.session_state.active_session_id = new_id
                st.session_state.custom_modal_open = False
                st.rerun()

    st.markdown(f"""
    <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.6px; margin: 16px 0 8px 0; display: flex; justify-content: space-between;">
      <span>ACTIVE & RECENT SESSIONS</span>
      <span style="background: #1e293b; padding: 1px 6px; border-radius: 4px; color: #94a3b8;">{len(st.session_state.sessions)}</span>
    </div>
    """, unsafe_allow_html=True)

    if len(st.session_state.sessions) == 0:
        st.caption("No active sessions. Click **+ New Session** or **Custom** above to start.")
    else:
        # Dynamic session card listing
        for s_id, s_data in list(st.session_state.sessions.items()):
            is_active = (s_id == st.session_state.active_session_id)
            pill_cls = "pill-neg" if s_data.get("sentiment") == "negative" else "pill-pos" if s_data.get("sentiment") == "positive" else "pill-neu"
            sent_label = (s_data.get("sentiment") or "neutral").upper()
            turns_count = len(s_data.get("history", [])) // 2

            active_border = "border: 1px solid #3b82f6; background: rgba(59,130,246,0.08);" if is_active else "border: 1px solid #1e293b; background: #141b29;"
            
            st.markdown(f"""
            <div style="{active_border} border-radius: 8px; padding: 8px 10px; margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600; color: #60a5fa;">#{s_id}</span>
                <span class="{pill_cls}">{sent_label}</span>
              </div>
              <div style="font-size: 12.5px; font-weight: 600; color: #f1f5f9; margin-top: 2px;">{s_data['customer']['name']}</div>
              <div style="font-size: 10.5px; color: #64748b; margin-top: 2px; display: flex; justify-content: space-between;">
                <span>{turns_count} turn{'s' if turns_count != 1 else ''}</span>
                <span>{s_data.get('time', 'Just now')}</span>
              </div>
            </div>
            """, unsafe_allow_html=True)

            col_sel, col_del = st.columns([3, 1])
            with col_sel:
                if not is_active and st.button(f"Open #{s_id}", key=f"sel_{s_id}", use_container_width=True):
                    st.session_state.active_session_id = s_id
                    st.rerun()
            with col_del:
                if st.button("✕", key=f"del_{s_id}", help="Delete ticket"):
                    del st.session_state.sessions[s_id]
                    if st.session_state.active_session_id == s_id:
                        st.session_state.active_session_id = next(iter(st.session_state.sessions.keys())) if st.session_state.sessions else None
                    st.rerun()

    # Dynamic Customer Profile Box
    if current_sess:
        cust = current_sess["customer"]
        st.markdown(f"""
        <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.6px; margin: 18px 0 8px 0;">
          ACTIVE CUSTOMER CONTEXT
        </div>
        <div class="profile-box">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div class="user-avatar-circle">{cust.get('initials', 'CU')}</div>
            <div>
              <div style="font-size: 13px; font-weight: 600; color: #f1f5f9;">{cust['name']}</div>
              <div style="font-size: 11px; color: #64748b;">{cust['email']}</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 4px 0; border-top: 1px solid rgba(255,255,255,0.03);">
            <span style="color: #64748b;">Subscription:</span>
            <span style="color: #60a5fa; font-weight: 600; font-family: 'JetBrains Mono', monospace;">{cust['plan']}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 4px 0; border-top: 1px solid rgba(255,255,255,0.03);">
            <span style="color: #64748b;">Account Value:</span>
            <span style="color: #cbd5e1; font-weight: 600; font-family: 'JetBrains Mono', monospace;">{cust['value']}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 4px 0; border-top: 1px solid rgba(255,255,255,0.03);">
            <span style="color: #64748b;">Status:</span>
            <span style="color: #10b981; font-weight: 600;">Active</span>
          </div>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown("""
        <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.6px; margin: 18px 0 8px 0;">
          ACTIVE CUSTOMER CONTEXT
        </div>
        <div class="profile-box" style="text-align: center; color: #64748b; font-size: 12px; padding: 18px 10px;">
          No active customer selected.
        </div>
        """, unsafe_allow_html=True)


# ------------------------------------------------------------------ #
# Top Navigation Bar (Full Width)                                    #
# ------------------------------------------------------------------ #
ticket_crumb_html = ""
if current_sess:
    ticket_crumb_html = f"""
    <div class="ticket-crumb">
      <span>Ticket</span>
      <span class="ticket-code-pill">#{st.session_state.active_session_id}</span>
      <span style="color: #cbd5e1; font-weight: 500;">{current_sess['title']}</span>
      <span class="priority-badge-red">Priority High</span>
    </div>
    """
else:
    ticket_crumb_html = """
    <div class="ticket-crumb">
      <span style="color: #94a3b8; font-weight: 500;">Workspace Ready — Start a Session</span>
    </div>
    """

st.markdown(f"""
<div class="od-topbar">
  <div class="nav-left-brand">
    <div class="brand-icon">OD</div>
    <span class="brand-title">OmniDesk</span>
    {ticket_crumb_html}
  </div>
  <div style="display: flex; align-items: center; gap: 12px;">
    <div class="engine-status-pill">
      <span class="status-dot-green"></span>
      <span>{engine_name}</span>
    </div>
  </div>
</div>
""", unsafe_allow_html=True)


# ------------------------------------------------------------------ #
# Main Workspace: When No Session is Active (Zero-Default Onboarding) #
# ------------------------------------------------------------------ #
if not current_sess:
    st.markdown("""
    <div class="welcome-hero">
      <div class="welcome-badge">⚡ Real-Time Support Copilot</div>
      <h2 style="font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">No Active Customer Session</h2>
      <p style="color: #94a3b8; font-size: 14px; max-width: 540px; margin: 0 auto 24px auto; line-height: 1.5;">
        OmniDesk Copilot is ready. Start a new customer support ticket to evaluate live agent responses, detect sentiment risk, and trigger real-time AI coaching.
      </p>
    </div>
    """, unsafe_allow_html=True)

    w_col1, w_col2 = st.columns([1, 1])
    with w_col1:
        if st.button("🚀 Start Instant Session", type="primary", use_container_width=True):
            create_new_instant_session()
            st.rerun()
    with w_col2:
        if st.button("✍️ Create Custom Ticket", use_container_width=True):
            st.session_state.custom_modal_open = True
            st.rerun()

else:
    # ------------------------------------------------------------------ #
    # Main Two-Column Layout (Middle Chat Timeline + Right AI Copilot)   #
    # ------------------------------------------------------------------ #
    col_chat, col_copilot = st.columns([1.15, 0.85], gap="large")

    with col_chat:
        st.markdown("""
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 12px; color: #64748b;">
          <span>Conversation Timeline & Real-Time Transcript</span>
          <span>Channel: Live Chat</span>
        </div>
        """, unsafe_allow_html=True)

        # Dynamic Chat message stream
        chat_container = st.container()
        with chat_container:
            for msg in current_sess["history"]:
                if msg["role"] == "customer":
                    st.markdown(f"""
                    <div style="display: flex; gap: 10px; margin-bottom: 12px; max-width: 85%;">
                      <div style="width: 28px; height: 28px; border-radius: 50%; background: #3b4252; color: #eceff4; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; flex-shrink: 0;">{current_sess['customer'].get('initials', 'CU')}</div>
                      <div style="display: flex; flex-direction: column; gap: 4px;">
                        <div style="font-size: 11px; font-weight: 600; color: #64748b;">{current_sess['customer']['name']} • Inbound</div>
                        <div style="background: #141b29; border: 1px solid #1e293b; border-radius: 8px; padding: 10px 14px; font-size: 13.5px; color: #f1f5f9; line-height: 1.45;">
                          {msg['content']}
                        </div>
                      </div>
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    st.markdown(f"""
                    <div style="display: flex; gap: 10px; margin-bottom: 12px; justify-content: flex-end;">
                      <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end; max-width: 85%;">
                        <div style="font-size: 11px; font-weight: 600; color: #64748b;">Support Agent (You) • Sent</div>
                        <div style="background: #1e3a8a; border: 1px solid #2563eb; border-radius: 8px; padding: 10px 14px; font-size: 13.5px; color: #ffffff; line-height: 1.45;">
                          {msg['content']}
                        </div>
                      </div>
                      <div style="width: 28px; height: 28px; border-radius: 50%; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; flex-shrink: 0;">AG</div>
                    </div>
                    """, unsafe_allow_html=True)

        st.markdown("<hr style='border: none; border-top: 1px solid #1e293b; margin: 14px 0 10px 0;'>", unsafe_allow_html=True)

        # Dynamic Quick Templates Row
        st.markdown("<div style='font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 6px;'>Quick Templates:</div>", unsafe_allow_html=True)
        t_col1, t_col2, t_col3 = st.columns(3)
        with t_col1:
            if st.button("Apologize & Verify", use_container_width=True):
                st.session_state.draft_prefill = "I apologize for the frustration this has caused. Let me look into your account details and resolve this right away."
                st.rerun()
        with t_col2:
            if st.button("Delight & Assist", use_container_width=True):
                st.session_state.draft_prefill = "Thank you for reaching out! I'd be more than happy to help you with this today."
                st.rerun()
        with t_col3:
            if st.button("Confirm Update", use_container_width=True):
                st.session_state.draft_prefill = "I have checked your account and confirmed the update. A confirmation has been sent to your email."
                st.rerun()

        # Dynamic Side-by-Side Composer Grid
        comp_col1, comp_col2 = st.columns(2)
        with comp_col1:
            inbound_customer = st.text_area(
                "CUSTOMER MESSAGE (INBOUND)",
                placeholder="Paste or type customer's message...",
                height=85,
                key="st_cust_input"
            )
        with comp_col2:
            draft_agent = st.text_area(
                "AGENT RESPONSE (DRAFT)",
                value=st.session_state.draft_prefill or "",
                placeholder="Draft your response to the customer...",
                height=85,
                key="st_agent_input"
            )

        # Action Bar: Shortcut Hint + Primary Button + Clear Chat
        act_col1, act_col2, act_col3 = st.columns([1.2, 1, 0.6])
        with act_col1:
            st.caption("Press Ctrl + Enter to analyze & send")
        with act_col2:
            send_clicked = st.button("Analyze & Send Response", type="primary", use_container_width=True)
        with act_col3:
            if st.button("Clear Chat", use_container_width=True):
                current_sess["history"] = current_sess["history"][:1]
                current_sess["last_result"] = None
                st.rerun()

        if send_clicked:
            if not inbound_customer.strip() or not draft_agent.strip():
                st.warning("Please provide both the customer message and agent draft.")
            else:
                with st.spinner("OmniDesk Copilot analyzing in real-time..."):
                    t0 = time.time()
                    c_state = current_sess.get("conv_state", ConversationState())

                    if hasattr(coach, "process_turn"):
                        result = coach.process_turn(draft_agent, inbound_customer, c_state)
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
                    current_sess["sentiment"] = result.get("analysis", {}).get("sentiment", "neutral")
                    
                    st.session_state.supervisor_history.append({
                        "tone": result.get("feedback", {}).get("tone_score", 7),
                        "empathy": result.get("feedback", {}).get("empathy_score", 7),
                        "clarity": result.get("feedback", {}).get("clarity_score", 7),
                        "escalation": result.get("analysis", {}).get("escalation_risk") == "high"
                    })

                    st.session_state.draft_prefill = ""
                    st.rerun()


    # ------------------------------------------------------------------ #
    # Right Column: Real-Time Dynamic Coaching Copilot                   #
    # ------------------------------------------------------------------ #
    with col_copilot:
        res = current_sess.get("last_result")
        latency_str = f"{res.get('latency_seconds', '0.42')}s" if res else "Real-Time"

        st.markdown(f"""
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 14px; font-weight: 700; color: #f1f5f9;">Real-Time Coaching Copilot</span>
          <span style="font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #64748b; background: #141b29; border: 1px solid #1e293b; padding: 2px 8px; border-radius: 4px;">{latency_str}</span>
        </div>
        """, unsafe_allow_html=True)

        if res:
            a = res.get("analysis", {})
            f = res.get("feedback", {})
            c = res.get("compliance", {})

            # 1. Customer Signal Box
            sent = (a.get("sentiment") or "neutral").lower()
            sent_cls = "val-positive" if sent == "positive" else "val-negative" if sent == "negative" else "val-neutral"

            urg = (a.get("urgency") or "low").lower()
            urg_cls = "val-negative" if urg == "high" else "val-neutral" if urg == "medium" else "val-positive"

            risk = (a.get("escalation_risk") or "low").lower()
            risk_cls = "val-negative" if risk == "high" else "val-positive"

            clean_issue = (a.get("key_issue") or "Inquiry Resolution").replace("🔑", "").replace("🎯", "").strip()
            clean_tip = (f.get("coaching_tip") or "Clear response structure.").replace("🔑", "").replace("🎯", "").strip()

            st.markdown(f"""
            <div class="intel-card">
              <div class="intel-card-title">CUSTOMER SIGNAL ANALYSIS</div>
              <div class="intent-grid">
                <div class="intent-box">
                  <div class="intent-lbl">SENTIMENT</div>
                  <div class="intent-val {sent_cls}">{sent.capitalize()}</div>
                </div>
                <div class="intent-box">
                  <div class="intent-lbl">URGENCY</div>
                  <div class="intent-val {urg_cls}">{urg.capitalize()}</div>
                </div>
                <div class="intent-box" style="grid-column: 1/-1;">
                  <div class="intent-lbl">ESCALATION RISK</div>
                  <div class="intent-val {risk_cls}">{risk.capitalize()}</div>
                </div>
              </div>
              <div style="font-size: 12px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.04); padding-top: 6px;">
                <strong style="color: #64748b; font-size: 11px;">Identified Issue:</strong> <span style="color: #cbd5e1;">{clean_issue}</span>
              </div>
            </div>
            """, unsafe_allow_html=True)

            # 2. Quality Scores
            t_score = f.get("tone_score", 0)
            e_score = f.get("empathy_score", 0)
            c_score = f.get("clarity_score", 0)

            st.markdown("""
            <div class="intel-card">
              <div class="intel-card-title">RESPONSE QUALITY SCORES</div>
            </div>
            """, unsafe_allow_html=True)

            st.markdown(f"<div style='display:flex; justify-content:space-between; font-size:12px; margin-bottom:2px;'><span>Tone Alignment</span><span style='color:#60a5fa; font-weight:700;'>{t_score}/10</span></div>", unsafe_allow_html=True)
            st.progress(min(t_score / 10.0, 1.0))

            st.markdown(f"<div style='display:flex; justify-content:space-between; font-size:12px; margin-bottom:2px;'><span>Customer Empathy</span><span style='color:#10b981; font-weight:700;'>{e_score}/10</span></div>", unsafe_allow_html=True)
            st.progress(min(e_score / 10.0, 1.0))

            st.markdown(f"<div style='display:flex; justify-content:space-between; font-size:12px; margin-bottom:2px;'><span>Clarity & Directness</span><span style='color:#f59e0b; font-weight:700;'>{c_score}/10</span></div>", unsafe_allow_html=True)
            st.progress(min(c_score / 10.0, 1.0))

            # 3. Coaching Recommendation
            st.markdown(f"""
            <div class="advice-box" style="margin-top: 12px;">
              <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #60a5fa; margin-bottom: 4px;">COACHING RECOMMENDATION</div>
              <div>{clean_tip}</div>
            </div>
            """, unsafe_allow_html=True)

            # 4. Knowledge Base Match
            kb_sugg = f.get("knowledge_suggestion", "")
            if kb_sugg:
                st.markdown(f"""
                <div class="kb-box">
                  <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #34d399; margin-bottom: 4px;">RELEVANT KNOWLEDGE BASE MATCH</div>
                  <div>{kb_sugg}</div>
                </div>
                """, unsafe_allow_html=True)

            # 5. Compliance Violation
            if c.get("violation"):
                st.error(f"⚠️ Compliance Alert: {c.get('issue')}\n\nRecommended fix: {c.get('suggestion')}")

        else:
            st.markdown("""
            <div style="background: #141b29; border: 1px solid #1e293b; border-radius: 8px; padding: 28px 16px; text-align: center; color: #64748b; font-size: 12.5px;">
              Send a conversation turn to generate live sentiment analysis, coaching guidance, and FAQ suggestions.
            </div>
            """, unsafe_allow_html=True)

        # 6. Dynamic Session Quality Supervisor Metrics
        sh = st.session_state.supervisor_history
        if sh:
            avg_t = round(sum(item["tone"] for item in sh) / len(sh), 1)
            avg_e = round(sum(item["empathy"] for item in sh) / len(sh), 1)
            avg_c = round(sum(item["clarity"] for item in sh) / len(sh), 1)
            tot_turns = len(sh)
        else:
            avg_t, avg_e, avg_c, tot_turns = "-", "-", "-", 0

        st.markdown(f"""
        <div class="intel-card" style="margin-top: 14px;">
          <div class="intel-card-title">SESSION QUALITY METRICS</div>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-val">{avg_t}</div>
              <div class="stat-lbl">Avg Tone</div>
            </div>
            <div class="stat-box">
              <div class="stat-val">{avg_e}</div>
              <div class="stat-lbl">Empathy</div>
            </div>
            <div class="stat-box">
              <div class="stat-val">{avg_c}</div>
              <div class="stat-lbl">Clarity</div>
            </div>
            <div class="stat-box">
              <div class="stat-val">{tot_turns}</div>
              <div class="stat-lbl">Evaluations</div>
            </div>
          </div>
        </div>
        """, unsafe_allow_html=True)

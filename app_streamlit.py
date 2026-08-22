"""
app_streamlit.py — OmniDesk Copilot for Streamlit Cloud Deployment.
UI pixel-matched to frontend/index.html (the Flask version).
"""

import os
import time
from datetime import datetime
import streamlit as st

# ── Load secrets: Streamlit Cloud (st.secrets) takes priority over .env ──
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    for _key in ["GROQ_API_KEY", "GROQ_MODEL", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL"]:
        if hasattr(st, "secrets") and _key in st.secrets:
            os.environ[_key] = st.secrets[_key]
except Exception:
    pass  # No secrets.toml — using .env file instead

from coaching_assistant.models import ConversationState
from server.knowledge_base import get_knowledge_base

# ── Page Config ────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="OmniDesk Copilot — Real-Time Agent Intelligence",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ══════════════════════════════════════════════════════════════════════════
#  DESIGN SYSTEM CSS — Pixel-matched to frontend/index.html
# ══════════════════════════════════════════════════════════════════════════
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

/* ── CSS Custom Properties (identical to index.html :root) ── */
:root {
  --bg-app:         #0b0f17;
  --bg-sidebar:     #0f141f;
  --bg-surface:     #141b29;
  --bg-elevated:    #1a2335;
  --bg-hover:       #222d42;
  --border-subtle:  #1e293b;
  --border-strong:  #2a3850;
  --primary:        #3b82f6;
  --primary-hover:  #2563eb;
  --primary-subtle: rgba(59,130,246,0.12);
  --emerald:        #10b981;
  --emerald-subtle: rgba(16,185,129,0.12);
  --amber:          #f59e0b;
  --amber-subtle:   rgba(245,158,11,0.12);
  --rose:           #f43f5e;
  --rose-subtle:    rgba(244,63,94,0.12);
  --text-main:      #f1f5f9;
  --text-muted:     #94a3b8;
  --text-subtle:    #64748b;
  --font-ui:        'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-code:      'JetBrains Mono', monospace;
  --radius-sm:      6px;
  --radius-md:      8px;
  --radius-lg:      12px;
  --radius-full:    9999px;
}

/* ── Base ── */
html, body, .stApp,
[data-testid="stAppViewContainer"],
[data-testid="stMain"] {
  font-family: var(--font-ui) !important;
  background: var(--bg-app) !important;
  color: var(--text-main) !important;
}

/* ── Hide ALL Streamlit chrome ── */
header[data-testid="stHeader"],
footer,
[data-testid="stToolbar"],
[data-testid="stDecoration"],
[data-testid="stStatusWidget"] { display: none !important; }
#MainMenu { visibility: hidden; }

/* ── Layout Reset ── */
.block-container { padding: 0.8rem 1.5rem 1.5rem 1.5rem !important; max-width: 100% !important; }

/* ── Sidebar = sidebar-context from index.html ── */
[data-testid="stSidebar"] {
  min-width: 300px !important;
  max-width: 320px !important;
  background: var(--bg-sidebar) !important;
  border-right: 1px solid var(--border-subtle) !important;
}
[data-testid="stSidebar"] > div:first-child { padding-top: 0 !important; }

/* ── Streamlit Buttons → action-btn style ── */
div.stButton > button {
  background: var(--bg-surface) !important;
  border: 1px solid var(--border-strong) !important;
  color: var(--text-muted) !important;
  border-radius: var(--radius-sm) !important;
  font-family: var(--font-ui) !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  white-space: nowrap !important;
  padding: 6px 12px !important;
  transition: all 0.15s ease !important;
}
div.stButton > button:hover {
  background: var(--bg-hover) !important;
  color: var(--text-main) !important;
}
div.stButton > button[kind="primary"] {
  background: var(--primary) !important;
  border: 1px solid var(--primary) !important;
  color: #fff !important;
}
div.stButton > button[kind="primary"]:hover { background: var(--primary-hover) !important; }

/* ── Text Areas → composer-textarea style ── */
.stTextArea label p {
  font-size: 10.5px !important; font-weight: 700 !important;
  color: var(--text-subtle) !important; text-transform: uppercase !important;
  letter-spacing: 0.3px !important;
}
.stTextArea textarea {
  background: var(--bg-app) !important;
  border: 1px solid var(--border-strong) !important;
  border-radius: var(--radius-sm) !important;
  color: var(--text-main) !important;
  font-family: var(--font-ui) !important;
  font-size: 12.5px !important;
  resize: none !important;
  line-height: 1.4 !important;
}
.stTextArea textarea:focus {
  border-color: var(--primary) !important;
  box-shadow: none !important;
}

/* ── Text Inputs → modal-input style ── */
.stTextInput label p {
  font-size: 11px !important; font-weight: 600 !important;
  color: var(--text-muted) !important; text-transform: uppercase !important;
}
.stTextInput input {
  background: var(--bg-app) !important;
  border: 1px solid var(--border-strong) !important;
  border-radius: var(--radius-sm) !important;
  color: var(--text-main) !important;
  font-size: 13px !important;
}
.stTextInput input:focus { border-color: var(--primary) !important; box-shadow: none !important; }

/* ── Selectbox ── */
.stSelectbox label p {
  font-size: 11px !important; font-weight: 600 !important;
  color: var(--text-muted) !important; text-transform: uppercase !important;
}
[data-baseweb="select"] > div {
  background: var(--bg-app) !important;
  border: 1px solid var(--border-strong) !important;
  border-radius: var(--radius-sm) !important;
}
[data-baseweb="select"] span { color: var(--text-main) !important; }
[data-baseweb="popover"] { background: var(--bg-surface) !important; border: 1px solid var(--border-subtle) !important; }
[data-baseweb="menu"] li { background: var(--bg-surface) !important; color: var(--text-main) !important; }
[data-baseweb="menu"] li:hover { background: var(--bg-hover) !important; }

/* ── Expander ── */
[data-testid="stExpander"] {
  background: var(--bg-surface) !important;
  border: 1px solid var(--border-subtle) !important;
  border-radius: var(--radius-md) !important;
}
[data-testid="stExpander"] summary { color: var(--text-main) !important; font-weight: 600 !important; font-size: 13px !important; }
[data-testid="stExpander"] summary svg { fill: var(--text-subtle) !important; }

/* ── Caption / Alert / Spinner ── */
.stCaption { color: var(--text-subtle) !important; font-size: 11px !important; }
[data-testid="stAlert"] {
  background: rgba(244,63,94,0.08) !important;
  border: 1px solid rgba(244,63,94,0.3) !important;
  border-radius: var(--radius-md) !important;
  color: #fca5a5 !important;
}

/* ── Custom Scrollbars (same as index.html) ── */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--border-strong); }

/* ══════════════════════════════════════════════════
   CUSTOM HTML COMPONENT CLASSES (from index.html)
   ══════════════════════════════════════════════════ */

/* Top Nav */
.top-nav {
  height: 52px; background: var(--bg-sidebar);
  border: 1px solid var(--border-subtle); border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px; margin-bottom: 14px;
}
.nav-left { display: flex; align-items: center; gap: 16px; }
.brand-mark { display: flex; align-items: center; gap: 10px; }
.brand-icon {
  width: 28px; height: 28px;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 13px; letter-spacing: -0.5px;
}
.brand-name { font-size: 14px; font-weight: 700; color: var(--text-main); }
.ticket-breadcrumb {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 12px; color: var(--text-subtle);
  padding-left: 12px; border-left: 1px solid var(--border-subtle);
}
.ticket-id {
  font-family: var(--font-code); color: #60a5fa; font-weight: 600;
  background: var(--bg-surface); padding: 2px 6px;
  border-radius: 4px; border: 1px solid var(--border-subtle);
}
.priority-pill {
  font-size: 11px; font-weight: 600; padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--rose-subtle); color: var(--rose);
  border: 1px solid rgba(244,63,94,0.2);
}
.engine-chip {
  display: flex; align-items: center; gap: 6px;
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
  padding: 4px 10px; border-radius: var(--radius-full);
  font-size: 11.5px; color: var(--text-muted); font-weight: 500;
}
.engine-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--emerald); box-shadow: 0 0 8px rgba(16,185,129,0.6);
  flex-shrink: 0;
}

/* Sidebar Components */
.section-label {
  font-size: 10.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.6px; color: var(--text-subtle);
  display: flex; justify-content: space-between; align-items: center;
  margin: 14px 0 8px 0;
}
.count-badge {
  background: #1e293b; padding: 1px 6px; border-radius: 4px;
  color: var(--text-muted); font-family: var(--font-code); font-size: 10px;
}

/* History Items (session cards) */
.history-item {
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md); padding: 10px 12px; margin-bottom: 4px;
  transition: all 0.15s ease;
}
.history-item.active { background: rgba(59,130,246,0.1); border-color: var(--primary); }
.history-item-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
.history-ticket-code { font-size: 11px; font-family: var(--font-code); font-weight: 600; color: #60a5fa; }
.history-customer-name { font-size: 12.5px; font-weight: 600; color: var(--text-main); margin-bottom: 2px; }
.history-meta-sub { font-size: 11px; color: var(--text-subtle); display: flex; justify-content: space-between; }
.history-pill { font-size: 9.5px; font-weight: 600; text-transform: uppercase; padding: 1px 6px; border-radius: var(--radius-full); }
.pill-negative { background: var(--rose-subtle);    color: var(--rose); }
.pill-positive { background: var(--emerald-subtle); color: var(--emerald); }
.pill-neutral  { background: var(--amber-subtle);   color: var(--amber); }

/* Customer Profile Card */
.profile-card {
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md); padding: 12px; margin-top: 8px;
}
.user-info-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.avatar {
  width: 32px; height: 32px; border-radius: var(--radius-full);
  background: #334155; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 11.5px; color: #f8fafc;
  border: 2px solid var(--border-subtle); flex-shrink: 0;
}
.user-meta-name { font-size: 13px; font-weight: 600; color: var(--text-main); }
.user-meta-email { font-size: 11px; color: var(--text-subtle); }
.detail-row {
  display: flex; justify-content: space-between; font-size: 11.5px;
  padding: 4px 0; border-top: 1px solid rgba(255,255,255,0.03);
}
.detail-label { color: var(--text-subtle); }
.detail-val { font-weight: 600; color: var(--text-muted); font-family: var(--font-code); }

/* Chat Header */
.chat-header-bar {
  padding: 10px 0; border-bottom: 1px solid var(--border-subtle);
  display: flex; align-items: center; justify-content: space-between;
  font-size: 12px; color: var(--text-subtle); margin-bottom: 14px;
}

/* Timeline Messages (with animation from index.html) */
@keyframes msgPop {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.timeline-msg {
  display: flex; gap: 10px; max-width: 85%;
  animation: msgPop 0.2s ease-out; margin-bottom: 14px;
}
.timeline-msg.agent { flex-direction: row-reverse; margin-left: auto; }
.msg-avatar {
  width: 28px; height: 28px; border-radius: var(--radius-full);
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
}
.timeline-msg.customer .msg-avatar { background: #3b4252; color: #eceff4; }
.timeline-msg.agent    .msg-avatar { background: var(--primary); color: #fff; }
.msg-bubble-wrap { display: flex; flex-direction: column; gap: 4px; }
.timeline-msg.agent .msg-bubble-wrap { align-items: flex-end; }
.msg-header-info { font-size: 11px; font-weight: 600; color: var(--text-subtle); }
.msg-content-box { padding: 10px 14px; border-radius: var(--radius-md); font-size: 13.5px; line-height: 1.5; }
.timeline-msg.customer .msg-content-box { background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-main); }
.timeline-msg.agent    .msg-content-box { background: #1e3a8a; border: 1px solid #2563eb; color: #fff; }

/* Quick Chips */
.quick-chip-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.quick-chip-label { font-size: 11px; color: var(--text-subtle); white-space: nowrap; }

/* Copilot Cards */
.intel-card {
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px;
}
.intel-card-title {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.4px; color: var(--text-subtle); margin-bottom: 10px;
}
.intent-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
.intent-cell { background: var(--bg-app); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px; }
.intent-cell-lbl { font-size: 10px; color: var(--text-subtle); text-transform: uppercase; font-weight: 600; }
.intent-cell-val { font-size: 12.5px; font-weight: 600; margin-top: 2px; }
.tag-negative { color: var(--rose); }
.tag-positive { color: var(--emerald); }
.tag-neutral  { color: var(--amber); }
.tag-high     { color: var(--rose); }
.tag-medium   { color: var(--amber); }
.tag-low      { color: var(--emerald); }
.issue-summary { font-size: 12px; color: var(--text-muted); line-height: 1.45; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.04); }

/* Score Meters (identical to index.html) */
.meter-item { display: flex; flex-direction: column; gap: 3px; margin-bottom: 10px; }
.meter-label-row { display: flex; justify-content: space-between; font-size: 11.5px; }
.meter-name { color: var(--text-muted); }
.meter-score { font-family: var(--font-code); font-weight: 600; }
.meter-bar-track { height: 5px; background: var(--bg-app); border-radius: var(--radius-full); overflow: hidden; }
.meter-bar-fill { height: 100%; border-radius: var(--radius-full); transition: width 0.5s ease; }
.fill-tone    { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.fill-empathy { background: linear-gradient(90deg, #10b981, #34d399); }
.fill-clarity { background: linear-gradient(90deg, #f59e0b, #fbbf24); }

/* Advice / KB Cards */
.advice-card {
  background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.2);
  border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 14px;
}
.advice-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #60a5fa; margin-bottom: 6px; }
.advice-text { font-size: 12.5px; color: #dbeafe; line-height: 1.5; }

.kb-card {
  background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.2);
  border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 14px;
}
.kb-card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #34d399; margin-bottom: 4px; }
.kb-card-body { font-size: 12px; color: #a7f3d0; line-height: 1.45; }

/* Compliance Alert */
.compliance-alert {
  background: var(--rose-subtle); border: 1px solid rgba(244,63,94,0.3);
  border-radius: var(--radius-md); padding: 10px 12px; font-size: 12px; color: #fca5a5; margin-bottom: 14px;
}
.compliance-title { font-weight: 700; text-transform: uppercase; font-size: 10.5px; color: var(--rose); margin-bottom: 3px; }

/* Supervisor Stats Strip */
.supervisor-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; padding-top: 8px; border-top: 1px solid var(--border-subtle); }
.stat-pill { background: var(--bg-app); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 6px 8px; text-align: center; }
.stat-pill-label { font-size: 9.5px; color: var(--text-subtle); text-transform: uppercase; font-weight: 600; }
.stat-pill-num { font-size: 14px; font-weight: 700; font-family: var(--font-code); margin-top: 2px; color: #60a5fa; }

/* Empty + Welcome States */
.empty-state-box {
  text-align: center; padding: 30px 16px; color: var(--text-subtle); font-size: 12.5px; line-height: 1.5;
  background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);
}
.welcome-hero {
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg); padding: 48px 28px; text-align: center;
  max-width: 600px; margin: 24px auto;
}
.welcome-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--primary-subtle); border: 1px solid rgba(59,130,246,0.3);
  color: #60a5fa; font-size: 11.5px; font-weight: 600;
  padding: 3px 12px; border-radius: var(--radius-full); margin-bottom: 16px;
}

/* Latency Tag */
.latency-tag {
  font-size: 11px; font-family: var(--font-code); color: var(--text-subtle);
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
  padding: 2px 8px; border-radius: 4px;
}

/* Responsive */
@media (max-width: 900px) {
  .top-nav { flex-direction: column; height: auto; padding: 10px 12px; gap: 6px; }
  .ticket-breadcrumb { border-left: none; padding-left: 0; }
  .intent-grid { grid-template-columns: 1fr; }
  .supervisor-strip { grid-template-columns: repeat(2, 1fr); }
}
</style>
""", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════
#  AI ENGINE LOADER
# ══════════════════════════════════════════════════════════════════════════
@st.cache_resource
def load_app_resources():
    """Initialize AI Coach and Vector Knowledge Base."""
    kb = get_knowledge_base()
    kb.load()

    groq_key      = os.getenv("GROQ_API_KEY", "").strip()
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


# ══════════════════════════════════════════════════════════════════════════
#  CUSTOMER POOL — Same as server/app.py
# ══════════════════════════════════════════════════════════════════════════
CUSTOMER_POOL = [
    {
        "name": "Alex Morgan", "email": "alex.morgan@company.io",
        "plan": "Pro Annual", "value": "$1,240 / yr",
        "initial_msg": "Hello, I just noticed my account was debited twice for the renewal subscription! Please fix this immediately.",
        "title": "Duplicate Renewal Charge Resolution"
    },
    {
        "name": "Jessica Taylor", "email": "j.taylor@techhub.net",
        "plan": "Enterprise Plus", "value": "$3,600 / yr",
        "initial_msg": "Hi, I wanted to ask if you offer volume discounts on additional user seats for our engineering team.",
        "title": "Enterprise Seat Volume Discount"
    },
    {
        "name": "Liam Vance", "email": "liam.vance@gmail.com",
        "plan": "Starter Monthly", "value": "$240 / yr",
        "initial_msg": "My package tracking shows delivered, but I have not received it yet. Can someone investigate?",
        "title": "Missing Delivery Tracking Inquiry"
    },
    {
        "name": "Elena Rostova", "email": "elena.r@innovate.co",
        "plan": "Pro Annual", "value": "$1,450 / yr",
        "initial_msg": "Thank you for the update! I need assistance reviewing our annual SLA compliance report.",
        "title": "SLA Compliance Review Request"
    },
]


# ══════════════════════════════════════════════════════════════════════════
#  SESSION STATE INITIALIZATION
# ══════════════════════════════════════════════════════════════════════════
if "session_counter"     not in st.session_state: st.session_state.session_counter     = 8491
if "sessions"            not in st.session_state: st.session_state.sessions            = {}
if "active_session_id"   not in st.session_state: st.session_state.active_session_id   = None
if "custom_modal_open"   not in st.session_state: st.session_state.custom_modal_open   = False
if "supervisor_history"  not in st.session_state: st.session_state.supervisor_history  = []


def create_new_instant_session():
    """Dynamically spawn a new customer support ticket."""
    st.session_state.session_counter += 1
    new_num  = st.session_state.session_counter
    new_id   = f"TK-{new_num}"
    cust_idx = (new_num - 8492) % len(CUSTOMER_POOL)
    p_cust   = CUSTOMER_POOL[cust_idx]
    inits    = "".join([part[0] for part in p_cust["name"].split()[:2]]).upper()

    st.session_state.sessions[new_id] = {
        "customer": {
            "name": p_cust["name"], "email": p_cust["email"],
            "plan": p_cust["plan"], "value": p_cust["value"], "initials": inits
        },
        "title":      p_cust["title"],
        "history":    [{"role": "customer", "content": p_cust["initial_msg"]}],
        "last_result": None,
        "sentiment":  "neutral",
        "time":       datetime.now().strftime("%I:%M %p"),
        "conv_state": ConversationState()
    }
    st.session_state.active_session_id = new_id


# Resolve current session
current_sess = None
if st.session_state.active_session_id and st.session_state.active_session_id in st.session_state.sessions:
    current_sess = st.session_state.sessions[st.session_state.active_session_id]
elif st.session_state.sessions:
    st.session_state.active_session_id = next(iter(st.session_state.sessions))
    current_sess = st.session_state.sessions[st.session_state.active_session_id]


# ══════════════════════════════════════════════════════════════════════════
#  SIDEBAR — matches sidebar-context from index.html
# ══════════════════════════════════════════════════════════════════════════
with st.sidebar:
    # Brand
    st.markdown("""
    <div style="padding:14px 14px 10px 14px;border-bottom:1px solid var(--border-subtle);">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="brand-icon">OD</div>
        <span style="font-size:14px;font-weight:700;color:var(--text-main);">OmniDesk Copilot</span>
      </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown('<div style="padding:10px 14px 0 14px;">', unsafe_allow_html=True)

    # Action buttons
    bc1, bc2 = st.columns([2, 1])
    with bc1:
        if st.button("＋ New Session", type="primary", use_container_width=True):
            create_new_instant_session()
            st.rerun()
    with bc2:
        if st.button("Custom", use_container_width=True):
            st.session_state.custom_modal_open = not st.session_state.custom_modal_open
            st.rerun()

    # Custom ticket expander
    if st.session_state.custom_modal_open:
        with st.expander("✍️ Create Custom Ticket", expanded=True):
            c_name  = st.text_input("Customer Name", value="David Kim", key="c_name")
            c_email = st.text_input("Email", value="david.kim@acme.corp", key="c_email")
            c_plan  = st.selectbox("Plan", ["Starter ($240/yr)", "Pro ($1,200/yr)", "Enterprise ($3,600/yr)"], key="c_plan")
            c_title = st.text_input("Ticket Title", value="Billing & Invoicing Clarification", key="c_title")
            c_msg   = st.text_area("Initial Customer Inquiry",
                                   value="Hi team, could you please provide a breakdown of the recent invoice charges?",
                                   key="c_msg", height=80)
            if st.button("Submit Ticket", type="primary", use_container_width=True):
                st.session_state.session_counter += 1
                new_num = st.session_state.session_counter
                new_id  = f"TK-{new_num}"
                inits   = "".join([p[0] for p in c_name.split()[:2]]).upper() or "CU"
                st.session_state.sessions[new_id] = {
                    "customer": {
                        "name": c_name, "email": c_email,
                        "plan": c_plan.split("(")[0].strip(),
                        "value": c_plan.split("(")[-1].replace(")", "").strip() if "(" in c_plan else "$1,200/yr",
                        "initials": inits
                    },
                    "title":      c_title,
                    "history":    [{"role": "customer", "content": c_msg}],
                    "last_result": None,
                    "sentiment":  "neutral",
                    "time":       datetime.now().strftime("%I:%M %p"),
                    "conv_state": ConversationState()
                }
                st.session_state.active_session_id = new_id
                st.session_state.custom_modal_open = False
                st.rerun()

    # Sessions list header
    n = len(st.session_state.sessions)
    st.markdown(f"""
    <div class="section-label">
      <span>Active &amp; Recent Sessions</span>
      <span class="count-badge">{n}</span>
    </div>
    """, unsafe_allow_html=True)

    if n == 0:
        st.caption("No sessions. Click **＋ New Session** to start.")
    else:
        for s_id, s_data in list(st.session_state.sessions.items()):
            is_active  = (s_id == st.session_state.active_session_id)
            sent       = s_data.get("sentiment", "neutral")
            pill_cls   = "pill-negative" if sent == "negative" else "pill-positive" if sent == "positive" else "pill-neutral"
            turns      = len(s_data.get("history", [])) // 2
            act_style  = "background:rgba(59,130,246,0.1);border-color:var(--primary);" if is_active else ""

            st.markdown(f"""
            <div class="history-item" style="{act_style}">
              <div class="history-item-header">
                <span class="history-ticket-code">#{s_id}</span>
                <span class="history-pill {pill_cls}">{sent.upper()}</span>
              </div>
              <div class="history-customer-name">{s_data['customer']['name']}</div>
              <div class="history-meta-sub">
                <span>{turns} turn{"s" if turns != 1 else ""}</span>
                <span>{s_data.get("time","Just now")}</span>
              </div>
            </div>
            """, unsafe_allow_html=True)

            sc1, sc2 = st.columns([3, 1])
            with sc1:
                if not is_active:
                    if st.button(f"Open #{s_id}", key=f"sel_{s_id}", use_container_width=True):
                        st.session_state.active_session_id = s_id
                        st.rerun()
            with sc2:
                if st.button("✕", key=f"del_{s_id}", help="Delete ticket"):
                    del st.session_state.sessions[s_id]
                    if st.session_state.active_session_id == s_id:
                        st.session_state.active_session_id = (
                            next(iter(st.session_state.sessions)) if st.session_state.sessions else None
                        )
                    st.rerun()

    # Customer Profile
    st.markdown("""
    <div class="section-label" style="margin-top:18px;">
      <span>Active Customer Context</span>
    </div>
    """, unsafe_allow_html=True)

    if current_sess:
        cust = current_sess["customer"]
        st.markdown(f"""
        <div class="profile-card">
          <div class="user-info-row">
            <div class="avatar">{cust.get("initials","CU")}</div>
            <div>
              <div class="user-meta-name">{cust["name"]}</div>
              <div class="user-meta-email">{cust["email"]}</div>
            </div>
          </div>
          <div class="detail-row">
            <span class="detail-label">Subscription</span>
            <span class="detail-val" style="color:#60a5fa;">{cust["plan"]}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Account Value</span>
            <span class="detail-val">{cust["value"]}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status</span>
            <span class="detail-val" style="color:var(--emerald);">Active</span>
          </div>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown("""
        <div class="profile-card" style="text-align:center;color:var(--text-subtle);font-size:12px;padding:18px;">
          No active customer selected.
        </div>
        """, unsafe_allow_html=True)

    st.markdown('</div>', unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════
#  TOP NAV BAR — identical to index.html <nav class="top-nav">
# ══════════════════════════════════════════════════════════════════════════
if current_sess:
    _ticket_id = st.session_state.active_session_id
    _title     = current_sess["title"]
    _nav_html  = (
        '<div class="top-nav">'
        '<div class="nav-left">'
        '<div class="brand-mark">'
        '<div class="brand-icon">OD</div>'
        '<span class="brand-name">OmniDesk</span>'
        '</div>'
        '<div class="ticket-breadcrumb">'
        '<span>Ticket</span>'
        f'<span class="ticket-id">#{_ticket_id}</span>'
        f'<span style="color:var(--text-muted);font-weight:500;">{_title}</span>'
        '<span class="priority-pill">Priority High</span>'
        '</div>'
        '</div>'
        f'<div class="engine-chip"><span class="engine-dot"></span><span>{engine_name}</span></div>'
        '</div>'
    )
else:
    _nav_html = (
        '<div class="top-nav">'
        '<div class="nav-left">'
        '<div class="brand-mark">'
        '<div class="brand-icon">OD</div>'
        '<span class="brand-name">OmniDesk</span>'
        '</div>'
        '<div class="ticket-breadcrumb">'
        '<span style="color:var(--text-muted);font-weight:500;">Workspace Ready — Start a Session</span>'
        '</div>'
        '</div>'
        f'<div class="engine-chip"><span class="engine-dot"></span><span>{engine_name}</span></div>'
        '</div>'
    )

st.markdown(_nav_html, unsafe_allow_html=True)



# ══════════════════════════════════════════════════════════════════════════
#  WELCOME SCREEN — shown when no session is active
# ══════════════════════════════════════════════════════════════════════════
if not current_sess:
    st.markdown("""
    <div class="welcome-hero">
      <div class="welcome-badge">⚡ Real-Time Support Copilot</div>
      <h2 style="font-size:22px;font-weight:700;color:var(--text-main);margin:0 0 8px 0;">No Active Customer Session</h2>
      <p style="color:var(--text-muted);font-size:14px;max-width:480px;margin:0 auto 24px;line-height:1.5;">
        OmniDesk Copilot is ready. Start a new customer support ticket to evaluate live agent responses,
        detect sentiment risk, and trigger real-time AI coaching.
      </p>
    </div>
    """, unsafe_allow_html=True)

    wc1, wc2 = st.columns(2)
    with wc1:
        if st.button("🚀 Start Instant Session", type="primary", use_container_width=True):
            create_new_instant_session()
            st.rerun()
    with wc2:
        if st.button("✍️ Create Custom Ticket", use_container_width=True):
            st.session_state.custom_modal_open = True
            st.rerun()


# ══════════════════════════════════════════════════════════════════════════
#  MAIN WORKSPACE — two-column layout matching index.html
#  Left  = conversation-canvas
#  Right = copilot-sidebar
# ══════════════════════════════════════════════════════════════════════════
else:
    col_chat, col_copilot = st.columns([1.35, 1], gap="large")

    # ── LEFT COLUMN: Conversation Canvas ──────────────────────────────
    with col_chat:
        st.markdown("""
        <div class="chat-header-bar">
          <span>Conversation Timeline &amp; Real-Time Transcript</span>
          <span>Channel: Live Chat</span>
        </div>
        """, unsafe_allow_html=True)

        # Build timeline HTML — identical to index.html addTimelineMessage()
        timeline_html = ""
        for msg in current_sess["history"]:
            if msg["role"] == "customer":
                inits = current_sess["customer"].get("initials", "CU")
                name  = current_sess["customer"]["name"]
                timeline_html += f"""
                <div class="timeline-msg customer">
                  <div class="msg-avatar">{inits}</div>
                  <div class="msg-bubble-wrap">
                    <div class="msg-header-info">{name} &bull; Inbound</div>
                    <div class="msg-content-box">{msg["content"]}</div>
                  </div>
                </div>"""
            else:
                timeline_html += f"""
                <div class="timeline-msg agent">
                  <div class="msg-avatar">AG</div>
                  <div class="msg-bubble-wrap">
                    <div class="msg-header-info">Support Agent (You) &bull; Sent</div>
                    <div class="msg-content-box">{msg["content"]}</div>
                  </div>
                </div>"""

        st.markdown(f'<div style="margin-bottom:8px;">{timeline_html}</div>', unsafe_allow_html=True)

        # Divider
        st.markdown('<hr style="border:none;border-top:1px solid var(--border-subtle);margin:6px 0 10px 0;">', unsafe_allow_html=True)

        # Quick Template Chips
        st.markdown("""
        <div class="quick-chip-row">
          <span class="quick-chip-label">Quick Templates:</span>
        </div>
        """, unsafe_allow_html=True)

        tc1, tc2, tc3 = st.columns(3)
        with tc1:
            if st.button("Apologize & Verify", use_container_width=True):
                st.session_state["st_agent_input"] = "I apologize for the frustration this has caused. Let me look into your account details and resolve this right away."
                st.rerun()
        with tc2:
            if st.button("Delight & Assist", use_container_width=True):
                st.session_state["st_agent_input"] = "Thank you for reaching out! I'd be more than happy to help you with this today."
                st.rerun()
        with tc3:
            if st.button("Confirm Update", use_container_width=True):
                st.session_state["st_agent_input"] = "I have checked your account and confirmed the update. A confirmation has been sent to your email."
                st.rerun()

        # Message Composer (side-by-side, same as composer-inputs-grid)
        ic1, ic2 = st.columns(2)
        with ic1:
            customer_msg = st.text_area(
                "Customer Message (Inbound)",
                placeholder="Paste or type customer's message...",
                height=80, key="st_cust_input"
            )
        with ic2:
            agent_msg = st.text_area(
                "Agent Response (Draft)",
                placeholder="Draft your response to the customer...",
                height=80, key="st_agent_input"
            )

        # Action bar
        ac1, ac2, ac3 = st.columns([1.5, 1.1, 0.65])
        with ac1:
            st.markdown(
                '<span style="font-size:11px;color:var(--text-subtle);">Press <strong>Ctrl+Enter</strong> to analyze &amp; send</span>',
                unsafe_allow_html=True
            )
        with ac2:
            send_clicked = st.button("Analyze & Send Response", type="primary", use_container_width=True)
        with ac3:
            if st.button("Clear Chat", use_container_width=True):
                current_sess["history"]     = current_sess["history"][:1]
                current_sess["last_result"] = None
                st.rerun()

        # ── Process AI Analysis ──
        if send_clicked:
            if not customer_msg.strip() or not agent_msg.strip():
                st.warning("Please provide both the customer message and agent draft.")
            else:
                with st.spinner("OmniDesk Copilot analyzing in real-time..."):
                    t0      = time.time()
                    c_state = current_sess.get("conv_state", ConversationState())
                    try:
                        if hasattr(coach, "process_turn"):
                            result = coach.process_turn(agent_msg, customer_msg, c_state)
                        else:
                            sentiment     = coach.analyze_sentiment(customer_msg)
                            intent        = coach.classify_intent(customer_msg)
                            feedback_list = coach.generate_coaching_feedback(agent_msg, customer_msg)
                            result = {
                                "analysis": {
                                    "sentiment":        sentiment["label"].lower(),
                                    "urgency":          "high" if sentiment["label"] == "NEGATIVE" else "low",
                                    "escalation_risk":  "high" if sentiment["label"] == "NEGATIVE" else "low",
                                    "key_issue":        intent
                                },
                                "feedback": {
                                    "tone_score":           8,
                                    "empathy_score":        8,
                                    "clarity_score":        8,
                                    "coaching_tip":         feedback_list[0] if feedback_list else "Well structured response.",
                                    "knowledge_suggestion": feedback_list[1] if len(feedback_list) > 1 else ""
                                },
                                "compliance":      {"violation": False, "issue": "", "suggestion": ""},
                                "latency_seconds": round(time.time() - t0, 3)
                            }
                    except Exception as e:
                        st.error(f"Analysis encountered an issue: {e}")
                        result = {
                            "analysis":        {"sentiment": "neutral", "urgency": "low", "escalation_risk": "low", "key_issue": "Customer query"},
                            "feedback":        {"tone_score": 7, "empathy_score": 7, "clarity_score": 7, "coaching_tip": "Provide clear and prompt assistance.", "knowledge_suggestion": ""},
                            "compliance":      {"violation": False, "issue": "", "suggestion": ""},
                            "latency_seconds": round(time.time() - t0, 3)
                        }

                    current_sess["history"].append({"role": "customer", "content": customer_msg})
                    current_sess["history"].append({"role": "agent",    "content": agent_msg})
                    current_sess["last_result"] = result
                    current_sess["sentiment"]   = result.get("analysis", {}).get("sentiment", "neutral")

                    st.session_state.supervisor_history.append({
                        "tone":    result["feedback"].get("tone_score", 7),
                        "empathy": result["feedback"].get("empathy_score", 7),
                        "clarity": result["feedback"].get("clarity_score", 7),
                    })
                    st.rerun()

    # ── RIGHT COLUMN: Copilot Sidebar ─────────────────────────────────
    with col_copilot:
        res         = current_sess.get("last_result")
        latency_str = f"{res.get('latency_seconds', '—')}s" if res else "Ready"

        st.markdown(f"""
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <span style="font-size:13px;font-weight:700;color:var(--text-main);">Real-Time Coaching Copilot</span>
          <span class="latency-tag">{latency_str}</span>
        </div>
        """, unsafe_allow_html=True)

        if res:
            a = res.get("analysis", {})
            f = res.get("feedback", {})
            c = res.get("compliance", {})

            # Sentiment / Urgency / Risk
            sent     = (a.get("sentiment") or "neutral").lower()
            sent_cls = "tag-positive" if sent == "positive" else "tag-negative" if sent == "negative" else "tag-neutral"
            urg      = (a.get("urgency") or "low").lower()
            urg_cls  = "tag-high" if urg == "high" else "tag-medium" if urg == "medium" else "tag-low"
            risk     = (a.get("escalation_risk") or "low").lower()
            risk_cls = "tag-high" if risk == "high" else "tag-low"

            clean_issue = (a.get("key_issue") or "Inquiry Resolution").replace("🔑","").replace("🎯","").replace("💡","").strip()
            clean_tip   = (f.get("coaching_tip") or "Clear response structure.").replace("🔑","").replace("🎯","").replace("💡","").strip()

            t_score = f.get("tone_score", 0)
            e_score = f.get("empathy_score", 0)
            c_score = f.get("clarity_score", 0)

            # Customer Signal Analysis Card (identical to index.html intel-card)
            st.markdown(f"""
            <div class="intel-card">
              <div class="intel-card-title">Customer Signal Analysis</div>
              <div class="intent-grid">
                <div class="intent-cell">
                  <div class="intent-cell-lbl">Sentiment</div>
                  <div class="intent-cell-val {sent_cls}">{sent.capitalize()}</div>
                </div>
                <div class="intent-cell">
                  <div class="intent-cell-lbl">Urgency</div>
                  <div class="intent-cell-val {urg_cls}">{urg.capitalize()}</div>
                </div>
                <div class="intent-cell" style="grid-column:1/-1;">
                  <div class="intent-cell-lbl">Escalation Risk</div>
                  <div class="intent-cell-val {risk_cls}">{risk.capitalize()}</div>
                </div>
              </div>
              {f'<div class="issue-summary"><strong style="color:var(--text-subtle);font-size:11px;">Identified Issue:</strong> {clean_issue}</div>' if clean_issue else ''}
            </div>
            """, unsafe_allow_html=True)

            # Response Quality Scores (with custom gradient meters from index.html)
            st.markdown(f"""
            <div class="intel-card">
              <div class="intel-card-title">Response Quality Scores</div>
              <div class="meter-item">
                <div class="meter-label-row">
                  <span class="meter-name">Tone Alignment</span>
                  <span class="meter-score" style="color:#60a5fa;">{t_score}/10</span>
                </div>
                <div class="meter-bar-track">
                  <div class="meter-bar-fill fill-tone" style="width:{t_score * 10}%;"></div>
                </div>
              </div>
              <div class="meter-item">
                <div class="meter-label-row">
                  <span class="meter-name">Customer Empathy</span>
                  <span class="meter-score" style="color:#10b981;">{e_score}/10</span>
                </div>
                <div class="meter-bar-track">
                  <div class="meter-bar-fill fill-empathy" style="width:{e_score * 10}%;"></div>
                </div>
              </div>
              <div class="meter-item">
                <div class="meter-label-row">
                  <span class="meter-name">Clarity &amp; Directness</span>
                  <span class="meter-score" style="color:#f59e0b;">{c_score}/10</span>
                </div>
                <div class="meter-bar-track">
                  <div class="meter-bar-fill fill-clarity" style="width:{c_score * 10}%;"></div>
                </div>
              </div>
            </div>
            """, unsafe_allow_html=True)

            # Coaching Recommendation (advice-card from index.html)
            st.markdown(f"""
            <div class="advice-card">
              <div class="advice-title">Coaching Recommendation</div>
              <div class="advice-text">{clean_tip}</div>
            </div>
            """, unsafe_allow_html=True)

            # Knowledge Base Match (kb-card from index.html)
            kb_sugg = f.get("knowledge_suggestion", "")
            if kb_sugg:
                st.markdown(f"""
                <div class="kb-card">
                  <div class="kb-card-title">Relevant Knowledge Base Match</div>
                  <div class="kb-card-body">{kb_sugg}</div>
                </div>
                """, unsafe_allow_html=True)

            # Compliance Warning
            if c.get("violation"):
                st.markdown(f"""
                <div class="compliance-alert">
                  <div class="compliance-title">⚠ Compliance Warning</div>
                  <div>{c.get("issue", "")}</div>
                  <div style="margin-top:4px;color:#fecdd3;">Fix: {c.get("suggestion", "")}</div>
                </div>
                """, unsafe_allow_html=True)

        else:
            st.markdown("""
            <div class="empty-state-box">
              Send a conversation turn to generate live sentiment analysis,
              coaching guidance, and FAQ suggestions.
            </div>
            """, unsafe_allow_html=True)

        # Session Quality Metrics (supervisor-strip from index.html)
        sh = st.session_state.supervisor_history
        if sh:
            avg_t = round(sum(x["tone"]    for x in sh) / len(sh), 1)
            avg_e = round(sum(x["empathy"] for x in sh) / len(sh), 1)
            avg_c = round(sum(x["clarity"] for x in sh) / len(sh), 1)
        else:
            avg_t = avg_e = avg_c = "—"

        st.markdown(f"""
        <div class="intel-card" style="margin-top:14px;">
          <div class="intel-card-title">Session Quality Metrics</div>
          <div class="supervisor-strip">
            <div class="stat-pill">
              <div class="stat-pill-label">Avg Tone</div>
              <div class="stat-pill-num">{avg_t}</div>
            </div>
            <div class="stat-pill">
              <div class="stat-pill-label">Empathy</div>
              <div class="stat-pill-num">{avg_e}</div>
            </div>
            <div class="stat-pill">
              <div class="stat-pill-label">Clarity</div>
              <div class="stat-pill-num">{avg_c}</div>
            </div>
          </div>
        </div>
        """, unsafe_allow_html=True)

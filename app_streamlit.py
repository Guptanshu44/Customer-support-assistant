"""
app_streamlit.py — OmniDesk Copilot for Streamlit Cloud Deployment.
Embeds the modern React + Vite frontend seamlessly into Streamlit Cloud.
"""

import os
import streamlit as st
import streamlit.components.v1 as components

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
    pass

# ── Page Config ────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="OmniDesk Copilot — Real-Time Agent Intelligence",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ── Hide Streamlit Chrome & Make React App Full-Screen ────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

html, body, .stApp,
[data-testid="stAppViewContainer"],
[data-testid="stMain"] {
    background: #0b0f17 !important;
    overflow: hidden !important;
    padding: 0 !important;
    margin: 0 !important;
}

header[data-testid="stHeader"],
footer,
[data-testid="stToolbar"],
[data-testid="stDecoration"],
[data-testid="stStatusWidget"] { 
    display: none !important; 
}

#MainMenu { 
    visibility: hidden; 
}

.block-container {
    padding: 0 !important;
    margin: 0 !important;
    max-width: 100% !important;
    height: 100vh !important;
}

[data-testid="stCustomComponentV1"],
iframe {
    width: 100vw !important;
    min-height: 100vh !important;
    height: 100vh !important;
    border: none !important;
    display: block !important;
}
</style>
""", unsafe_allow_html=True)

# ── Mount Built React Application ──────────────────────────────────────────
_dist_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist")

if os.path.isdir(_dist_path):
    _react_app = components.declare_component("omnidesk_react", path=_dist_path)
    _react_app()
else:
    st.error("React build directory `frontend/dist` not found. Run `cd frontend && npm run build`.")

"""
app_streamlit.py — OmniDesk Copilot for Streamlit Cloud Deployment.
Directly embeds the self-contained React production build via st.components.v1.html.
Hides Streamlit Cloud's Manage app floating overlay to keep UI unobstructed.
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

# ── Hide Streamlit Chrome & Manage App Floating Overlays ───────────────────
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
    height: 100vh !important;
    max-height: 100vh !important;
}

header[data-testid="stHeader"],
footer,
[data-testid="stToolbar"],
[data-testid="stDecoration"],
[data-testid="stStatusWidget"],
[data-testid="manage-app-button"],
.viewerBadge_container__1QSob,
.viewerBadge_link__1S137,
div[class*="viewerBadge"] { 
    display: none !important; 
    visibility: hidden !important;
}

#MainMenu { 
    visibility: hidden; 
}

.block-container {
    padding: 0 !important;
    margin: 0 !important;
    max-width: 100% !important;
    height: 100vh !important;
    overflow: hidden !important;
}

/* Remove any gap between stacked iframes */
.element-container {
    margin: 0 !important;
    padding: 0 !important;
}

iframe {
    width: 100% !important;
    border: none !important;
    display: block !important;
}
</style>
""", unsafe_allow_html=True)

# ── Render Self-Contained React Singlefile Bundle ──────────────────────────
_dist_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist", "index.html")

if os.path.exists(_dist_file):
    with open(_dist_file, "r", encoding="utf-8") as _f:
        _html_code = _f.read()

    # Render the React app at a tall initial height so nothing is clipped
    components.html(_html_code, height=1400, scrolling=False)

    # ── Dynamic Viewport Filler ──────────────────────────────────────────
    # This tiny invisible iframe runs JS in the parent page context,
    # finds the main app iframe, and resizes it to exactly fill the viewport.
    # Re-runs on every window resize so it stays correct at any screen size.
    components.html("""
    <script>
    (function () {
        function fillViewport() {
            try {
                var parentWin = window.parent;
                var parentDoc = parentWin.document;
                // Subtract 4px buffer so the bottom edge is never clipped
                // by Streamlit's own padding or the OS taskbar
                var vh = parentWin.innerHeight - 4;

                // Find all iframes in the Streamlit page
                var iframes = parentDoc.querySelectorAll('iframe');

                // Target the TALLEST iframe — that's our React app
                var appFrame = null;
                iframes.forEach(function (f) {
                    // Skip this tiny script iframe (height <= 4px)
                    if (f.offsetHeight <= 4) return;
                    if (!appFrame || f.offsetHeight > appFrame.offsetHeight) {
                        appFrame = f;
                    }
                });

                if (appFrame) {
                    appFrame.style.setProperty('height', vh + 'px', 'important');
                    appFrame.style.setProperty('min-height', vh + 'px', 'important');
                    appFrame.style.setProperty('max-height', vh + 'px', 'important');
                    appFrame.setAttribute('height', vh);
                }
            } catch (e) { /* cross-origin guard */ }
        }

        // Run immediately + after short delays to catch late rendering
        fillViewport();
        setTimeout(fillViewport, 150);
        setTimeout(fillViewport, 500);
        setTimeout(fillViewport, 1200);

        // Keep in sync when user resizes the browser window
        window.parent.addEventListener('resize', fillViewport);
    })();
    </script>
    """, height=1)

else:
    st.error("React build file not found. Run `cd frontend && npm run build`.")

"""
streamlit_app.py — Streamlit Cloud Entry Point for OmniDesk Copilot.
Directly embeds the self-contained React production build via st.components.v1.html.
Hides Streamlit Cloud's Manage app floating overlay to keep UI unobstructed.
"""

import os
import streamlit as st
import streamlit.components.v1 as components

# Load secrets: Streamlit Cloud (st.secrets) takes priority over .env
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

# Page Config
st.set_page_config(
    page_title="OmniDesk Copilot — Real-Time Agent Intelligence",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Hide Streamlit Chrome & Manage App Floating Overlays
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
[data-testid="stConnectionStatus"],
.viewerBadge_container__1QSob,
.viewerBadge_link__1S137,
div[class*="viewerBadge"],
div[class*="manageApp"],
div[class*="FloatingMenu"],
div[class*="floatingMenu"],
div[class*="floatingButton"],
div[class*="stFloating"],
button[title*="Manage"],
button[title*="Streamlit"],
button[aria-label*="Manage"],
a[href*="streamlit.io"],
img[src*="githubusercontent"],
img[src*="googleusercontent"],
div[class*="profile"],
div[class*="avatar"] { 
    display: none !important; 
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    width: 0 !important;
    height: 0 !important;
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
    height: 100vh !important;
    min-height: 100vh !important;
    border: none !important;
    display: block !important;
}
</style>
""", unsafe_allow_html=True)

# Render React App via declare_component so the iframe has real domain for Firebase Auth
_dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist")

if os.path.exists(_dist_dir):
    _omnidesk_copilot = components.declare_component("omnidesk_copilot", path=_dist_dir)
    _omnidesk_copilot()

    # Dynamic Viewport Filler & Floating Overlay Remover
    components.html("""
    <script>
    (function () {
        function resetParentScroll() {
            try {
                var parentWin = window.parent;
                var parentDoc = parentWin.document;
                if (parentWin.scrollY !== 0 || parentWin.scrollX !== 0) {
                    parentWin.scrollTo(0, 0);
                }
                if (parentDoc.documentElement && parentDoc.documentElement.scrollTop !== 0) {
                    parentDoc.documentElement.scrollTop = 0;
                }
                if (parentDoc.body && parentDoc.body.scrollTop !== 0) {
                    parentDoc.body.scrollTop = 0;
                }
                var main = parentDoc.querySelector('[data-testid="stMain"]');
                if (main && main.scrollTop !== 0) main.scrollTop = 0;
                var appView = parentDoc.querySelector('[data-testid="stAppViewContainer"]');
                if (appView && appView.scrollTop !== 0) appView.scrollTop = 0;
                var block = parentDoc.querySelector('.block-container');
                if (block && block.scrollTop !== 0) block.scrollTop = 0;
            } catch (e) {}
        }

        function hideStreamlitFloatingWidgets() {
            try {
                var pDoc = window.parent.document;
                var styleId = 'omnidesk-hide-streamlit-badges';
                if (!pDoc.getElementById(styleId)) {
                    var stStyle = pDoc.createElement('style');
                    stStyle.id = styleId;
                    stStyle.innerHTML = `
                        [data-testid="manage-app-button"],
                        [data-testid="stToolbar"],
                        [data-testid="stDecoration"],
                        [data-testid="stStatusWidget"],
                        [data-testid="stConnectionStatus"],
                        .viewerBadge_container__1QSob,
                        .viewerBadge_link__1S137,
                        div[class*="viewerBadge"],
                        div[class*="manageApp"],
                        div[class*="FloatingMenu"],
                        div[class*="floatingMenu"],
                        div[class*="floatingButton"],
                        div[class*="stFloating"],
                        button[title*="Manage"],
                        button[title*="Streamlit"],
                        button[aria-label*="Manage"],
                        a[href*="streamlit.io"],
                        img[src*="githubusercontent"],
                        img[src*="googleusercontent"],
                        div[class*="profile"],
                        div[class*="avatar"] {
                            display: none !important;
                            visibility: hidden !important;
                            opacity: 0 !important;
                            pointer-events: none !important;
                            width: 0 !important;
                            height: 0 !important;
                        }
                    `;
                    pDoc.head.appendChild(stStyle);
                }

                // Scan and remove any fixed overlay in the bottom right corner
                var allEls = pDoc.querySelectorAll('div, button, a, img, svg');
                allEls.forEach(function(el) {
                    if (el.getAttribute('data-testid') === 'manage-app-button') {
                        el.style.setProperty('display', 'none', 'important');
                    }
                    if (el.tagName.toLowerCase() === 'img' && (el.src.indexOf('githubusercontent') !== -1 || el.src.indexOf('googleusercontent') !== -1)) {
                        el.style.setProperty('display', 'none', 'important');
                    }
                    var comp = window.parent.getComputedStyle(el);
                    if (comp && (comp.position === 'fixed' || comp.position === 'absolute')) {
                        var b = parseFloat(comp.bottom);
                        var r = parseFloat(comp.right);
                        if (!isNaN(b) && b >= 0 && b <= 80 && !isNaN(r) && r >= 0 && r <= 120 && parseInt(comp.zIndex, 10) > 10) {
                            if (el.tagName.toLowerCase() !== 'iframe' && el.tagName.toLowerCase() !== 'html' && el.tagName.toLowerCase() !== 'body') {
                                el.style.setProperty('display', 'none', 'important');
                                el.style.setProperty('visibility', 'hidden', 'important');
                            }
                        }
                    }
                });
            } catch (e) {}
        }

        function fillViewport() {
            try {
                resetParentScroll();
                hideStreamlitFloatingWidgets();
                var parentWin = window.parent;
                var parentDoc = parentWin.document;
                var vh = parentWin.innerHeight - 4;

                var iframes = parentDoc.querySelectorAll('iframe');
                var appFrame = null;
                iframes.forEach(function (f) {
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
                    appFrame.setAttribute('allow', 'microphone; speech-recognition; autoplay; clipboard-write; clipboard-read');
                    appFrame.setAttribute('scrolling', 'auto');
                }
            } catch (e) { /* cross-origin guard */ }
        }

        // Run immediately + after short delays to catch late rendering
        fillViewport();
        setTimeout(fillViewport, 150);
        setTimeout(fillViewport, 500);
        setTimeout(fillViewport, 1200);

        // Keep in sync when user resizes or scrolls
        window.parent.addEventListener('resize', fillViewport);
        window.parent.addEventListener('scroll', resetParentScroll, { passive: true });
        setInterval(function () {
            resetParentScroll();
            hideStreamlitFloatingWidgets();
        }, 800);

        // Setup MutationObserver to kill dynamically injected Streamlit manage buttons immediately
        try {
            var observer = new MutationObserver(function () {
                hideStreamlitFloatingWidgets();
            });
            observer.observe(window.parent.document.body, { childList: true, subtree: true });
        } catch (e) {}
    })();
    </script>
    """, height=1)

else:
    st.error("React build file not found. Run `cd frontend && npm run build`.")

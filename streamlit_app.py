# streamlit_app.py — Entry point for Streamlit Cloud deployment.
# Uses exec() so that app_streamlit.py re-executes on every Streamlit rerun.
# Do NOT change this to 'import' — that breaks Streamlit's rerun mechanism.

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(os.path.dirname(__file__), "app_streamlit.py"), "r", encoding="utf-8") as _f:
    exec(_f.read())

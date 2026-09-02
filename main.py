"""
main.py — Entry point for AI Customer Support Coaching Assistant.

Usage:
    python main.py              # Start full web server (default)
    python main.py --server     # Start Flask + WebSocket server
    python main.py --demo       # Run CLI demo
    python main.py --groq       # Force Groq demo mode
    python main.py --claude     # Force Claude demo mode
    python main.py --hf         # Force HuggingFace demo mode
"""

import sys
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def run_server():
    """Start the Flask + Socket.IO web server."""
    from server.app import socketio, app
    from server.knowledge_base import get_knowledge_base

    print("\n[KB] Loading knowledge base...")
    kb = get_knowledge_base()
    kb.load()

    port = int(os.getenv("PORT", 5000))
    print(f"\n[Web] Open your browser at: http://localhost:{port}")
    print("   Press Ctrl+C to stop.\n")
    socketio.run(app, host="0.0.0.0", port=port, debug=False, allow_unsafe_werkzeug=True)


def run_cli_demo(provider=None):
    """Run a quick CLI demo without the web server."""
    from server.knowledge_base import get_knowledge_base
    kb = get_knowledge_base()
    kb.load()

    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()

    if groq_key in ("your_groq_api_key_here", "your_api_key_here"):
        groq_key = ""
    if anthropic_key in ("your_anthropic_api_key_here", "your_api_key_here"):
        anthropic_key = ""

    if provider == "groq" or (not provider and groq_key):
        print("\n[>>] Groq AI Demo Mode\n")
        from coaching_assistant.coach import AICoach
        coach = AICoach(knowledge_base=kb, provider="groq")
        coach.run_demo()

    elif provider == "claude" or (not provider and anthropic_key):
        print("\n[AI] Claude AI Demo Mode\n")
        from coaching_assistant.coach import AICoach
        coach = AICoach(knowledge_base=kb, provider="claude")
        coach.run_demo()

    else:
        print("\n[HF] HuggingFace Demo Mode (offline)\n")
        from coaching_assistant.hf_coach import HFCoach
        coach = HFCoach()
        coach.run_demo()


def main():
    args = sys.argv[1:]

    print("=" * 60)
    print("  AI Powered Real-time Customer Support Coaching Assistant")
    print("=" * 60)

    if "--demo" in args:
        run_cli_demo()
    elif "--groq" in args:
        run_cli_demo(provider="groq")
    elif "--claude" in args:
        run_cli_demo(provider="claude")
    elif "--hf" in args:
        run_cli_demo(provider="hf")
    else:
        run_server()


if __name__ == "__main__":
    main()
"""
utils.py — Shared utility functions.
Source: Cell 17 of Anshu (1).ipynb
"""

import json


def parse_json(text: str) -> dict:
    """
    Safely convert Claude's text response into a Python dictionary.

    Handles both plain JSON and markdown code-fenced JSON like:
        ```json
        { "key": "value" }
        ```
    """
    text = text.strip()

    # Remove Markdown code fences if Claude adds them
    if text.startswith("```"):
        lines = text.splitlines()

        if lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        text = "\n".join(lines).strip()

    # Sometimes the response may contain "json" before JSON
    if text.lower().startswith("json"):
        text = text[4:].strip()

    try:
        return json.loads(text)

    except json.JSONDecodeError as e:
        print("\nCould not parse Claude response as JSON.")
        print("Raw response:")
        print(text)
        raise ValueError(f"Invalid JSON returned by Claude: {e}")

"""
utils.py — Shared utility functions.
Source: Cell 17 of Anshu (1).ipynb
"""

import json
import re


def parse_json(text: str) -> dict:
    """
    Safely convert LLM text response into a Python dictionary.
    Handles plain JSON, markdown code fences, and conversational preambles/postambles.
    """
    if not text or not text.strip():
        return {}
    text = text.strip()

    # If code fence present, extract inside
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if match:
        clean_text = match.group(1).strip()
    else:
        # Look for the outermost JSON object
        json_match = re.search(r"(\{[\s\S]*\})", text)
        clean_text = json_match.group(1).strip() if json_match else text

    # Remove potential leading "json"
    if clean_text.lower().startswith("json"):
        clean_text = clean_text[4:].strip()

    try:
        return json.loads(clean_text)
    except json.JSONDecodeError as e:
        print("\nCould not parse LLM response as JSON.")
        print("Raw response:")
        print(text)
        raise ValueError(f"Invalid JSON returned by LLM: {e}")


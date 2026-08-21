import sys
print('Python:', sys.version)

from coaching_assistant.models import Message, ConversationState, CoachingFeedback
print('OK models.py')

from coaching_assistant.utils import parse_json
print('OK utils.py')

result = parse_json('{"sentiment": "negative", "urgency": "high"}')
assert result['sentiment'] == 'negative'
print('OK parse_json:', result)

import anthropic
print('OK anthropic:', anthropic.__version__)

import transformers
print('OK transformers:', transformers.__version__)

import torch
print('OK torch:', torch.__version__)

print()
print('All imports successful! Project is ready.')

import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(api_key=os.getenv('GROQ_API_KEY'))

for model_name in ['groq/compound-mini', 'groq/compound']:
    try:
        res = client.chat.completions.create(
            model=model_name,
            messages=[{'role': 'user', 'content': 'Analyze customer message: "My order is delayed." Return ONLY JSON with sentiment: {"sentiment": "negative"}'}],
            max_tokens=100
        )
        print(f'✅ {model_name} response:\n{res.choices[0].message.content}\n')
    except Exception as e:
        print(f'❌ {model_name}: {e}\n')

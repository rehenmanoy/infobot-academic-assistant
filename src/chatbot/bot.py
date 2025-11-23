from fastapi import HTTPException, APIRouter
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import anthropic

load_dotenv()

anthropic_api_key = os.getenv("anthropic_api_key")
if anthropic_api_key is None:
    raise ValueError("Anthropic API key not found in environment variables")

# Initialize the Anthropic client
client = anthropic.Anthropic(api_key=anthropic_api_key)

router = APIRouter()

class ChatRequest(BaseModel):
    prompt: str

@router.post("/chat")
async def chat_with_claude(request: ChatRequest):
    try:
        message = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=10877,
            temperature=1,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": request.prompt
                        }
                    ]
                }
            ]
        )

        return {"response": message.content[0].text}

    except anthropic.APIStatusError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

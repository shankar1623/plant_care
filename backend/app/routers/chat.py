from fastapi import APIRouter, Depends
from app.auth import get_current_user_id
from app.schemas import ChatRequest, ChatResponse
from app.services.llm import generate_agricultural_chat_response

router = APIRouter(prefix="/api/chat", tags=["AI Chatbot"])

@router.post("", response_model=ChatResponse)
async def chat_with_agri_doctor(
    req: ChatRequest,
    user_id: str = Depends(get_current_user_id)
):
    reply = await generate_agricultural_chat_response(
        user_message=req.message,
        plant_name=req.plant_name,
        disease_name=req.disease_name,
        current_medicine=req.current_medicine,
        language=req.language,
        history=[m.dict() for m in req.history] if req.history else []
    )
    return ChatResponse(reply=reply, language=req.language)

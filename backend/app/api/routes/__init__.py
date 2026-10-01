from fastapi import APIRouter
from app.api.routes import health, documents, requirements, dashboard, chat

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(documents.router)
api_router.include_router(requirements.router)
api_router.include_router(dashboard.router)
api_router.include_router(chat.router)

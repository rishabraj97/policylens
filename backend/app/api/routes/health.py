from fastapi import APIRouter
from app.schemas.compliance import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def get_v1_health() -> HealthResponse:
    """Returns the operational status of the PolicyLens API v1."""
    return HealthResponse(status="healthy")

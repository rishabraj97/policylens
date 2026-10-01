from typing import Optional
from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    status: str


class RootResponse(BaseModel):
    message: str


class ComplianceRequirementSchema(BaseModel):
    id: Optional[int] = None
    requirement: str
    action: str
    applicability: Optional[str] = None
    department: str
    deadline: str
    evidence: str
    status: str

    model_config = ConfigDict(from_attributes=True)

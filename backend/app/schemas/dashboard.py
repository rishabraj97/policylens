"""
PolicyLens — Dashboard Schemas (Step 5)
Pydantic schemas for Step 5 Compliance Command Center statistics and overview metrics.
"""
from pydantic import BaseModel, ConfigDict, Field


class DashboardStatsResponse(BaseModel):
    """
    Structured statistical overview for the Compliance Command Center.
    Calculated directly from real database records.
    """
    total: int = Field(0, description="Total compliance requirements across all documents")
    pending: int = Field(0, description="Count of requirements with Pending status")
    completed: int = Field(0, description="Count of requirements with Completed status")
    needs_review: int = Field(0, description="Count of requirements with Needs Review status")
    compliance_score: float = Field(0.0, description="Compliance completion percentage (completed / total * 100)")
    overdue: int = Field(0, description="Count of active requirements with deadline in the past")
    due_soon: int = Field(0, description="Count of active requirements with deadline within 7 days")
    upcoming: int = Field(0, description="Count of requirements with deadline > 7 days away")
    no_deadline: int = Field(0, description="Count of requirements without specific deadline dates")

    model_config = ConfigDict(from_attributes=True)

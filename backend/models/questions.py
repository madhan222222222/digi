"""Interview question library."""

from datetime import datetime, timezone

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


DIFFICULTIES = ["easy", "medium", "hard"]
QUESTION_TYPES = ["conceptual", "coding", "mcq", "behavioral"]


class QuestionCreate(BaseModel):
    question: str = Field(min_length=1)
    category: str = Field(min_length=1)
    topic: str | None = None
    difficulty: str = "medium"
    question_type: str = "conceptual"
    answer: str | None = None
    explanation: str | None = None
    example: str | None = None  # example or code where relevant
    options: list[str] = []  # MCQ options (question_type=mcq)
    related_ids: list[str] = []
    tags: list[str] = []
    published: bool = True


class QuestionUpdate(BaseModel):
    question: str | None = None
    category: str | None = None
    topic: str | None = None
    difficulty: str | None = None
    question_type: str | None = None
    answer: str | None = None
    explanation: str | None = None
    example: str | None = None
    options: list[str] | None = None
    related_ids: list[str] | None = None
    tags: list[str] | None = None
    published: bool | None = None


class Question(BaseModel):
    id: str
    question: str
    category: str
    topic: str | None = None
    difficulty: str = "medium"
    question_type: str = "conceptual"
    answer: str | None = None
    explanation: str | None = None
    example: str | None = None
    options: list[str] = []
    related_ids: list[str] = []
    tags: list[str] = []
    published: bool = True
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

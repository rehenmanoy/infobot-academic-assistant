import logging
from functools import lru_cache
from typing import Annotated

import anthropic
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app import scheduler
from app.config import get_settings
from app.database import get_db
from app.models import STAFF_ROLES, Prompt, Role, Subject, Timetable, User
from app.rate_limit import RateLimiter
from app.schemas import ChatRequest, ChatResponse, PromptOut, PromptUpdate
from app.security import AdminUser, CurrentUser
from app.services import subjects_for

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Assistant"])

DbSession = Annotated[Session, Depends(get_db)]

ASSISTANT_PROMPT = "assistant"
DEFAULT_ASSISTANT_PROMPT = (
    "You are InfoBot, the academic assistant of an engineering college department. "
    "Help students and staff with questions about their timetable, subjects and studies. "
    "Answer concisely and use Markdown tables when showing schedules. "
    "Use the timetable data provided below when it is relevant; if a question needs information "
    "you do not have, say so instead of guessing."
)

# Models that accept the effort setting and server-side refusal fallbacks.
_MODERN_MODEL_PREFIXES = ("claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1")

_settings = get_settings()
chat_limiter = RateLimiter(_settings.chat_requests_per_minute, 60)


@lru_cache
def _client() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=get_settings().anthropic_api_key, timeout=60.0, max_retries=2)


def _describe_grid(grid: scheduler.Grid, subjects: dict[int, Subject]) -> str:
    lines = []
    for day, row in enumerate(grid):
        cells = []
        for period, cell in enumerate(row):
            subject = subjects.get(cell["subject_id"]) if cell else None
            if subject is not None:
                label = f"{subject.code} {subject.name}" + (" (lab)" if cell["kind"] == "lab" else "")
                cells.append(f"P{period + 1} {label}")
        lines.append(f"{scheduler.DAYS[day]}: " + ("; ".join(cells) if cells else "free"))
    return "\n".join(lines)


def _user_context(db: Session, user: User) -> str:
    periods = ", ".join(f"P{i + 1} {start}-{end}" for i, (start, end) in enumerate(scheduler.PERIODS))
    parts = [f"The user is {user.full_name}, role: {user.role.value}.", f"Periods: {periods}."]

    if user.role == Role.STUDENT and user.semester:
        subjects = {s.id: s for s in subjects_for(db, user.semester)}
        listing = "; ".join(
            f"{s.code} {s.name} (teacher: {s.teacher.full_name if s.teacher else 'unassigned'})"
            for s in subjects.values()
        )
        parts.append(f"They are in semester {user.semester}. Subjects: {listing or 'none yet'}.")
        timetable = db.scalar(select(Timetable).where(Timetable.semester == user.semester))
        if timetable:
            parts.append("Their class timetable:\n" + _describe_grid(timetable.grid, subjects))
    elif user.role in STAFF_ROLES:
        subjects = {s.id: s for s in db.scalars(select(Subject).where(Subject.teacher_id == user.id))}
        parts.append(
            "They teach: "
            + ("; ".join(f"{s.code} {s.name} (semester {s.semester})" for s in subjects.values()) or "nothing yet")
            + "."
        )
        for timetable in db.scalars(select(Timetable).order_by(Timetable.semester)):
            own = {sid: s for sid, s in subjects.items() if s.semester == timetable.semester}
            if own:
                parts.append(f"Their classes in semester {timetable.semester}:\n" + _describe_grid(timetable.grid, own))
    return "\n\n".join(parts)


def _assistant_prompt(db: Session) -> str:
    stored = db.scalar(select(Prompt).where(Prompt.name == ASSISTANT_PROMPT))
    return stored.text if stored else DEFAULT_ASSISTANT_PROMPT


def _system_prompt(db: Session, user: User) -> str:
    return f"{_assistant_prompt(db)}\n\n<context>\n{_user_context(db, user)}\n</context>"


@router.post("/chat", response_model=ChatResponse)
async def chat(data: ChatRequest, user: CurrentUser, db: DbSession) -> ChatResponse:
    settings = get_settings()
    if not settings.ai_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="The AI assistant is not configured on this server"
        )

    key = f"user:{user.id}"
    if chat_limiter.is_limited(key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="You are sending messages too quickly"
        )
    chat_limiter.hit(key)

    system = await run_in_threadpool(_system_prompt, db, user)
    request: dict = {
        "model": settings.anthropic_model,
        "max_tokens": settings.chat_max_tokens,
        "system": system,
        "messages": [m.model_dump() for m in data.messages],
    }
    if settings.anthropic_model.startswith(_MODERN_MODEL_PREFIXES):
        request |= {
            "output_config": {"effort": "low"},
            "betas": ["server-side-fallback-2026-07-01"],
            "fallbacks": "default",
        }

    try:
        response = await _client().beta.messages.create(**request)
    except anthropic.RateLimitError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="The assistant is busy, please try again shortly"
        ) from None
    except anthropic.APIConnectionError:
        logger.exception("Could not reach the Anthropic API")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not reach the AI service") from None
    except anthropic.APIStatusError as exc:
        logger.error("Anthropic API error %s: %s", exc.status_code, exc.message)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="The AI service returned an error"
        ) from None

    if response.stop_reason == "refusal":
        return ChatResponse(reply="Sorry, I can't help with that request.")
    reply = "".join(block.text for block in response.content if block.type == "text").strip()
    return ChatResponse(reply=reply or "Sorry, I don't have an answer for that.")


@router.get("/prompts", response_model=list[PromptOut], tags=["Settings"])
def list_prompts(_admin: AdminUser, db: DbSession) -> list[PromptOut]:
    stored = db.scalar(select(Prompt).where(Prompt.name == ASSISTANT_PROMPT))
    if stored is None:
        stored = Prompt(name=ASSISTANT_PROMPT, text=DEFAULT_ASSISTANT_PROMPT)
        db.add(stored)
        db.commit()
        db.refresh(stored)
    return [PromptOut.model_validate(stored)]


@router.put("/prompts/{name}", response_model=PromptOut, tags=["Settings"])
def update_prompt(name: str, data: PromptUpdate, _admin: AdminUser, db: DbSession) -> PromptOut:
    if name != ASSISTANT_PROMPT:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown prompt")
    stored = db.scalar(select(Prompt).where(Prompt.name == name))
    if stored is None:
        stored = Prompt(name=name, text=data.text)
        db.add(stored)
    else:
        stored.text = data.text
    db.commit()
    db.refresh(stored)
    return PromptOut.model_validate(stored)

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.routers import auth, chat, subjects, timetables, users
from app.seed import ensure_admin

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    Base.metadata.create_all(engine)
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    if settings.admin_username and settings.admin_password:
        with SessionLocal() as db:
            ensure_admin(db, settings.admin_username, settings.admin_password)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="InfoBot Academic Assistant API",
        version="2.0.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        # Auth uses a bearer header, not cookies, so credentials are not needed cross-origin.
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        if request.url.path.startswith("/api/") and not request.url.path.startswith("/api/docs"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response

    for router in (auth.router, users.router, subjects.router, timetables.router, chat.router):
        app.include_router(router, prefix="/api")

    @app.get("/api/health", tags=["Health"])
    def health() -> dict:
        return {"status": "ok", "ai_enabled": settings.ai_enabled}

    return app


app = create_app()

import logging
import secrets
from contextlib import asynccontextmanager
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from prometheus_client import make_asgi_app
from pydantic import BaseModel, Field

from liveservice.config import Settings, load_settings
from liveservice.replay import FastF1Replay
from liveservice.repository import LiveRepository
from liveservice.worker import LiveWorker

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
settings = load_settings()
worker = LiveWorker(settings)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.worker_enabled:
        worker.start()
    yield
    worker.stop()


app = FastAPI(title="Pitstop Live Intelligence", version="1.0.0", lifespan=lifespan)
app.mount("/metrics", make_asgi_app())


class ReplayRequest(BaseModel):
    year: int = Field(ge=2018, le=2100)
    event: str | int
    session: str = "R"


def require_internal_token(x_pitstop_internal_token: str | None = Header(default=None)) -> None:
    if not x_pitstop_internal_token or not secrets.compare_digest(x_pitstop_internal_token, settings.internal_token):
        raise HTTPException(status_code=403, detail="Internal service token required")


@app.get("/v1/health")
def health():
    return {"status": "UP", "service": "pitstop-live-service", **worker.health()}


@app.post("/v1/replay", dependencies=[Depends(require_internal_token)], status_code=202)
def replay(request: ReplayRequest, background: BackgroundTasks):
    background.add_task(run_replay, request)
    return {"status": "ACCEPTED", "year": request.year, "event": request.event, "session": request.session}


def run_replay(request: ReplayRequest) -> None:
    replay_source = FastF1Replay(settings.fastf1_cache)
    session, datasets = replay_source.load(request.year, request.event, request.session)
    repository = LiveRepository(settings.database_dsn)
    session_id = repository.upsert_session(session, provider="FASTF1")
    for endpoint, rows in datasets.items():
        repository.store(endpoint, session_id, rows)

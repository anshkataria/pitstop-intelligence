import logging
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from prometheus_client import make_asgi_app
from pydantic import BaseModel, Field

from liveservice.config import Settings, load_settings
from liveservice.intelligence import compute_models
from liveservice.replay import FastF1Replay
from liveservice.repository import LiveRepository
from liveservice.worker import LiveWorker, publish_live_event

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)
settings = load_settings()
worker = LiveWorker(settings)
# Single-slot status for the most recent FastF1 replay import, so a caller that
# kicked one off from the website can find out whether it actually succeeded
# instead of the result silently disappearing into a background task.
replay_status: dict[str, Any] = {"state": "IDLE"}


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
    if replay_status.get("state") == "RUNNING":
        raise HTTPException(status_code=409, detail="A replay import is already running")
    replay_status.clear()
    replay_status.update({
        "state": "RUNNING", "year": request.year, "event": request.event, "session": request.session,
        "startedAt": datetime.now(timezone.utc).isoformat(), "finishedAt": None, "error": None, "sessionKey": None,
    })
    background.add_task(run_replay, request)
    return {"status": "ACCEPTED", "year": request.year, "event": request.event, "session": request.session}


@app.get("/v1/replay/status")
def replay_status_endpoint():
    return replay_status


def run_replay(request: ReplayRequest) -> None:
    try:
        replay_source = FastF1Replay(settings.fastf1_cache)
        session, datasets = replay_source.load(request.year, request.event, request.session)
        repository = LiveRepository(settings.database_dsn)
        session_id = repository.upsert_session(session, provider="FASTF1")
        for endpoint, rows in datasets.items():
            repository.store(endpoint, session_id, rows)
        outputs = compute_models(repository.model_features(session_id))
        repository.save_models(session_id, outputs)
        publish_live_event(worker.redis, session["provider_session_key"], "intelligence",
                            [output.__dict__ for output in outputs])
        replay_status.update({
            "state": "SUCCEEDED", "finishedAt": datetime.now(timezone.utc).isoformat(),
            "sessionKey": session["provider_session_key"],
        })
    except Exception as exc:
        logger.exception("FastF1 replay import failed")
        replay_status.update({
            "state": "FAILED", "finishedAt": datetime.now(timezone.utc).isoformat(),
            "error": f"{type(exc).__name__}: {exc}",
        })
